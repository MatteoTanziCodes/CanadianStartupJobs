import { AppError, ERROR_CODES } from "@/lib/errors";
import { generateObject, generateText } from "ai";
import { db, schemas, jobs, orgsJobs, jobCaches, jobsJobsCaches } from "@/lib/db/runtime";
import { claudeMain } from "@/lib/ai/models";
import { prompts } from '@/lib/ai/prompts';
import { readPage, searchSite, jobTools } from '@/lib/ai/tools';
import { observePrepareSteps } from '@/lib/ai/observability';
import { utils } from '@/lib/firecrawl';
import { jobTaggingAgent } from '@/lib/ai/agents/minor/jobTaggingAgent';
import { sha256Hex } from "@/lib/hash";
import { z } from 'zod';
import type { AgentHelpers, AgentResult } from "../helpers/types";
import type { QueuedItem } from "@/lib/db/functions/queues";

const preFetchedDataSchema = z.object({
  url: z.string(),
  markdown: z.string(),
  links: z.array(z.string()),
  pulledAt: z.number(),
  freshTil: z.number(),
});

const getJobPage = async (url: string, preFetchedData?: z.infer<typeof preFetchedDataSchema>) => {
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

const jobAgentPayloadSchema = z.object({
  organizationId: z.number(),
  url: z.url(),
  companyName: z.string(),
  preFetchedData: preFetchedDataSchema.optional(),
});

type JobAgentPayloadArgs = z.infer<typeof jobAgentPayloadSchema>;

const getPrimaryData = async (markdown: string, links: string[], url: string) => {
  return await generateText({
    model: claudeMain(),
    prompt: prompts.discoverNewJob(markdown, links, url),
    tools: {
      readPage,
      searchSite,
    },
    prepareStep: observePrepareSteps("Job Primary Data"),
  });
};

const getObjectData = async (url: string, primaryData: any, companyName: string, usage: unknown[]) => {
  const objectData = await generateObject({
    model: claudeMain(),
    schema: schemas.jobs.insert.omit({
      id: true,
      createdAt: true,
      updatedAt: true,
    }),
    prompt: `Extract the required information from the following markdown to create a 'job' object. This markdown is from a sibling LLM that searched the website for relevant data.

Job URL: ${url}
Company Name: ${companyName}

Markdown content:
---
${primaryData.text}`,
  });
  if (!objectData.object) throw new AppError(ERROR_CODES.AI_OBJECT_CREATION_FAILED, "Failed to extract job object", { ...objectData });
  if (objectData.usage) usage.push(objectData.usage);
  return objectData.object;
};

const insertJob = async (jobData: any, url: string, companyName: string, postingUrl?: string) => {
  const uploadValues = schemas.jobs.insert.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  }).safeParse({
    ...jobData,
    company: companyName,
    jobBoardUrl: url,
    postingUrl: postingUrl ?? url,
  });
  if (uploadValues.error) throw new AppError(ERROR_CODES.SCHEMA_PARSE_FAILED, "Failed to parse extracted job object", { ...uploadValues.error });

  const newJob = await db.insert(jobs).values(uploadValues.data).returning();
  if (!newJob[0]) throw new AppError(ERROR_CODES.DB_INSERT_FAILED, "Failed to insert job to db");
  return newJob[0];
};

const connectJobToOrganization = async (organizationId: number, jobId: number) => {
  const args = schemas.orgsJobs.insert.safeParse({
    orgId: organizationId,
    jobId,
  });
  if (args.error) throw new AppError(ERROR_CODES.SCHEMA_PARSE_FAILED, "Failed to parse org <> job connection arguments", { ...args.error });
  const newPivot = await db.insert(orgsJobs).values(args.data).returning();
  if (!newPivot[0]) throw new AppError(ERROR_CODES.DB_INSERT_FAILED, "Failed to create org <> job entry");
  return newPivot[0];
};

const createJobCache = async (url: string, markdown: string) => {
  const hash = await sha256Hex(markdown);
  const now = Date.now();
  const args = schemas.jobCaches.insert.safeParse({
    url,
    freshTil: now + (7 * 24 * 60 * 60 * 1000),
    lastHash: hash,
  });
  if (args.error) throw new AppError(ERROR_CODES.SCHEMA_PARSE_FAILED, "Failed to parse job cache arguments", { ...args.error });
  const newCache = await db.insert(jobCaches).values(args.data).returning();
  if (!newCache[0]) throw new AppError(ERROR_CODES.DB_INSERT_FAILED, "Failed to create job cache");
  return newCache[0];
};

