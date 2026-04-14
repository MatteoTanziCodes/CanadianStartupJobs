import { AppError, ERROR_CODES } from "@/lib/errors";
import { generateObject } from "ai";
import { db, schemas, sources, portfolioCaches, sourcesPortfolioCaches } from "@/lib/db/runtime";
import { claudeFast } from "@/lib/ai/models";
import { prompts } from '@/lib/ai/prompts';
import { normalizeSourceUrl } from "@/lib/quality/urls";
import { fetchCachedPage } from "@/lib/cache/pages";
import { eq, or } from "drizzle-orm";
import z from "zod";
import type { AgentHelpers, AgentResult } from "../helpers/types";
import type { QueuedItem } from "@/lib/db/functions/queues";

const getDoc = async (page: string) => {
  const kind = page.toLowerCase().includes("/portfolio") || page.toLowerCase().includes("/companies")
    ? "source_portfolio"
    : "source_home";
  const doc = await fetchCachedPage({
    url: page,
    kind,
    ttlMs: 7 * 24 * 60 * 60 * 1000,
  });
  if (!doc.markdown) throw new AppError(ERROR_CODES.FC_MARKDOWN_FAILED, "Failed to get markdown in sourceAgent", { page });
  return { markdown: doc.markdown, links: doc.links, contentHash: doc.contentHash };
};

const sourceAgentPayloadSchema = z.object({
  home: z.url(),
  portfolio: z.url(),
  kind: z.string().optional(),
});

type SourceAgentPayloadArgs = z.infer<typeof sourceAgentPayloadSchema>;

const rewriteKnownSourceUrl = (url: string, kind: "home" | "portfolio") => {
  try {
    const normalized = new URL(url);
    const hostname = normalized.hostname.replace(/^www\./, "").toLowerCase();

    if (hostname === "versiononeventures.com") {
      normalized.hostname = "versionone.vc";
      return normalized.toString();
    }

    if (hostname === "panache.io") {
      return kind === "portfolio"
        ? "https://www.panache.vc/portfolio"
        : "https://www.panache.vc";
    }

    if (hostname === "directory.nextcanada.com" && kind === "home") {
      return "https://www.nextcanada.com";
    }

    return normalized.toString();
  } catch {
    return url;
  }
};

const createNewSourceFromMarkdown = async (
  markdown: string,
  url: string,
  portfolio: string,
  kind: string | undefined,
  usage: unknown[],
) => {
  const normalizedWebsite = normalizeSourceUrl(url) || url;
  const normalizedPortfolio = normalizeSourceUrl(portfolio) || portfolio;
  const objectData = await generateObject({
    model: claudeFast(),
    schema: schemas.sources.insert.omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      kind: true,
    }),
    prompt: prompts.getNewSource(markdown, url, portfolio, kind),
  });
  if (!objectData.object) throw new AppError(ERROR_CODES.AI_OBJECT_CREATION_FAILED, "Failed to extract source object", { ...objectData });
  if (objectData.usage) usage.push(objectData.usage);

  const sourceValues = {
    ...objectData.object,
    website: normalizedWebsite,
    portfolio: normalizedPortfolio,
    kind: kind ?? "vc_portfolio",
  };

  const existingSource = await db
    .select()
    .from(sources)
    .where(or(eq(sources.website, normalizedWebsite), eq(sources.portfolio, normalizedPortfolio)))
    .limit(1);

  if (existingSource[0]) {
    const updatedSource = await db
      .update(sources)
      .set(sourceValues)
      .where(eq(sources.id, existingSource[0].id))
      .returning();

    if (!updatedSource[0]) throw new AppError(ERROR_CODES.DB_INSERT_FAILED, "Failed to update source in db");
    return updatedSource[0];
  }

  const newSource = await db.insert(sources).values(sourceValues).returning();
  if (!newSource[0]) throw new AppError(ERROR_CODES.DB_INSERT_FAILED, "Failed to insert source to db");
  return newSource[0];
};

