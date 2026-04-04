import { claudeFast } from "@/lib/ai/models";
import { db, schemas, sources } from "@/lib/db/runtime";
import { generateObject } from "ai";
import { prompts } from '@/lib/ai/prompts';
import { AppError, ERROR_CODES } from '@/lib/errors';

type NewSource = typeof sources.$inferInsert;
const insertSource = async (source: NewSource) => {
  return await db.insert(sources).values(source).returning();
};

export const createNewSourceFromMarkdown = async (markdown: string, url: string, portfolio: string) => {
  const objectData = await generateObject({
    model: claudeFast(),
    schema: schemas.sources.insert.omit({
        id: true,
        createdAt: true,
        updatedAt: true,
    }),
    prompt: prompts.getNewSource(markdown, url, portfolio)
  });
   if (!objectData.object) throw new AppError(ERROR_CODES.AI_OBJECT_CREATION_FAILED, "Failed to extract source object", {...objectData});
  const newSource = await insertSource({
    ...objectData.object,
    website: url,
    portfolio: portfolio,
  });
  if (!newSource[0]) throw new AppError(ERROR_CODES.DB_INSERT_FAILED, "Failed to insert source to db");
  return newSource[0];
};
