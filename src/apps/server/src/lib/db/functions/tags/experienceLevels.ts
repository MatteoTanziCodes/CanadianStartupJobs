import { eq, asc, desc } from "drizzle-orm";
import { type Database, experienceLevels } from "@canadian-startup-jobs/db";

type ExperienceLevelsInsert = typeof experienceLevels.$inferInsert;
type ExperienceLevelsSelect = typeof experienceLevels.$inferSelect;

const get_experienceLevels = async (
  db: Database,
  skip?: number,
  take?: number,
  order?: "asc" | "desc",
): Promise<ExperienceLevelsSelect[]> =>
  db
    .select()
    .from(experienceLevels)
    .orderBy(order === "asc" ? asc(experienceLevels.id) : desc(experienceLevels.id))
    .limit(take ?? 10)
    .offset(skip ?? 0);

const create_experienceLevels = async (db: Database, insert: ExperienceLevelsInsert): Promise<boolean> => {
  const result = await db
    .insert(experienceLevels)
    .values(insert)
    .onConflictDoNothing()
    .returning({ id: experienceLevels.id });
  return result.length > 0;
};

const delete_experienceLevels = async (db: Database, select: ExperienceLevelsSelect): Promise<boolean> => {
  const result = await db
    .delete(experienceLevels)
    .where(eq(experienceLevels.id, select.id))
    .returning({ deletedId: experienceLevels.id });
  return result.length > 0;
};

const update_experienceLevels = async (
  db: Database,
  select: ExperienceLevelsSelect,
  insert: ExperienceLevelsInsert,
): Promise<boolean> => {
  const result = await db
    .update(experienceLevels)
    .set(insert)
    .where(eq(experienceLevels.id, select.id))
    .returning({ updatedId: experienceLevels.id });
  return result.length > 0;
};

export {
  create_experienceLevels,
  update_experienceLevels,
  delete_experienceLevels,
  get_experienceLevels,
};
