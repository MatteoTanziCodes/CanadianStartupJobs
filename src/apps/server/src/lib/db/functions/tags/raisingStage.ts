import { eq, asc, desc } from "drizzle-orm";
import { type Database, raisingStage } from "@canadian-startup-jobs/db";

type RaisingStageInsert = typeof raisingStage.$inferInsert;
type RaisingStageSelect = typeof raisingStage.$inferSelect;

const get_raisingStage = async (
  db: Database,
  skip?: number,
  take?: number,
  order?: "asc" | "desc",
): Promise<RaisingStageSelect[]> =>
  db
    .select()
    .from(raisingStage)
    .orderBy(order === "asc" ? asc(raisingStage.id) : desc(raisingStage.id))
    .limit(take ?? 10)
    .offset(skip ?? 0);

const create_raisingStage = async (db: Database, insert: RaisingStageInsert): Promise<boolean> => {
  const result = await db
    .insert(raisingStage)
    .values(insert)
    .onConflictDoNothing()
    .returning({ id: raisingStage.id });
  return result.length > 0;
};

const delete_raisingStage = async (db: Database, select: RaisingStageSelect): Promise<boolean> => {
  const result = await db
    .delete(raisingStage)
    .where(eq(raisingStage.id, select.id))
    .returning({ deletedId: raisingStage.id });
  return result.length > 0;
};

const update_raisingStage = async (
  db: Database,
  select: RaisingStageSelect,
  insert: RaisingStageInsert,
): Promise<boolean> => {
  const result = await db
    .update(raisingStage)
    .set(insert)
    .where(eq(raisingStage.id, select.id))
    .returning({ updatedId: raisingStage.id });
  return result.length > 0;
};

export { create_raisingStage, delete_raisingStage, get_raisingStage, update_raisingStage };
