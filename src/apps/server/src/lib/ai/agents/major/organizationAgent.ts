import { AppError, ERROR_CODES } from "@/lib/errors";
import { generateObject, generateText } from "ai";
import { schemas } from "@/lib/db/runtime";
import { claudeMain } from "@/lib/ai/models";
import { prompts } from '@/lib/ai/prompts';
import { readPage, searchSite } from '@/lib/ai/tools';
import { observePrepareSteps } from '@/lib/ai/observability';
import { fetchCachedPage } from "@/lib/cache/pages";
import { orgTaggingAgent } from '@/lib/ai/agents/minor/orgTaggingAgent';
import { hasLowSignalContent, isBlockedOrganizationUrl, isUnknownValue } from "@/lib/quality/content";
import { upsertOrganization } from "@/lib/pipeline/organizations";
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

const getHomePage = async (url: string, preFetchedData?: z.infer<typeof preFetchedDataSchema>) => {
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
    kind: "organization_home",
    ttlMs: 24 * 60 * 60 * 1000,
  });
};

const organizationAgentPayloadSchema = z.object({
  url: z.url(),
  preFetchedData: preFetchedDataSchema.optional(),
});

type OrganizationAgentPayloadArgs = z.infer<typeof organizationAgentPayloadSchema>;

const getPrimaryData = async (markdown: string, links: string[], url: string) => {
  return await generateText({
    model: claudeMain(),
    prompt: prompts.discoverNewOrganization(markdown, links, url),
    tools: {
      readPage,
      searchSite,
    },
    prepareStep: observePrepareSteps("Organization Primary Data"),
  });
};

const getObjectData = async (url: string, primaryData: any, usage: unknown[]) => {
  const objectData = await generateObject({
    model: claudeMain(),
    schema: schemas.organizations.insert.omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      canonicalDomain: true,
      careersDomain: true,
      careersCandidates: true,
      careersProvider: true,
      careersDiscoveryMethod: true,
      careersConfidence: true,
      qualificationStatus: true,
      ownershipStatus: true,
      operationsStatus: true,
      canadianConfidence: true,
      qualificationEvidenceSummary: true,
      evidenceUrls: true,
      reviewReason: true,
      lastQualifiedAt: true,
      lastCareersValidatedAt: true,
      lastSeenAt: true,
    }).extend({
      careersPage: z.string().optional().describe("The URL of the careers page if one is clearly identifiable"),
    }),
    prompt: prompts.getNewOrganization(primaryData.text, url),
  });
  if (!objectData.object) throw new AppError(ERROR_CODES.AI_OBJECT_CREATION_FAILED, "Failed to extract organization object", { ...objectData });
  if (objectData.usage) usage.push(objectData.usage);
  return objectData.object;
};

const persistOrganization = async (orgData: any, url: string) => {
  const uploadValues = schemas.organizations.insert.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    canonicalDomain: true,
    careersDomain: true,
    careersCandidates: true,
    careersProvider: true,
    careersDiscoveryMethod: true,
    careersConfidence: true,
    qualificationStatus: true,
    ownershipStatus: true,
    operationsStatus: true,
    canadianConfidence: true,
    qualificationEvidenceSummary: true,
    evidenceUrls: true,
    reviewReason: true,
    lastQualifiedAt: true,
    lastCareersValidatedAt: true,
    lastSeenAt: true,
  }).safeParse(orgData);
  if (uploadValues.error) throw new AppError(ERROR_CODES.SCHEMA_PARSE_FAILED, "Failed to parse extracted organization object", { ...uploadValues.error });

  return await upsertOrganization({
    ...uploadValues.data,
    url,
    careersPage: orgData.careersPage,
  });
};

const tagOrganization = async (
  organization: { id: number; name: string; website?: string },
  markdown: string,
  links: string[],
  url: string,
  usage: unknown[],
  logs: string[],
) => {
  logs.push("Starting organization tagging...");

  const result = await orgTaggingAgent.generate({
    prompt: prompts.getOrganizationTags(
      JSON.stringify(organization),
      markdown,
      links,
      url,
    ),
  });

  if (result.usage) usage.push(result.usage);
  logs.push(`Organization tagging completed: ${result.steps.length} steps`);

  return result;
};

const organizationAgent = async (
  queuedItem: QueuedItem,
  helpers: AgentHelpers,
): Promise<AgentResult> => {
  const { payload } = queuedItem as unknown as { payload: OrganizationAgentPayloadArgs };

  const logs: string[] = [
    "organizationAgent: started",
    `queueItemId: ${queuedItem.id}`,
    `parentCallId: ${helpers.parentCallId}`,
    `url: ${payload.url}`,
  ];

  const usage: unknown[] = [];
  const childQueueItems: Array<{
    payload: unknown;
    agent: string;
    maxRetries?: number;
  }> = [];

  try {
    if (isBlockedOrganizationUrl(payload.url)) {
      throw new Error(`Rejected blocked organization URL: ${payload.url}`);
    }

    logs.push("Fetching home page...");
    const homeDoc = await getHomePage(payload.url, payload.preFetchedData);
    logs.push(`Fetched home page: ${homeDoc.markdown.length} chars, ${homeDoc.links.length} links (source: ${homeDoc.source}, age: ${homeDoc.age}ms)`);

    if (hasLowSignalContent(homeDoc.markdown)) {
      throw new Error(`Rejected low-signal organization page: ${payload.url}`);
    }

    logs.push("Discovering organization primary data...");
    const primaryData = await getPrimaryData(homeDoc.markdown, homeDoc.links, payload.url);
    if (primaryData.usage) usage.push(primaryData.usage);
    logs.push(`Primary data discovered: ${primaryData.text.length} chars`);

    logs.push("Extracting organization object from primary data...");
    const objectData = await getObjectData(payload.url, primaryData, usage);
    logs.push(`Extracted organization: ${objectData.name}`);

    if (isUnknownValue(objectData.name)) {
      throw new Error(`Rejected low-quality organization extraction for ${payload.url}`);
    }

    logs.push("Persisting organization to database...");
    const newOrganization = await persistOrganization(objectData, payload.url);
    logs.push(`Persisted organization: ${newOrganization.id} - ${newOrganization.name}`);

    logs.push("Tagging organization...");
    const taggingResult = await tagOrganization(
      { id: newOrganization.id, name: newOrganization.name, website: newOrganization.website ?? undefined },
      homeDoc.markdown,
      homeDoc.links,
      payload.url,
      usage,
      logs,
    );

    logs.push("Queueing organization qualification...");
    childQueueItems.push({
      payload: {
        organizationId: newOrganization.id,
        name: newOrganization.name,
        url: payload.url,
        careersPage: objectData.careersPage,
        preFetchedData: {
          url: payload.url,
          markdown: homeDoc.markdown,
          links: homeDoc.links,
          pulledAt: homeDoc.pulledAt,
          freshTil: Date.now() + 24 * 60 * 60 * 1000,
        },
      },
      agent: "qualificationAgent",
      maxRetries: 3,
    });
    logs.push(`Queued qualificationAgent for ${newOrganization.name}`);

    const result = {
      organization: { id: newOrganization.id, name: newOrganization.name, website: newOrganization.website },
      careersPage: objectData.careersPage,
      home: { markdown: homeDoc.markdown, links: homeDoc.links },
      primaryData: primaryData.text,
      tagging: {
        steps: taggingResult.steps.length,
        text: taggingResult.text,
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
    };
  }
};

export { organizationAgent, organizationAgentPayloadSchema, type OrganizationAgentPayloadArgs };
