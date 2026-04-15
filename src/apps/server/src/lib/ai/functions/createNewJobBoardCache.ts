import { sha256Hex } from "@/lib/hash";
import { db, schemas, jobBoardCaches, orgsJobBoardCaches } from "@/lib/db/runtime";
import { AppError, ERROR_CODES } from "@/lib/errors";

export async function createNewJobBoardCache(url: string) {
  const htmlPayload = await fetch(url);
  const hash = await sha256Hex(await htmlPayload.arrayBuffer());
  const now = new Date();
  const args = schemas.jobBoardCaches.insert.safeParse({
    url,
    freshTil: new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)),
    lastHash: hash
  });
  if (args.error) throw new AppError(ERROR_CODES.SCHEMA_PARSE_FAILED, "Failed to parse job board creation args", { ...args.error });
  const newJobBoard = await db.insert(jobBoardCaches).values(args.data).returning();
  if (!newJobBoard[0]) throw new AppError(ERROR_CODES.DB_INSERT_FAILED, "Failed insert job board cache");
  return newJobBoard[0];
}

export async function connectOrganizationToJobBoardCache(orgId: number, cacheId: number) {
  const args = schemas.orgsJobBoardCaches.insert.safeParse({
    orgId, jobBoardCacheId: cacheId
  });
  if (args.error) throw new AppError(ERROR_CODES.SCHEMA_PARSE_FAILED, "Failed to parse job board <> orgs connection args", { ...args.error });
  const newPivot = await db.insert(orgsJobBoardCaches).values(args.data).returning();
  if (!newPivot[0]) throw new AppError(ERROR_CODES.DB_INSERT_FAILED, "Failed insert job board <> orgs connection");
  return newPivot[0];
}
