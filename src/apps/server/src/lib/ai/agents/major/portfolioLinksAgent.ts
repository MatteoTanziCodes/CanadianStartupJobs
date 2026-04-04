import { AppError, ERROR_CODES } from "@/lib/errors";
import { generateObject } from "ai";
import { claudeFast } from "@/lib/ai/models";
import { utils } from "@/lib/firecrawl";
import { z } from "zod";
import type { AgentHelpers, AgentResult } from "../helpers/types";
import type { QueuedItem } from "@/lib/db/functions/queues";

const FRESHNESS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const portfolioLinksAgentPayloadSchema = z.object({
  sourceId: z.number(),
  links: z.array(z.url()),
});

type PortfolioLinksAgentPayloadArgs = z.infer<typeof portfolioLinksAgentPayloadSchema>;

const filterLinkEvaluationSchema = z.object({
  url: z.string(),
  shouldQueue: z.boolean(),
  reason: z.string().describe("Brief explanation of why this link should or should not be queued for organization discovery"),
  isCanadianHeadquartered: z.boolean(),
  companyActive: z.boolean(),
});

const filterLinks = async (links: string[], usage: unknown[]) => {
  const linksText = links.map((l, i) => `${i + 1}. ${l}`).join("\n");

  const objectData = await generateObject({
    model: claudeFast(),
    schema: z.object({
      evaluations: z.array(filterLinkEvaluationSchema),
    }),
    prompt: `You are filtering portfolio links for Canadian startup discovery.

Portfolio links:
${linksText}

For each link, evaluate:
1. Is this link likely for a company headquartered in Canada?
2. Does this company appear to be active (not acquired, not shut down)?

Rules:
- Only mark shouldQueue=true if BOTH isCanadianHeadquartered=true AND companyActive=true
- For URLs that redirect or are clearly not company sites (news articles, product pages), mark as not queueable
- If the domain suggests a different country (e.g., .uk, .fr, .de), assume not Canadian unless you have specific knowledge
- If you're unsure about Canadian status, lean conservative (shouldQueue=false)

Return evaluations for all links.`,
  });

  if (!objectData.object) throw new AppError(ERROR_CODES.AI_OBJECT_CREATION_FAILED, "Failed to evaluate portfolio links");
  if (objectData.usage) usage.push(objectData.usage);

  return objectData.object.evaluations;
};

const preFetchCompanyData = async (url: string) => {
  try {
    const { markdown, links } = await utils.getMdAndLinks(url);
    return {
      url,
      markdown: markdown || "",
      links: links || [],
      pulledAt: Date.now(),
      freshTil: Date.now() + FRESHNESS_TTL_MS,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      url,
      markdown: "",
      links: [],
      pulledAt: Date.now(),
      freshTil: Date.now(),
      preFetchError: errorMessage,
    };
  }
};

const portfolioLinksAgent = async (
  queuedItem: QueuedItem,
  helpers: AgentHelpers,
): Promise<AgentResult> => {
  const { payload } = queuedItem as unknown as { payload: PortfolioLinksAgentPayloadArgs };

  const logs: string[] = [
    "portfolioLinksAgent: started",
    `queueItemId: ${queuedItem.id}`,
    `parentCallId: ${helpers.parentCallId}`,
    `sourceId: ${payload.sourceId}`,
    `linksCount: ${payload.links.length}`,
  ];

  const usage: unknown[] = [];
  const childQueueItems: Array<{
    payload: unknown;
    agent: string;
    maxRetries?: number;
  }> = [];

  try {
    logs.push("Evaluating portfolio links...");
    const evaluations = await filterLinks(payload.links, usage);
    logs.push(`Evaluated ${evaluations.length} links`);

    const qualifyingLinks = evaluations.filter(e => e.shouldQueue);
    const filteredOut = evaluations.filter(e => !e.shouldQueue);

    logs.push(`Found ${qualifyingLinks.length} qualifying Canadian companies`);
    logs.push(`Filtered out ${filteredOut.length} non-qualifying links`);

    logs.push("Pre-fetching data for qualifying links...");
    const preFetchedData = await Promise.all(
      qualifyingLinks.map(e => preFetchCompanyData(e.url))
    );
    logs.push(`Pre-fetched data for ${preFetchedData.length} companies`);

    for (const data of preFetchedData) {
      if (data.preFetchError) {
        logs.push(`Pre-fetch failed for ${data.url}: ${data.preFetchError}`);
        continue;
      }

      childQueueItems.push({
        payload: {
          url: data.url,
          preFetchedData: data,
        },
        agent: "organizationAgent",
        maxRetries: 3,
      });
      logs.push(`Queued organizationAgent for ${data.url}`);
    }

    const result = {
      sourceId: payload.sourceId,
      totalLinks: payload.links.length,
      qualifyingCount: qualifyingLinks.length,
      filteredOutCount: filteredOut.length,
      qualifyingLinks: qualifyingLinks.map(e => ({ url: e.url, reason: e.reason })),
      filteredOut: filteredOut.map(e => ({ url: e.url, reason: e.reason })),
      preFetchedData: preFetchedData.map(d => ({
        url: d.url,
        pulledAt: d.pulledAt,
        freshTil: d.freshTil,
        hasError: !!d.preFetchError,
      })),
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

export { portfolioLinksAgent, portfolioLinksAgentPayloadSchema, type PortfolioLinksAgentPayloadArgs };
