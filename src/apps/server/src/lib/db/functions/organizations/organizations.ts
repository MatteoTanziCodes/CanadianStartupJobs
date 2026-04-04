import { eq } from "drizzle-orm";
import { type Database, organizations } from "@canadian-startup-jobs/db";
import { AppError, ERROR_CODES } from "@/lib/errors";

type OrganizationsSelect = typeof organizations.$inferSelect;

const getOrganizationById = async (
  db: Database,
  id: number,
): Promise<OrganizationsSelect> => {
  const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  if (!result[0]) {
    throw new AppError(ERROR_CODES.DB_QUERY_FAILED, "Organization not found", { id });
  }
  return result[0];
};

export { getOrganizationById };