const createNewPortfolioCache = async (url: string, hash?: string | null) => {
  const now = Date.now();
  const args = schemas.portfolioCaches.insert.safeParse({
    url,
    freshTil: now + (7 * 24 * 60 * 60 * 1000),
    lastHash: hash ?? null,
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
  const newPivot = await db
    .insert(sourcesPortfolioCaches)
    .values(args.data)
    .onConflictDoNothing()
    .returning();
  return newPivot[0] ?? null;
};

const getPortfolioCandidates = (home: string, portfolio: string) => {
  const candidates = new Set<string>();
  const normalizedHome = normalizeSourceUrl(rewriteKnownSourceUrl(home, "home"));
  const normalizedPortfolio = normalizeSourceUrl(rewriteKnownSourceUrl(portfolio, "portfolio"));

  if (normalizedPortfolio) {
    candidates.add(normalizedPortfolio);
  }

  try {
    const origin = new URL(normalizedHome || rewriteKnownSourceUrl(home, "home")).origin;
    for (const path of ["/portfolio", "/portfolio/", "/companies", "/companies/"]) {
      candidates.add(`${origin}${path}`);
    }
  } catch {
    // Ignore malformed home URL here; schema validation already handles input.
  }

  return [...candidates];
};

const getPortfolioDocWithFallback = async (home: string, portfolio: string) => {
  const candidates = getPortfolioCandidates(home, portfolio);
  let lastError: unknown = null;

  for (const candidateUrl of candidates) {
    try {
      const doc = await getDoc(candidateUrl);
      return { url: candidateUrl, doc };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new AppError(ERROR_CODES.FC_MARKDOWN_FAILED, "Failed to fetch any portfolio candidate URL", {
        home,
        portfolio,
      });
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
    const resolvedHome = rewriteKnownSourceUrl(payload.home, "home");
    const resolvedPortfolio = rewriteKnownSourceUrl(payload.portfolio, "portfolio");

    logs.push("Fetching home page...");
    const homeDoc = await getDoc(resolvedHome);
    logs.push(`Fetched home page: ${homeDoc.markdown.length} chars, ${homeDoc.links.length} links`);

    logs.push("Creating source from home page markdown...");
    const newSource = await createNewSourceFromMarkdown(
      homeDoc.markdown,
      resolvedHome,
      resolvedPortfolio,
      payload.kind,
      usage,
    );
    logs.push(`Created source: ${newSource.id} - ${newSource.name}`);

    let portfolioDoc: Awaited<ReturnType<typeof getDoc>> | null = null;
    let portfolioCache: Awaited<ReturnType<typeof createNewPortfolioCache>> | null = null;

    try {
      logs.push("Fetching portfolio page...");
      const discoveredPortfolio = await getPortfolioDocWithFallback(resolvedHome, resolvedPortfolio);
      portfolioDoc = discoveredPortfolio.doc;
      logs.push(`Fetched portfolio from ${discoveredPortfolio.url}: ${portfolioDoc.markdown.length} chars, ${portfolioDoc.links.length} links`);

      const normalizedPortfolioUrl = normalizeSourceUrl(discoveredPortfolio.url);
      if (normalizedPortfolioUrl && normalizedPortfolioUrl !== newSource.portfolio) {
        await db
          .update(sources)
          .set({ portfolio: normalizedPortfolioUrl })
          .where(eq(sources.id, newSource.id));
        logs.push(`Updated source ${newSource.id} portfolio to ${normalizedPortfolioUrl}`);
      }

      logs.push("Creating portfolio cache...");
      portfolioCache = await createNewPortfolioCache(discoveredPortfolio.url, portfolioDoc.contentHash);
      logs.push(`Created portfolio cache: ${portfolioCache.id}`);

      logs.push("Connecting source to portfolio cache...");
      await connectSourceToPortfolioCache(newSource.id, portfolioCache.id);
      logs.push(`Connected source ${newSource.id} to portfolio cache ${portfolioCache.id}`);
    } catch (portfolioError) {
      logs.push(
        `Portfolio fetch/discovery bootstrap failed for ${payload.portfolio}: ${portfolioError instanceof Error ? portfolioError.message : String(portfolioError)}`,
      );
    }

    logs.push("Queueing portfolio links exploration...");
    childQueueItems.push({
      payload: {
        sourceId: newSource.id,
        sourceWebsite: newSource.website,
        sourceKind: payload.kind ?? "vc_portfolio",
        seedUrls: [resolvedPortfolio, resolvedHome],
        links: [...new Set([...(portfolioDoc?.links ?? []), ...homeDoc.links])],
      },
      agent: "portfolioLinksAgent",
      maxRetries: 3,
    });
    logs.push(`Queued portfolioLinksAgent for source ${newSource.id} with ${(portfolioDoc?.links ?? []).length} portfolio links and ${homeDoc.links.length} home links`);

    const result = {
      source: { id: newSource.id, name: newSource.name, website: newSource.website },
      portfolioCache: portfolioCache ? { id: portfolioCache.id, url: portfolioCache.url } : null,
      home: { markdown: homeDoc.markdown, links: homeDoc.links },
      portfolio: portfolioDoc ? { markdown: portfolioDoc.markdown, links: portfolioDoc.links } : null,
    };

    if (helpers.parentCallId) {
      try {
        await helpers.updateCall({
          id: helpers.parentCallId,
          usage,
          logs,
          result,
          errors: [],
        });
      } catch (updateErr) {
        logs.push(`Call update failed: ${updateErr instanceof Error ? updateErr.message : String(updateErr)}`);
      }
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
      try {
        await helpers.updateCall({
          id: helpers.parentCallId,
          usage,
          logs,
          result: null,
          errors: [{ message: errorMessage, stack: errorStack }],
        });
      } catch (updateErr) {
        logs.push(`Call update failed: ${updateErr instanceof Error ? updateErr.message : String(updateErr)}`);
      }
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
