import { AppError, ERROR_CODES } from "@/lib/errors";
import { generateObject, generateText } from "ai";
import { db, schemas, jobCaches, jobsJobsCaches } from "@/lib/db/runtime";
import { claudeMain } from "@/lib/ai/models";
import { prompts } from '@/lib/ai/prompts';
import { readPage, searchSite } from '@/lib/ai/tools';
import { observePrepareSteps } from '@/lib/ai/observability';
import { jobTaggingAgent } from '@/lib/ai/agents/minor/jobTaggingAgent';
import { sha256Hex } from "@/lib/hash";
import {
  assessCanadianJobCandidate,
  assertValidJobCandidate,
  companyNamesMatch,
  extractEmployerNameFromJobPage,
  extractLocationFromText,
  extractProvinceFromText,
  getSanitizedJobCandidate,
  hasLowSignalContent,
  inferRemoteOkFromText,
  isBlockedJobUrl,
  isUnknownValue,
  mentionsCanadaInText,
} from "@/lib/quality/content";
import { detectAtsProvider, extractSharedBoardCompanyContext, extractStructuredJobFromAtsPage } from "@/lib/ats";
import { upsertJob } from "@/lib/pipeline/jobs";
import {
  findExistingOrganization,
  findExistingOrganizationByName,
  upsertOrganization,
} from "@/lib/pipeline/organizations";
import { getCanonicalDomain } from "@/lib/quality/urls";
import { fetchCachedPage } from "@/lib/cache/pages";
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

  return await fetchCachedPage({
    url,
    kind: "job_posting",
    ttlMs: 7 * 24 * 60 * 60 * 1000,
  });
};

const jobAgentPayloadSchema = z.object({
  organizationId: z.number(),
  url: z.url(),
  companyName: z.string(),
  boardOperatorOrganizationId: z.number().optional(),
  boardOperatorCompanyName: z.string().optional(),
  expectedJobTitle: z.string().optional(),
  atsProvider: z.string().optional(),
  preFetchedData: preFetchedDataSchema.optional(),
});

type JobAgentPayloadArgs = z.infer<typeof jobAgentPayloadSchema>;

type HiringOrganizationResolution = {
  organizationId: number;
  companyName: string;
  organizationUrl?: string;
  resolution:
    | "board_operator"
    | "existing_company_org"
    | "created_company_org";
  childQueueItem?: {
    payload: unknown;
    agent: string;
    maxRetries?: number;
  };
};

const buildQualificationQueueItem = (args: {
  organizationId: number;
  name: string;
  url: string;
}) => ({
  payload: {
    organizationId: args.organizationId,
    name: args.name,
    url: args.url,
  },
  agent: "qualificationAgent",
  maxRetries: 3,
});

const resolveHiringOrganization = async (args: {
  payload: JobAgentPayloadArgs;
  title?: string;
  city: string;
  province: string;
  description: string;
  markdown: string;
  atsCompanyName?: string;
  atsCompanyWebsite?: string;
}) : Promise<HiringOrganizationResolution> => {
  const boardOperatorOrganizationId = args.payload.boardOperatorOrganizationId ?? args.payload.organizationId;
  const boardOperatorCompanyName = args.payload.boardOperatorCompanyName ?? args.payload.companyName;
  const sharedBoardCompany = extractSharedBoardCompanyContext(args.payload.url);

  const inferredCompanyName =
    args.atsCompanyName
    ?? extractEmployerNameFromJobPage({
      markdown: args.markdown,
      expectedJobTitle: args.payload.expectedJobTitle ?? args.title,
      companySlug: sharedBoardCompany?.companySlug,
    })
    ?? boardOperatorCompanyName;

  if (companyNamesMatch(inferredCompanyName, boardOperatorCompanyName)) {
    return {
      organizationId: boardOperatorOrganizationId,
      companyName: boardOperatorCompanyName,
      resolution: "board_operator",
    };
  }

  const candidateOrganizationUrl =
    args.atsCompanyWebsite
    ?? sharedBoardCompany?.companyProfileUrl
    ?? args.payload.url;

  if (args.atsCompanyWebsite) {
    const existingByWebsite = await findExistingOrganization({
      url: args.atsCompanyWebsite,
      canonicalDomain: getCanonicalDomain(args.atsCompanyWebsite),
    });

    if (existingByWebsite) {
      return {
        organizationId: existingByWebsite.id,
        companyName: existingByWebsite.name,
        organizationUrl: existingByWebsite.website ?? candidateOrganizationUrl,
        resolution: "existing_company_org",
      };
    }
  }

  const existingByName = await findExistingOrganizationByName(inferredCompanyName);
  if (existingByName) {
    return {
      organizationId: existingByName.id,
      companyName: existingByName.name,
      organizationUrl: existingByName.website ?? candidateOrganizationUrl,
      resolution: "existing_company_org",
      childQueueItem:
        existingByName.qualificationStatus === "qualified" || !candidateOrganizationUrl
          ? undefined
          : buildQualificationQueueItem({
              organizationId: existingByName.id,
              name: existingByName.name,
              url: candidateOrganizationUrl,
            }),
    };
  }

  const createdOrganization = await upsertOrganization({
    url: candidateOrganizationUrl,
    careersPage: candidateOrganizationUrl,
    name: inferredCompanyName,
    city: args.city,
    province: args.province,
    description: args.description.slice(0, 500),
    industry: null,
    canonicalDomainOverride: args.atsCompanyWebsite ? undefined : null,
  });

  return {
    organizationId: createdOrganization.id,
    companyName: createdOrganization.name,
    organizationUrl: createdOrganization.website ?? candidateOrganizationUrl,
    resolution: "created_company_org",
    childQueueItem: buildQualificationQueueItem({
      organizationId: createdOrganization.id,
      name: createdOrganization.name,
      url: candidateOrganizationUrl,
    }),
  };
};

