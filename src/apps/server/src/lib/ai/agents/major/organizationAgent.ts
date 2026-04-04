import { AppError, ERROR_CODES } from "@/lib/errors";
import { generateObject, generateText } from "ai";
import { db, schemas, organizations } from "@/lib/db/runtime";
import { claudeMain } from "@/lib/ai/models";
import { prompts } from '@/lib/ai/prompts';
import { readPage, searchSite } from '@/lib/ai/tools';
import { observePrepareSteps } from '@/lib/ai/observability';
import { utils } from '@/lib/firecrawl';
import { orgTaggingAgent } from '@/lib/ai/agents/minor/orgTaggingAgent';
import { z } from 'zod';
import type { AgentHelpers, AgentResult } from "../helpers/types";
import type { QueuedItem } from "@/lib/db/functions/queues";
import type { Tool } from 'ai';

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

  const { markdown, links } = await utils.getMdAndLinks(url);
  if (!markdown) throw new AppError(ERROR_CODES.FC_MARKDOWN_FAILED, `Failed to get markdown for ${url}`);
  if (!links) throw new AppError(ERROR_CODES.FC_LINKS_FAILED, `Failed to get links for ${url}`);
  return { markdown, links, source: 'live' as const, pulledAt: Date.now(), age: 0 };
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
    }).extend({
      careersPage: z.string().describe("The URL of the careers page"),
    }),
    prompt: prompts.getNewOrganization(primaryData.text, url),
  });
  if (!objectData.object) throw new AppError(ERROR_CODES.AI_OBJECT_CREATION_FAILED, "Failed to extract organization object", { ...objectData });
  if (objectData.usage) usage.push(objectData.usage);
  return objectData.object;
};

const insertOrganization = async (orgData: any, url: string) => {
  const uploadValues = schemas.organizations.insert.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  }).safeParse(orgData);
  if (uploadValues.error) throw new AppError(ERROR_CODES.SCHEMA_PARSE_FAILED, "Failed to parse extracted organization object", { ...uploadValues.error });

  const newOrganization = await db.insert(organizations).values({
    ...uploadValues.data,
    website: url,
  }).returning();
  if (!newOrganization[0]) throw new AppError(ERROR_CODES.DB_INSERT_FAILED, "Failed to insert organization to db");
  return newOrganization[0];
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
    logs.push("Fetching home page...");
    const homeDoc = await getHomePage(payload.url, payload.preFetchedData);
    logs.push(`Fetched home page: ${homeDoc.markdown.length} chars, ${homeDoc.links.length} links (source: ${homeDoc.source}, age: ${homeDoc.age}ms)`);

    logs.push("Discovering organization primary data...");
    const primaryData = await getPrimaryData(homeDoc.markdown, homeDoc.links, payload.url);
    if (primaryData.usage) usage.push(primaryData.usage);
    logs.push(`Primary data discovered: ${primaryData.text.length} chars`);

    logs.push("Extracting organization object from primary data...");
    const objectData = await getObjectData(payload.url, primaryData, usage);
    logs.push(`Extracted organization: ${objectData.name}`);

    logs.push("Inserting organization to database...");
    const newOrganization = await insertOrganization(objectData, payload.url);
    logs.push(`Created organization: ${newOrganization.id} - ${newOrganization.name}`);

    logs.push("Tagging organization...");
    const taggingResult = await tagOrganization(
      { id: newOrganization.id, name: newOrganization.name, website: newOrganization.website ?? undefined },
      homeDoc.markdown,
      homeDoc.links,
      payload.url,
      usage,
      logs,
    );

    logs.push("Queueing job board exploration...");
    childQueueItems.push({
      payload: {
        organizationId: newOrganization.id,
        careersUrl: objectData.careersPage,
        companyName: newOrganization.name,
      },
      agent: "jobBoardAgent",
      maxRetries: 3,
    });
    logs.push(`Queued jobBoardAgent for ${newOrganization.name} at ${objectData.careersPage}`);

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

export { organizationAgent, organizationAgentPayloadSchema, type OrganizationAgentPayloadArgs };
