import { claudeMain } from "@/lib/ai/models";
import { db, schemas, organizations, } from "@/lib/db/runtime";
import { generateObject, generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import type { GenerateTextResult, Tool } from 'ai';
import { prompts } from '@/lib/ai/prompts';
import { readPage, searchSite } from '@/lib/ai/tools';
import { observePrepareSteps } from '@/lib/ai/observability';
import { getPrimaryData, SiteExplorationTask } from '@/lib/ai/agents/minor/siteExplorationAgent';
import { AppError, ERROR_CODES } from "@/lib/errors";
import { autoTagOrganization } from '@/lib/ai/functions/autoTagOrganization';
import { utils } from '@/lib/firecrawl';

type NewOrganization = typeof organizations.$inferInsert;
const insertOrganization = async (source: NewOrganization) => {
  return await db.insert(organizations).values(source).returning();
};

const getHomePage = async (url: string) => {
  const { markdown, links } = await utils.getMdAndLinks(url);
  if (!markdown) throw new AppError(ERROR_CODES.FC_MARKDOWN_FAILED, `Failed to get markdown for ${url}`);
  if (!links) throw new AppError(ERROR_CODES.FC_LINKS_FAILED, `Failed to get links for ${url}`);
  return { markdown, links };
}


const getObjectData = async (url: string, primaryData: GenerateTextResult<{
    readPage: Tool<{
        url: string;
    }, string>;
    searchSite: Tool<{
        url: string;
        searchTerm: string;
    }, string>;
}, never>) => {
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
  if (!objectData.object) throw new AppError(ERROR_CODES.AI_OBJECT_CREATION_FAILED, "Failed to extract organization object", {...objectData});
  return objectData
}

export const createNewOrganizationFromURL = async (url: string) => {
  const { markdown, links } = await getHomePage(url);
  const primaryData = await getPrimaryData({
    markdown,
    links,
    url,
    task: SiteExplorationTask.DISCOVER_ORGANIZATION,
    name: "Organization Primary Data"
  });
  const objectData = await getObjectData(url, primaryData);

  const uploadValues = schemas.organizations.insert.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  }).safeParse(objectData.object);
  if (uploadValues.error) throw new AppError(ERROR_CODES.SCHEMA_PARSE_FAILED, "Failed to parse extracted organization object", { ...uploadValues.error });

  const newOrganization = await insertOrganization({
    ...(uploadValues.data),
    website: url,
  });
  if (!newOrganization[0]) throw new AppError(ERROR_CODES.DB_INSERT_FAILED, "Failed to insert extracted organization to db");
  console.log("✅ New Organization created.");
  console.log("Launching tagging agent...");
  const newOrgWithURL = {
    ...newOrganization[0],
    website: url,
  }
  await autoTagOrganization(JSON.stringify(newOrgWithURL), markdown, links, url);
  return newOrganization[0];
};
