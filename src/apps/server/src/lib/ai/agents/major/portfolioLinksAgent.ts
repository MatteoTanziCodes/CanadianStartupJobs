import { AppError, ERROR_CODES } from "@/lib/errors";
import { generateObject } from "ai";
import { claudeFast } from "@/lib/ai/models";
import { fetchCachedPage } from "@/lib/cache/pages";
import { hasLowSignalContent, isBlockedOrganizationUrl, isSameHost } from "@/lib/quality/content";
import { z } from "zod";
import type { AgentHelpers, AgentResult } from "../helpers/types";
import type { QueuedItem } from "@/lib/db/functions/queues";

const FRESHNESS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const portfolioLinksAgentPayloadSchema = z.object({
  sourceId: z.number(),
  sourceWebsite: z.url().optional(),
  sourceKind: z.string().optional(),
  seedUrls: z.array(z.url()).optional(),
  links: z.array(z.url()),
});

type PortfolioLinksAgentPayloadArgs = z.infer<typeof portfolioLinksAgentPayloadSchema>;

const filterLinkEvaluationSchema = z.object({
  url: z.string(),
  shouldQueue: z.boolean(),
  reason: z.string().describe("Brief explanation of why this link should or should not be queued for organization discovery"),
  hasCanadianSignals: z.boolean(),
  companyActive: z.boolean(),
  confidence: z.number().min(0).max(100),
});

const PORTFOLIO_DETAIL_PATTERNS = [
  "/portfolio/",
  "/companies/",
  "/company/",
  "/startups/",
  "/venture/",
  "/ventures/",
];

const SAME_HOST_IGNORE_PATTERNS = [
  "/about",
  "/team",
  "/contact",
  "/blog",
  "/news",
  "/events",
  "/careers",
  "/jobs",
  "/privacy",
  "/terms",
];

const INTERNAL_DETAIL_FETCH_LIMIT = 12;

const filterLinks = async (links: string[], usage: unknown[], sourceKind?: string) => {
  const linksText = links.map((l, i) => `${i + 1}. ${l}`).join("\n");

  const objectData = await generateObject({
    model: claudeFast(),
    schema: z.object({
      evaluations: z.array(filterLinkEvaluationSchema),
    }),
    prompt: `You are filtering ecosystem company links for Canadian startup discovery.

Source kind: ${sourceKind ?? "vc_portfolio"}

Portfolio links:
${linksText}

For each link, evaluate:
1. Does this link appear to be for an active company?
2. Does the company have plausible Canadian signals?

Rules:
- This is a high-recall filter. Downstream qualification will do the strict Canadian-owned-and-operated decision.
- Mark hasCanadianSignals=true when the company appears plausibly Canadian-founded, Canadian-headquartered, materially Canadian-operated, or strongly tied to the Canadian startup ecosystem.
- Only mark shouldQueue=false for nationality reasons when the company is clearly non-Canadian.
- For accelerator or curated directories focused on Canadian startups, prefer queueing plausible Canadian companies even if evidence is incomplete.
- Only mark shouldQueue=true if companyActive=true AND hasCanadianSignals=true
- For URLs that redirect or are clearly not company sites (news articles, product pages), mark as not queueable
- If the domain suggests a different country (e.g., .uk, .fr, .de), assume not Canadian unless you have specific knowledge
- If you're unsure but the company is still plausible and active, lean toward shouldQueue=true with lower confidence

Return evaluations for all links.`,
  });

  if (!objectData.object) throw new AppError(ERROR_CODES.AI_OBJECT_CREATION_FAILED, "Failed to evaluate portfolio links");
  if (objectData.usage) usage.push(objectData.usage);

  return objectData.object.evaluations;
};

const getLinksFromSeedUrls = async (seedUrls: string[]) => {
  const aggregatedLinks = new Set<string>();

  for (const seedUrl of seedUrls) {
    try {
      const doc = await fetchCachedPage({
        url: seedUrl,
        kind: "portfolio_seed",
        ttlMs: FRESHNESS_TTL_MS,
      });
      for (const link of doc.links ?? []) {
        aggregatedLinks.add(link);
      }
    } catch {
      continue;
    }
  }

  return [...aggregatedLinks];
};