const getJobLocationFallback = (args: {
  title?: string;
  markdown: string;
  primaryDataText?: string;
}) => {
  const combinedText = [args.title, args.markdown, args.primaryDataText]
    .filter(Boolean)
    .join("\n");
  const location = extractLocationFromText(combinedText);
  const province = location.province ?? extractProvinceFromText(combinedText);
  const remoteOk = inferRemoteOkFromText(combinedText);
  const canadaMentioned = mentionsCanadaInText(combinedText);

  if (!location.city && remoteOk && canadaMentioned) {
    return {
      city: "Remote",
      province: province ?? "Canada",
      remoteOk,
    };
  }

  return {
    city: location.city,
    province,
    remoteOk,
  };
};

const preferExtractedValue = (value: string | null | undefined, fallback: string | undefined) =>
  isUnknownValue(value) ? fallback : value ?? fallback;

const getDescriptionFallback = (args: {
  description?: string | null;
  markdown: string;
  primaryDataText?: string;
  expectedJobTitle?: string;
}) => {
  if (!isUnknownValue(args.description) && (args.description?.trim().length ?? 0) >= 40) {
    return args.description?.trim();
  }

  const source = [args.primaryDataText, args.markdown]
    .filter(Boolean)
    .join("\n")
    .replace(/\s+/g, " ")
    .trim();

  if (!source) {
    return undefined;
  }

  let snippet = source;
  if (args.expectedJobTitle) {
    const titleIndex = source.toLowerCase().indexOf(args.expectedJobTitle.toLowerCase());
    if (titleIndex >= 0) {
      snippet = source.slice(titleIndex + args.expectedJobTitle.length).trim();
    }
  }

  snippet = snippet
    .replace(/^.*?Apply now\s+/i, "")
    .replace(/\s+(Privacy policy|Cookie policy).*$/i, "")
    .trim();

  if (snippet.length < 40) {
    return undefined;
  }

  return snippet.slice(0, 600).trim();
};

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

const getObjectData = async (
  url: string,
  primaryData: any,
  companyName: string,
  usage: unknown[],
  expectedJobTitle?: string,
) => {
  const objectData = await generateObject({
    model: claudeMain(),
    schema: schemas.jobs.insert.omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      canonicalPostingUrl: true,
      atsProvider: true,
      extractionMethod: true,
      listingStatus: true,
      reviewStatus: true,
      reviewReason: true,
      firstSeenAt: true,
      lastSeenAt: true,
      lastCheckedAt: true,
    }),
    prompt: `Extract the required information from the following markdown to create a 'job' object. This markdown is from a sibling LLM that searched the website for relevant data.

Job URL: ${url}
Company Name: ${companyName}
Expected Job Title: ${expectedJobTitle ?? "Unknown"}

Markdown content:
---
${primaryData.text}`,
  });
  if (!objectData.object) throw new AppError(ERROR_CODES.AI_OBJECT_CREATION_FAILED, "Failed to extract job object", { ...objectData });
  if (objectData.usage) usage.push(objectData.usage);
  return objectData.object;
};