const connectJobToCache = async (jobId: number, cacheId: number) => {
  const args = schemas.jobsJobsCaches.insert.safeParse({
    jobId,
    jobCacheId: cacheId,
  });
  if (args.error) throw new AppError(ERROR_CODES.SCHEMA_PARSE_FAILED, "Failed to parse job <> cache connection arguments", { ...args.error });
  const newPivot = await db.insert(jobsJobsCaches).values(args.data).returning();
  if (!newPivot[0]) throw new AppError(ERROR_CODES.DB_INSERT_FAILED, "Failed to create job <> cache entry");
  return newPivot[0];
};

const tagJob = async (
  job: { id: number; title: string; company: string },
  markdown: string,
  url: string,
  usage: unknown[],
  logs: string[],
) => {
  logs.push("Starting job tagging...");

  const result = await jobTaggingAgent.generate({
    prompt: prompts.getJobTags(
      JSON.stringify(job),
      markdown,
      url,
    ),
  });

  if (result.usage) usage.push(result.usage);
  logs.push(`Job tagging completed: ${result.steps.length} steps`);

  return result;
};

const jobAgent = async (
  queuedItem: QueuedItem,
  helpers: AgentHelpers,
): Promise<AgentResult> => {
  const { payload } = queuedItem as unknown as { payload: JobAgentPayloadArgs };

  const logs: string[] = [
    "jobAgent: started",
    `queueItemId: ${queuedItem.id}`,
    `parentCallId: ${helpers.parentCallId}`,
    `organizationId: ${payload.organizationId}`,
    `url: ${payload.url}`,
    `companyName: ${payload.companyName}`,
  ];

  const usage: unknown[] = [];

  try {
    logs.push("Fetching job page...");
    const jobDoc = await getJobPage(payload.url, payload.preFetchedData);
    logs.push(`Fetched job page: ${jobDoc.markdown.length} chars, ${jobDoc.links.length} links (source: ${jobDoc.source}, age: ${jobDoc.age}ms)`);

    logs.push("Discovering job primary data...");
    const primaryData = await getPrimaryData(jobDoc.markdown, jobDoc.links, payload.url);
    if (primaryData.usage) usage.push(primaryData.usage);
    logs.push(`Primary data discovered: ${primaryData.text.length} chars`);

    logs.push("Extracting job object from primary data...");
    const objectData = await getObjectData(payload.url, primaryData, payload.companyName, usage);
    logs.push(`Extracted job: ${objectData.title}`);

    logs.push("Inserting job to database...");
    const newJob = await insertJob(objectData, payload.url, payload.companyName);
    logs.push(`Created job: ${newJob.id} - ${newJob.title}`);

    logs.push("Connecting job to organization...");
    await connectJobToOrganization(payload.organizationId, newJob.id);
    logs.push(`Connected job ${newJob.id} to organization ${payload.organizationId}`);

    logs.push("Creating job cache...");
    const jobCache = await createJobCache(payload.url, jobDoc.markdown);
    logs.push(`Created job cache: ${jobCache.id}`);

    logs.push("Connecting job to cache...");
    await connectJobToCache(newJob.id, jobCache.id);
    logs.push(`Connected job ${newJob.id} to cache ${jobCache.id}`);

    logs.push("Tagging job...");
    const taggingResult = await tagJob(
      { id: newJob.id, title: newJob.title, company: newJob.company },
      jobDoc.markdown,
      payload.url,
      usage,
      logs,
    );

    const result = {
      job: { id: newJob.id, title: newJob.title, company: newJob.company },
      jobUrl: payload.url,
      jobBoardUrl: newJob.jobBoardUrl,
      postingUrl: newJob.postingUrl,
      city: newJob.city,
      province: newJob.province,
      remoteOk: newJob.remoteOk,
      salaryMin: newJob.salaryMin,
      salaryMax: newJob.salaryMax,
      home: { markdown: jobDoc.markdown, links: jobDoc.links },
      primaryData: primaryData.text,
      tagging: {
        steps: taggingResult.steps.length,
        text: taggingResult.text,
      },
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

export { jobAgent, jobAgentPayloadSchema, type JobAgentPayloadArgs };
