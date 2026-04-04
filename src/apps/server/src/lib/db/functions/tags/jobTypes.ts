import { eq, asc, desc } from "drizzle-orm";
import { type Database, jobTypes } from "@canadian-startup-jobs/db";

type JobTypesInsert = typeof jobTypes.$inferInsert;
type JobTypesSelect = typeof jobTypes.$inferSelect;

const get_jobTypes = async (
  db: Database,
  skip?: number,
  take?: number,
  order?: "asc" | "desc",
): Promise<JobTypesSelect[]> =>
  db
    .select()
    .from(jobTypes)
    .orderBy(order === "asc" ? asc(jobTypes.id) : desc(jobTypes.id))
    .limit(take ?? 10)
    .offset(skip ?? 0);

const create_jobTypes = async (db: Database, insert: JobTypesInsert): Promise<boolean> => {
  const result = await db.insert(jobTypes).values(insert).onConflictDoNothing().returning({ id: jobTypes.id });
  return result.length > 0;
};

const delete_jobTypes = async (db: Database, select: JobTypesSelect): Promise<boolean> => {
  const result = await db
    .delete(jobTypes)
    .where(eq(jobTypes.id, select.id))
    .returning({ deletedId: jobTypes.id });
  return result.length > 0;
};

const update_jobTypes = async (
  db: Database,
  select: JobTypesSelect,
  insert: JobTypesInsert,
): Promise<boolean> => {
  const result = await db
    .update(jobTypes)
    .set(insert)
    .where(eq(jobTypes.id, select.id))
    .returning({ updatedId: jobTypes.id });
  return result.length > 0;
};

export { create_jobTypes, delete_jobTypes, get_jobTypes, update_jobTypes };
