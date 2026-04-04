import { eq, asc, desc } from "drizzle-orm";
import { type Database, roles } from "@canadian-startup-jobs/db";

type RolesInsert = typeof roles.$inferInsert;
type RolesSelect = typeof roles.$inferSelect;

const get_roles = async (
  db: Database,
  skip?: number,
  take?: number,
  order?: "asc" | "desc",
): Promise<RolesSelect[]> =>
  db
    .select()
    .from(roles)
    .orderBy(order === "asc" ? asc(roles.id) : desc(roles.id))
    .limit(take ?? 10)
    .offset(skip ?? 0);

const create_roles = async (db: Database, insert: RolesInsert): Promise<boolean> => {
  const result = await db.insert(roles).values(insert).onConflictDoNothing().returning({ id: roles.id });
  return result.length > 0;
};

const delete_roles = async (db: Database, select: RolesSelect): Promise<boolean> => {
  const result = await db.delete(roles).where(eq(roles.id, select.id)).returning({ deletedId: roles.id });
  return result.length > 0;
};

const update_roles = async (
  db: Database,
  select: RolesSelect,
  insert: RolesInsert,
): Promise<boolean> => {
  const result = await db.update(roles).set(insert).where(eq(roles.id, select.id)).returning({
    updatedId: roles.id,
  });
  return result.length > 0;
};

export { create_roles, delete_roles, get_roles, update_roles };
