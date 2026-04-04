import { eq, asc, desc } from "drizzle-orm";
import { type Database, industries } from "@canadian-startup-jobs/db";

type IndustriesInsert = typeof industries.$inferInsert;
type IndustriesSelect = typeof industries.$inferSelect;

const get_industries = async (
  db: Database,
  skip?: number,
  take?: number,
  order?: "asc" | "desc",
): Promise<IndustriesSelect[]> =>
  db
    .select()
    .from(industries)
    .orderBy(order === "asc" ? asc(industries.id) : desc(industries.id))
    .limit(take ?? 10)
    .offset(skip ?? 0);

const create_industries = async (db: Database, insert: IndustriesInsert): Promise<boolean> => {
  const result = await db
    .insert(industries)
    .values(insert)
    .onConflictDoNothing()
    .returning({ id: industries.id });
  return result.length > 0;
};

const delete_industries = async (db: Database, select: IndustriesSelect): Promise<boolean> => {
  const result = await db
    .delete(industries)
    .where(eq(industries.id, select.id))
    .returning({ deletedId: industries.id });
  return result.length > 0;
};

const update_industries = async (
  db: Database,
  select: IndustriesSelect,
  insert: IndustriesInsert,
): Promise<boolean> => {
  const result = await db
    .update(industries)
    .set(insert)
    .where(eq(industries.id, select.id))
    .returning({ updatedId: industries.id });
  return result.length > 0;
};

export { create_industries, delete_industries, get_industries, update_industries };