const isLikelyInternalPortfolioDetailLink = (candidateUrl: string, sourceWebsite?: string) => {
  if (!isSameHost(candidateUrl, sourceWebsite)) {
    return false;
  }

  try {
    const pathname = new URL(candidateUrl).pathname.toLowerCase().replace(/\/+$/, "");
    if (!pathname || pathname === "/") {
      return false;
    }

    if (SAME_HOST_IGNORE_PATTERNS.some((pattern) => pathname === pattern || pathname.startsWith(`${pattern}/`))) {
      return false;
    }

    return PORTFOLIO_DETAIL_PATTERNS.some((pattern) => pathname.includes(pattern));
  } catch {
    return false;
  }
};

const getExternalLinksFromInternalDetailPage = async (url: string, sourceWebsite?: string) => {
  try {
    const doc = await fetchCachedPage({
      url,
      kind: "portfolio_detail",
      ttlMs: FRESHNESS_TTL_MS,
    });
    return [...new Set(doc.links)].filter((link) =>
      !isBlockedOrganizationUrl(link) && !isSameHost(link, sourceWebsite),
    );
  } catch {
    return [];
  }
};

const preFetchCompanyData = async (url: string) => {
  try {
    const doc = await fetchCachedPage({
      url,
      kind: "organization_home",
      ttlMs: FRESHNESS_TTL_MS,
    });
    return {
      url,
      markdown: doc.markdown,
      links: doc.links,
      pulledAt: doc.pulledAt,
      freshTil: doc.freshTil,
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
    `sourceWebsite: ${payload.sourceWebsite ?? "n/a"}`,
    `sourceKind: ${payload.sourceKind ?? "unknown"}`,
    `linksCount: ${payload.links.length}`,
  ];

  const usage: unknown[] = [];
  const childQueueItems: Array<{
    payload: unknown;
    agent: string;
    maxRetries?: number;
  }> = [];

  try {
    const seedLinks = payload.seedUrls?.length ? await getLinksFromSeedUrls(payload.seedUrls) : [];
    if (seedLinks.length > 0) {
      logs.push(`Fetched ${seedLinks.length} links from seed URLs`);
    }

    const uniqueLinks = [...new Set([...payload.links, ...seedLinks])];
    const directCandidates = uniqueLinks.filter((link) => {
      if (isBlockedOrganizationUrl(link)) {
        logs.push(`Filtered blocked organization host: ${link}`);
        return false;
      }

      if (isLikelyInternalPortfolioDetailLink(link, payload.sourceWebsite)) {
        return false;
      }

      if (isSameHost(link, payload.sourceWebsite)) {
        logs.push(`Filtered same-host non-detail portfolio link: ${link}`);
        return false;
      }

      return true;
    });
    const internalDetailCandidates = uniqueLinks
      .filter((link) => isLikelyInternalPortfolioDetailLink(link, payload.sourceWebsite))
      .slice(0, INTERNAL_DETAIL_FETCH_LIMIT);

    logs.push(`Direct portfolio candidates: ${directCandidates.length}/${payload.links.length}`);
    logs.push(`Internal portfolio detail candidates: ${internalDetailCandidates.length}/${payload.links.length}`);

    const internalDetailLinks = await Promise.all(
      internalDetailCandidates.map(async (detailUrl) => {
        const extractedLinks = await getExternalLinksFromInternalDetailPage(detailUrl, payload.sourceWebsite);
        logs.push(`Expanded internal portfolio detail: ${detailUrl} -> ${extractedLinks.length} external links`);
        return extractedLinks;
      }),
    );

    const deterministicCandidates = [...new Set([
      ...directCandidates,
      ...internalDetailLinks.flat(),
    ])];

    logs.push(`Deterministic portfolio candidates: ${deterministicCandidates.length}/${payload.links.length}`);
    logs.push("Evaluating portfolio links...");
    const evaluations = await filterLinks(deterministicCandidates, usage, payload.sourceKind);
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

      if (hasLowSignalContent(data.markdown)) {
        logs.push(`Skipped low-signal organization page: ${data.url}`);
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
