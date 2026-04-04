import { eq, asc, desc } from "drizzle-orm";
import { type Database, provinces } from "@canadian-startup-jobs/db";

type ProvincesInsert = typeof provinces.$inferInsert;
type ProvincesSelect = typeof provinces.$inferSelect;

const get_provinces = async (
  db: Database,
  skip?: number,
  take?: number,
  order?: "asc" | "desc",
): Promise<ProvincesSelect[]> =>
  db
    .select()
    .from(provinces)
    .orderBy(order === "asc" ? asc(provinces.id) : desc(provinces.id))
    .limit(take ?? 10)
    .offset(skip ?? 0);

const create_provinces = async (db: Database, insert: ProvincesInsert): Promise<boolean> => {
  const result = await db.insert(provinces).values(insert).onConflictDoNothing().returning({ id: provinces.id });
  return result.length > 0;
};

const delete_provinces = async (db: Database, select: ProvincesSelect): Promise<boolean> => {
  const result = await db
    .delete(provinces)
    .where(eq(provinces.id, select.id))
    .returning({ deletedId: provinces.id });
  return result.length > 0;
};

const update_provinces = async (
  db: Database,
  select: ProvincesSelect,
  insert: ProvincesInsert,
): Promise<boolean> => {
  const result = await db
    .update(provinces)
    .set(insert)
    .where(eq(provinces.id, select.id))
    .returning({ updatedId: provinces.id });
  return result.length > 0;
};

export { create_provinces, delete_provinces, get_provinces, update_provinces };
