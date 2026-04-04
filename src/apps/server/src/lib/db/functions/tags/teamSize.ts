import { eq, asc, desc } from "drizzle-orm";
import { type Database, teamSize } from "@canadian-startup-jobs/db";

type TeamSizeInsert = typeof teamSize.$inferInsert;
type TeamSizeSelect = typeof teamSize.$inferSelect;

const get_teamSize = async (
  db: Database,
  skip?: number,
  take?: number,
  order?: "asc" | "desc",
): Promise<TeamSizeSelect[]> =>
  db
    .select()
    .from(teamSize)
    .orderBy(order === "asc" ? asc(teamSize.id) : desc(teamSize.id))
    .limit(take ?? 10)
    .offset(skip ?? 0);

const create_teamSize = async (db: Database, insert: TeamSizeInsert): Promise<boolean> => {
  const result = await db.insert(teamSize).values(insert).onConflictDoNothing().returning({ id: teamSize.id });
  return result.length > 0;
};

const delete_teamSize = async (db: Database, select: TeamSizeSelect): Promise<boolean> => {
  const result = await db
    .delete(teamSize)
    .where(eq(teamSize.id, select.id))
    .returning({ deletedId: teamSize.id });
  return result.length > 0;
};

const update_teamSize = async (
  db: Database,
  select: TeamSizeSelect,
  insert: TeamSizeInsert,
): Promise<boolean> => {
  const result = await db.update(teamSize).set(insert).where(eq(teamSize.id, select.id)).returning({
    updatedId: teamSize.id,
  });
  return result.length > 0;
};

export { create_teamSize, delete_teamSize, get_teamSize, update_teamSize };
