import { AppError, ERROR_CODES } from "@/lib/errors";
import { generateObject } from "ai";
import { db, schemas, sources, portfolioCaches, sourcesPortfolioCaches } from "@/lib/db/runtime";
import { claudeFast } from "@/lib/ai/models";
import { prompts } from '@/lib/ai/prompts';
import { firecrawl } from "@/lib/firecrawl";
import { sha256Hex } from "@/lib/hash";
import z from "zod";
import type { AgentHelpers, AgentResult } from "../helpers/types";
import type { QueuedItem } from "@/lib/db/functions/queues";

const getDoc = async (page: string) => {
  const { markdown, links } = await firecrawl.scrape(page, { formats: ["markdown", "links"] });
  if (!markdown) throw new AppError(ERROR_CODES.FC_MARKDOWN_FAILED, "Failed to get markdown in sourceAgent", { page });
  if (!links) throw new AppError(ERROR_CODES.FC_LINKS_FAILED, "Failed to get links in sourceAgent", { page });
  return { markdown, links };
};

const sourceAgentPayloadSchema = z.object({
  home: z.url(),
  portfolio: z.url(),
});

type SourceAgentPayloadArgs = z.infer<typeof sourceAgentPayloadSchema>;

const createNewSourceFromMarkdown = async (markdown: string, url: string, portfolio: string, usage: unknown[]) => {
  const objectData = await generateObject({
    model: claudeFast(),
    schema: schemas.sources.insert.omit({
      id: true,
      createdAt: true,
      updatedAt: true,
    }),
    prompt: prompts.getNewSource(markdown, url, portfolio),
  });
  if (!objectData.object) throw new AppError(ERROR_CODES.AI_OBJECT_CREATION_FAILED, "Failed to extract source object", { ...objectData });
  if (objectData.usage) usage.push(objectData.usage);
  const newSource = await db.insert(sources).values({
    ...objectData.object,
    website: url,
    portfolio,
  }).returning();
  if (!newSource[0]) throw new AppError(ERROR_CODES.DB_INSERT_FAILED, "Failed to insert source to db");
  return newSource[0];
};

const createNewPortfolioCache = async (url: string) => {
  const htmlPayload = await fetch(url);
  const hash = await sha256Hex(await htmlPayload.arrayBuffer());
  const now = Date.now();
  const args = schemas.portfolioCaches.insert.safeParse({
    url,
    freshTil: now + (7 * 24 * 60 * 60 * 1000),
    lastHash: hash,
  });
  if (args.error) throw new AppError(ERROR_CODES.SCHEMA_PARSE_FAILED, "Failed to parse portfolio cache arguments", { ...args.error });
  const newPortfolio = await db.insert(portfolioCaches).values(args.data).returning();
  if (!newPortfolio[0]) throw new AppError(ERROR_CODES.DB_INSERT_FAILED, "Failed to create portfolio cache");
  return newPortfolio[0];
};

const connectSourceToPortfolioCache = async (sourceId: number, cacheId: number) => {
  const args = schemas.sourcesPortfolioCaches.insert.safeParse({
    sourceId,
    portfolioCacheId: cacheId,
  });
  if (args.error) throw new AppError(ERROR_CODES.SCHEMA_PARSE_FAILED, "Failed to parse source <> portfolio cache connection arguments.", { ...args.error });
  const newPivot = await db.insert(sourcesPortfolioCaches).values(args.data).returning();
  if (!newPivot[0]) throw new AppError(ERROR_CODES.DB_INSERT_FAILED, "Failed to create source <> portfolio cache entry");
  return newPivot[0];
};

const sourceAgent = async (
  queuedItem: QueuedItem,
  helpers: AgentHelpers,
): Promise<AgentResult> => {
  const { payload } = queuedItem as unknown as { payload: SourceAgentPayloadArgs };

  const logs: string[] = [
    "sourceAgent: started",
    `queueItemId: ${queuedItem.id}`,
    `parentCallId: ${helpers.parentCallId}`,
    `home: ${payload.home}`,
    `portfolio: ${payload.portfolio}`,
  ];

  const usage: unknown[] = [];
  const childQueueItems: Array<{
    payload: unknown;
    agent: string;
    maxRetries?: number;
  }> = [];

  try {
    logs.push("Fetching home page...");
    const homeDoc = await getDoc(payload.home);
    logs.push(`Fetched home page: ${homeDoc.markdown.length} chars, ${homeDoc.links.length} links`);

    logs.push("Fetching portfolio page...");
    const portfolioDoc = await getDoc(payload.portfolio);
    logs.push(`Fetched portfolio: ${portfolioDoc.markdown.length} chars, ${portfolioDoc.links.length} links`);

    logs.push("Creating source from home page markdown...");
    const newSource = await createNewSourceFromMarkdown(homeDoc.markdown, payload.home, payload.portfolio, usage);
    logs.push(`Created source: ${newSource.id} - ${newSource.name}`);

    logs.push("Creating portfolio cache...");
    const portfolioCache = await createNewPortfolioCache(payload.portfolio);
    logs.push(`Created portfolio cache: ${portfolioCache.id}`);

    logs.push("Connecting source to portfolio cache...");
    await connectSourceToPortfolioCache(newSource.id, portfolioCache.id);
    logs.push(`Connected source ${newSource.id} to portfolio cache ${portfolioCache.id}`);

    logs.push("Queueing portfolio links exploration...");
    childQueueItems.push({
      payload: {
        sourceId: newSource.id,
        links: portfolioDoc.links,
      },
      agent: "portfolioLinksAgent",
      maxRetries: 3,
    });
    logs.push(`Queued portfolioLinksAgent for source ${newSource.id} with ${portfolioDoc.links.length} links`);

    const result = {
      source: { id: newSource.id, name: newSource.name, website: newSource.website },
      portfolioCache: { id: portfolioCache.id, url: portfolioCache.url },
      home: { markdown: homeDoc.markdown, links: homeDoc.links },
      portfolio: { markdown: portfolioDoc.markdown, links: portfolioDoc.links },
    };

    if (helpers.parentCallId) {
      await helpers.updateCall({
        id: helpers.parentCallId,
        usage,
        logs,
        result,
        errors: [],
      });
    }

    return {
      usage,
      logs,
      result,
      errors: [],
      childQueueItems,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    logs.push(`Error: ${errorMessage}`);

    if (helpers.parentCallId) {
      await helpers.updateCall({
        id: helpers.parentCallId,
        usage,
        logs,
        result: null,
        errors: [{ message: errorMessage, stack: errorStack }],
      });
    }

    return {
      usage,
      logs,
      result: null,
      errors: [{ message: errorMessage, stack: errorStack }],
    };
  }
};

export { sourceAgent, sourceAgentPayloadSchema, type SourceAgentPayloadArgs };