const createJobCache = async (url: string, markdown: string, contentHash?: string | null) => {
  const hash = contentHash ?? await sha256Hex(markdown);
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
  const childQueueItems: Array<{
    payload: unknown;
    agent: string;
    maxRetries?: number;
  }> = [];

  try {
    if (isBlockedJobUrl(payload.url)) {
      throw new Error(`Rejected blocked job URL: ${payload.url}`);
    }

    logs.push("Fetching job page...");
    const jobDoc = await getJobPage(payload.url, payload.preFetchedData);
    logs.push(`Fetched job page: ${jobDoc.markdown.length} chars, ${jobDoc.links.length} links (source: ${jobDoc.source}, age: ${jobDoc.age}ms)`);

    if (hasLowSignalContent(jobDoc.markdown)) {
      throw new Error(`Rejected low-signal job page: ${payload.url}`);
    }

    const atsProvider = payload.atsProvider ?? detectAtsProvider(payload.url);
    let extractionMethod = "llm";
    let finalJobData:
      | {
          title?: string;
          city?: string;
          province?: string;
        description?: string;
        remoteOk?: boolean;
        salaryMin?: number;
        salaryMax?: number;
        companyName?: string;
        companyWebsite?: string;
      }
      | null = null;

    if (atsProvider !== "unknown") {
      try {
        const atsExtraction = await extractStructuredJobFromAtsPage({
          url: payload.url,
          expectedJobTitle: payload.expectedJobTitle,
        });

      if (atsExtraction?.details) {
          const locationFallback = getJobLocationFallback({
            title: payload.expectedJobTitle,
            markdown: jobDoc.markdown,
          });
          const sanitizedAtsCandidate = getSanitizedJobCandidate({
            ...atsExtraction.details,
            city: preferExtractedValue(atsExtraction.details.city, locationFallback.city),
            province: preferExtractedValue(atsExtraction.details.province, locationFallback.province),
            description: preferExtractedValue(
              atsExtraction.details.description,
              getDescriptionFallback({
                description: atsExtraction.details.description,
                markdown: jobDoc.markdown,
                expectedJobTitle: payload.expectedJobTitle,
              }),
            ),
            expectedJobTitle: payload.expectedJobTitle,
            contextText: jobDoc.markdown,
          });

          try {
            assertValidJobCandidate({
              ...sanitizedAtsCandidate,
              url: payload.url,
            });

            finalJobData = {
              ...atsExtraction.details,
              ...sanitizedAtsCandidate,
              remoteOk: atsExtraction.details.remoteOk ?? locationFallback.remoteOk,
            };
            extractionMethod = `ats:${atsProvider}`;
            logs.push(`ATS extraction succeeded for ${payload.url}`);
          } catch {
            logs.push(`ATS extraction incomplete for ${payload.url}, falling back to LLM`);
          }
        }
      } catch (err) {
        logs.push(`ATS extraction failed for ${payload.url}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    logs.push("Discovering job primary data...");
    let primaryData = { text: "" } as Awaited<ReturnType<typeof getPrimaryData>>;
    if (!finalJobData) {
      primaryData = await getPrimaryData(jobDoc.markdown, jobDoc.links, payload.url);
      if (primaryData.usage) usage.push(primaryData.usage);
      logs.push(`Primary data discovered: ${primaryData.text.length} chars`);

      logs.push("Extracting job object from primary data...");
      const objectData = await getObjectData(payload.url, primaryData, payload.companyName, usage, payload.expectedJobTitle);
      const locationFallback = getJobLocationFallback({
        title: payload.expectedJobTitle,
        markdown: jobDoc.markdown,
        primaryDataText: primaryData.text,
      });
      const sanitizedJobCandidate = getSanitizedJobCandidate({
        title: objectData.title,
        city: preferExtractedValue(objectData.city, locationFallback.city),
        province: preferExtractedValue(objectData.province, locationFallback.province),
        description: preferExtractedValue(
          objectData.description,
          getDescriptionFallback({
            description: objectData.description,
            markdown: jobDoc.markdown,
            primaryDataText: primaryData.text,
            expectedJobTitle: payload.expectedJobTitle,
          }),
        ),
        expectedJobTitle: payload.expectedJobTitle,
        contextText: [primaryData.text, jobDoc.markdown].join("\n"),
      });

      assertValidJobCandidate({
        ...sanitizedJobCandidate,
        url: payload.url,
      });

      finalJobData = {
        ...objectData,
        ...sanitizedJobCandidate,
        remoteOk: objectData.remoteOk ?? locationFallback.remoteOk,
      };
    }

    const publicationAssessment = assessCanadianJobCandidate({
      title: finalJobData.title,
      city: finalJobData.city,
      province: finalJobData.province,
      description: finalJobData.description,
      markdown: jobDoc.markdown,
      primaryDataText: primaryData.text,
      remoteOk: finalJobData.remoteOk,
      url: payload.url,
    });

    finalJobData = {
      ...finalJobData,
      city: publicationAssessment.city ?? finalJobData.city,
      province: publicationAssessment.province ?? finalJobData.province,
      remoteOk: publicationAssessment.remoteOk,
    };

    if (!publicationAssessment.publishable) {
      logs.push(`Skipped job publication: ${publicationAssessment.reviewReason}`);
      const result = {
        skipped: true,
        jobUrl: payload.url,
        reason: publicationAssessment.reviewReason,
        extractionMethod,
        atsProvider,
        title: finalJobData.title,
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
    }

    logs.push(`Extracted job: ${finalJobData.title}`);

    const hiringOrganization = await resolveHiringOrganization({
      payload,
      title: finalJobData.title,
      city: finalJobData.city!,
      province: finalJobData.province!,
      description: finalJobData.description!,
      markdown: jobDoc.markdown,
      atsCompanyName: finalJobData.companyName,
      atsCompanyWebsite: finalJobData.companyWebsite,
    });
    logs.push(
      `Resolved hiring organization: ${hiringOrganization.companyName} (${hiringOrganization.resolution})`,
    );

    if (hiringOrganization.childQueueItem) {
      childQueueItems.push(hiringOrganization.childQueueItem);
      logs.push(`Queued qualificationAgent for ${hiringOrganization.companyName}`);
    }

    logs.push("Persisting job to database...");
    const newJob = await upsertJob({
      organizationId: hiringOrganization.organizationId,
      url: payload.url,
      companyName: hiringOrganization.companyName,
      title: finalJobData.title!,
      city: finalJobData.city!,
      province: finalJobData.province!,
      description: finalJobData.description!,
      remoteOk: Boolean(finalJobData.remoteOk),
      salaryMin: finalJobData.salaryMin ?? null,
      salaryMax: finalJobData.salaryMax ?? null,
      postingUrl: payload.url,
      atsProvider: atsProvider === "unknown" ? null : atsProvider,
      extractionMethod,
      reviewStatus: "approved",
      isAtAStartup: true,
      lastScrapedMarkdown: jobDoc.markdown,
    });
    logs.push(`Persisted job: ${newJob.id} - ${newJob.title}`);

    logs.push(`Verified job ${newJob.id} is linked to organization ${hiringOrganization.organizationId}`);

    logs.push("Creating job cache...");
    const jobCache = await createJobCache(payload.url, jobDoc.markdown, jobDoc.contentHash);
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
      boardOperator: {
        organizationId: payload.boardOperatorOrganizationId ?? payload.organizationId,
        companyName: payload.boardOperatorCompanyName ?? payload.companyName,
      },
      hiringOrganization: {
        organizationId: hiringOrganization.organizationId,
        companyName: hiringOrganization.companyName,
        organizationUrl: hiringOrganization.organizationUrl,
        resolution: hiringOrganization.resolution,
      },
      city: newJob.city,
      province: newJob.province,
      remoteOk: newJob.remoteOk,
      salaryMin: newJob.salaryMin,
      salaryMax: newJob.salaryMax,
      home: { markdownChars: jobDoc.markdown.length, linksCount: jobDoc.links.length },
      extractionMethod,
      atsProvider,
      primaryData: primaryData.text.slice(0, 2_000),
      tagging: {
        steps: taggingResult.steps.length,
        text: taggingResult.text.slice(0, 1_000),
      },
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
      childQueueItems,
    };
  }
};

export { jobAgent, jobAgentPayloadSchema, type JobAgentPayloadArgs };
