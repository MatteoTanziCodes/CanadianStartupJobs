import { AppError, ERROR_CODES } from "@/lib/errors";
import { generateObject } from "ai";
import { claudeFast } from "@/lib/ai/models";
import { utils } from "@/lib/firecrawl";
import { z } from "zod";
import type { AgentHelpers, AgentResult } from "../helpers/types";
import type { QueuedItem } from "@/lib/db/functions/queues";

const FRESHNESS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const preFetchedDataSchema = z.object({
  url: z.string(),
  markdown: z.string(),
  links: z.array(z.string()),
  pulledAt: z.number(),
  freshTil: z.number(),
});

const jobBoardAgentPayloadSchema = z.object({
  organizationId: z.number(),
  careersUrl: z.url(),
  companyName: z.string(),
  preFetchedData: preFetchedDataSchema.optional(),
});

type JobBoardAgentPayloadArgs = z.infer<typeof jobBoardAgentPayloadSchema>;

const jobLinkEvaluationSchema = z.object({
  url: z.string(),
  shouldQueue: z.boolean(),
  reason: z.string().describe("Brief explanation of why this link should or should not be queued for job extraction"),
  jobTitle: z.string().optional().describe("The job title if this is a job posting link"),
});

const findJobLinks = async (markdown: string, links: string[], careersUrl: string, usage: unknown[]) => {
  const linksText = links.map((l, i) => `${i + 1}. ${l}`).join("\n");

  const objectData = await generateObject({
    model: claudeFast(),
    schema: z.object({
      jobLinks: z.array(jobLinkEvaluationSchema),
    }),
    prompt: `You are discovering job postings on a careers page.

Careers page URL:
${careersUrl}

### Page Markdown (first 2000 chars):
${markdown.substring(0, 2000)}

### Links found:
${linksText}

Your task:
1. Identify which links are individual job posting pages (not generic pages like "About Us", "Benefits", etc.)
2. Extract the job title if available from the link text or context
3. Determine if each link should be queued for job extraction

Rules:
- Only mark shouldQueue=true for links that lead to actual job posting pages
- Ignore links to general company pages, blog posts, news, or non-job content
- Look for patterns like /jobs/, /careers/, /positions/, /openings/ followed by identifiers
- If the URL itself contains a job title slug, extract that as the job title
- For embedded job boards (Lever, Greenhouse, etc.), identify individual job listing URLs
- Avoid duplicates (same job listed multiple times)
- If unsure whether a link is a job posting, lean conservative (shouldQueue=false)

Return evaluations for all relevant links.`,
  });

  if (!objectData.object) throw new AppError(ERROR_CODES.AI_OBJECT_CREATION_FAILED, "Failed to find job links");
  if (objectData.usage) usage.push(objectData.usage);

  return objectData.object.jobLinks;
};

const getCareersPage = async (url: string, preFetchedData?: z.infer<typeof preFetchedDataSchema>) => {
  if (preFetchedData) {
    const now = Date.now();
    if (preFetchedData.pulledAt <= now && now <= preFetchedData.freshTil) {
      return {
        markdown: preFetchedData.markdown,
        links: preFetchedData.links,
        source: 'prefetched' as const,
        pulledAt: preFetchedData.pulledAt,
        age: now - preFetchedData.pulledAt,
      };
    }
  }

  const { markdown, links } = await utils.getMdAndLinks(url);
  if (!markdown) throw new AppError(ERROR_CODES.FC_MARKDOWN_FAILED, `Failed to get markdown for ${url}`);
  if (!links) throw new AppError(ERROR_CODES.FC_LINKS_FAILED, `Failed to get links for ${url}`);
  return { markdown, links, source: 'live' as const, pulledAt: Date.now(), age: 0 };
};

const preFetchJobData = async (url: string) => {
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

const jobBoardAgent = async (
  queuedItem: QueuedItem,
  helpers: AgentHelpers,
): Promise<AgentResult> => {
  const { payload } = queuedItem as unknown as { payload: JobBoardAgentPayloadArgs };

  const logs: string[] = [
    "jobBoardAgent: started",
    `queueItemId: ${queuedItem.id}`,
    `parentCallId: ${helpers.parentCallId}`,
    `organizationId: ${payload.organizationId}`,
    `careersUrl: ${payload.careersUrl}`,
    `companyName: ${payload.companyName}`,
  ];

  const usage: unknown[] = [];
  const childQueueItems: Array<{
    payload: unknown;
    agent: string;
    maxRetries?: number;
  }> = [];

  try {
    logs.push("Fetching careers page...");
    const careersDoc = await getCareersPage(payload.careersUrl, payload.preFetchedData);
    logs.push(`Fetched careers page: ${careersDoc.markdown.length} chars, ${careersDoc.links.length} links (source: ${careersDoc.source}, age: ${careersDoc.age}ms)`);

    logs.push("Finding job posting links...");
    const jobLinks = await findJobLinks(careersDoc.markdown, careersDoc.links, payload.careersUrl, usage);
    logs.push(`Found ${jobLinks.length} job posting links`);

    const qualifyingLinks = jobLinks.filter(e => e.shouldQueue);
    const filteredOut = jobLinks.filter(e => !e.shouldQueue);

    logs.push(`Qualifying jobs to process: ${qualifyingLinks.length}`);
    logs.push(`Filtered out non-job links: ${filteredOut.length}`);

    // TODO: Filter jobs by location if needed (Canadian jobs only, remote-only, etc.)

    logs.push("Pre-fetching job posting data...");
    const preFetchedData = await Promise.all(
      qualifyingLinks.map(e => preFetchJobData(e.url))
    );
    logs.push(`Pre-fetched data for ${preFetchedData.length} job postings`);

    for (const data of preFetchedData) {
      if (data.preFetchError) {
        logs.push(`Pre-fetch failed for ${data.url}: ${data.preFetchError}`);
        continue;
      }

      const matchingEvaluation = qualifyingLinks.find(e => e.url === data.url);
      childQueueItems.push({
        payload: {
          organizationId: payload.organizationId,
          url: data.url,
          companyName: payload.companyName,
          preFetchedData: data,
        },
        agent: "jobAgent",
        maxRetries: 3,
      });
      logs.push(`Queued jobAgent for ${data.url}${matchingEvaluation?.jobTitle ? ` (${matchingEvaluation.jobTitle})` : ''}`);
    }

    const result = {
      organizationId: payload.organizationId,
      companyName: payload.companyName,
      careersUrl: payload.careersUrl,
      totalLinksFound: jobLinks.length,
      qualifyingCount: qualifyingLinks.length,
      filteredOutCount: filteredOut.length,
      qualifyingLinks: qualifyingLinks.map(e => ({ url: e.url, jobTitle: e.jobTitle, reason: e.reason })),
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

export { jobBoardAgent, jobBoardAgentPayloadSchema, type JobBoardAgentPayloadArgs };
