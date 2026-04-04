import { claudeMain } from "@/lib/ai/models";
import { db, schemas, jobs, } from "@/lib/db/runtime";
import { generateObject, generateText } from "ai";
import type { GenerateTextResult, Tool } from 'ai';
import { prompts } from '@/lib/ai/prompts';
import { readPage, searchSite } from '@/lib/ai/tools';
import { observePrepareSteps } from '@/lib/ai/observability';
import { AppError, ERROR_CODES } from "@/lib/errors";
import { utils } from '@/lib/firecrawl';

type NewJob = typeof jobs.$inferInsert;
const insertJob = async (source: NewJob) => {
  return await db.insert(jobs).values(source).returning();
};

const getHomePage = async (url: string) => {
  const { markdown, links } = await utils.getMdAndLinks(url);
  if (!markdown) throw new AppError(ERROR_CODES.FC_MARKDOWN_FAILED, `Failed to get markdown for ${url}`);
  if (!links) throw new AppError(ERROR_CODES.FC_LINKS_FAILED, `Failed to get links for ${url}`);
  return { markdown, links };
}

const getPrimaryData = async (markdown: string, links: string[], url: string) => {
  return await generateText({
    model: claudeMain(),
    prompt: prompts.discoverNewJob(markdown, links, url),
    tools: {
      readPage,
      searchSite,
    },
    prepareStep: observePrepareSteps("Primary - Job"),
  });
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
    schema: schemas.jobs.insert.omit({
        id: true,
        createdAt: true,
        updatedAt: true,
    }),
    prompt: prompts.getNewJob(primaryData.text, url),
  });
  if (!objectData.object) throw new AppError(ERROR_CODES.AI_OBJECT_CREATION_FAILED, "Failed to extract job object", {...objectData});
  return objectData
}

export const createNewJobFromURL = async (url: string) => {
  const { markdown, links } = await getHomePage(url);
  const primaryData = await getPrimaryData(markdown, links, url);
  const objectData = await getObjectData(url, primaryData);

  const uploadValues = schemas.jobs.insert.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  }).safeParse(objectData.object);
  if (uploadValues.error) throw new AppError(ERROR_CODES.SCHEMA_PARSE_FAILED, "Failed to parse extracted job object", { ...uploadValues.error });

  const newJob = await insertJob({
    ...(uploadValues.data),
    jobBoardUrl: url,
  });
  if (!newJob[0]) throw new AppError(ERROR_CODES.DB_INSERT_FAILED, "Failed to insert extracted job to db");
  console.log("✅ New Job created.");
  console.log("Launching job tagging agent...");
  const newJobWithURL = {
    ...newJob[0],
    job_board_url: url,
  }
  // fire and forget
  import('./autoTagJob').then(m => m.autoTagJob(JSON.stringify(newJobWithURL), markdown, links, url));
  return newJob[0];
};
