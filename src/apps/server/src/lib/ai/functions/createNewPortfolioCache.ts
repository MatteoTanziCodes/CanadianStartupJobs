import { db, schemas, portfolioCaches, sourcesPortfolioCaches } from "@/lib/db/runtime";
import { sha256Hex } from "@/lib/hash";
import { AppError,ERROR_CODES } from "@/lib/errors";

export async function createNewPortfolioCache(url: string) {
  const htmlPayload = await fetch(url);
  const hash = await sha256Hex(await htmlPayload.arrayBuffer());
  const now = Date.now();
  const args = schemas.portfolioCaches.insert.safeParse({
    url,
    freshTil: now + (7 * 24 * 60 * 60 * 1000),
    lastHash: hash
  });
  if (args.error) throw new AppError(ERROR_CODES.SCHEMA_PARSE_FAILED, "Failed to parse portfolio cache arguments", { ...args.error });
  const newPortfolio = await db.insert(portfolioCaches).values(args.data).returning();
  if (!newPortfolio[0]) throw new AppError(ERROR_CODES.DB_INSERT_FAILED, "Failed to create portfolio cache");
  return newPortfolio[0];
}

export async function connectSourceToPortfolioCache(sourceId: number, cacheId: number) {
  const args = schemas.sourcesPortfolioCaches.insert.safeParse({
    sourceId, portfolioCacheId: cacheId
  });
  if (args.error) throw new AppError(ERROR_CODES.SCHEMA_PARSE_FAILED, "Failed to parse source <> portfolio cache connection arguments.", { ...args.error });
  const newPivot = await db.insert(sourcesPortfolioCaches).values(args.data).returning();
  if (!newPivot[0]) throw new AppError(ERROR_CODES.DB_INSERT_FAILED, "Failed to create source <> portfolio cache entry");
  return newPivot[0];
}
