import { and, eq } from "drizzle-orm";
import { db, pageCaches } from "@/lib/db/runtime";
import { utils } from "@/lib/firecrawl";
import { sha256Hex } from "@/lib/hash";
import { normalizeHttpUrl } from "@/lib/quality/urls";

type PageCacheKind =
  | "source_home"
  | "source_portfolio"
  | "portfolio_seed"
  | "portfolio_detail"
  | "organization_home"
  | "careers_page"
  | "job_posting";

type CachedPageArgs = {
  url: string;
  kind: PageCacheKind;
  ttlMs: number;
  forceRefresh?: boolean;
};

export type CachedPageResult = {
  url: string;
  kind: PageCacheKind;
  markdown: string;
  links: string[];
  source: "cache" | "live" | "stale_cache";
  pulledAt: number;
  freshTil: number;
  age: number;
  contentHash?: string | null;
};

const nowMs = () => Date.now();

const toEpochMs = (value: Date | number | null | undefined, fallback = nowMs()) => {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return fallback;
};

const getExistingPageCache = async (kind: PageCacheKind, normalizedUrl: string) => {
  const rows = await db
    .select()
    .from(pageCaches)
    .where(and(eq(pageCaches.kind, kind), eq(pageCaches.url, normalizedUrl)))
    .limit(1);

  return rows[0] ?? null;
};

const toCachedResult = (args: {
  url: string;
  kind: PageCacheKind;
  markdown: string;
  links: string[];
  source: "cache" | "live" | "stale_cache";
  pulledAt: number;
  freshTil: number;
  contentHash?: string | null;
}): CachedPageResult => ({
  ...args,
  age: Math.max(0, nowMs() - args.pulledAt),
});

const upsertPageCache = async (args: {
  existingId?: number;
  kind: PageCacheKind;
  url: string;
  markdown: string;
  links: string[];
  contentHash: string;
  freshTil: number;
}) => {
  const updateValues = {
    markdown: args.markdown,
    links: args.links,
    contentHash: args.contentHash,
    status: "fresh",
    lastError: null,
    freshTil: args.freshTil,
    lastScrapedAt: new Date(),
    lastCheckedAt: new Date(),
    updatedAt: new Date(),
  };

  if (args.existingId) {
    await db.update(pageCaches).set(updateValues).where(eq(pageCaches.id, args.existingId));
    return;
  }

  await db.insert(pageCaches).values({
    kind: args.kind,
    url: args.url,
    ...updateValues,
    createdAt: new Date(),
  });
};

const markFailedCheck = async (args: {
  existingId?: number;
  kind: PageCacheKind;
  url: string;
  error: string;
}) => {
  const updateValues = {
    status: "error",
    lastError: args.error,
    lastCheckedAt: new Date(),
    updatedAt: new Date(),
  };

  if (args.existingId) {
    await db.update(pageCaches).set(updateValues).where(eq(pageCaches.id, args.existingId));
    return;
  }

  await db.insert(pageCaches).values({
    kind: args.kind,
    url: args.url,
    status: "error",
    lastError: args.error,
    links: [],
    createdAt: new Date(),
    lastScrapedAt: new Date(),
    lastCheckedAt: new Date(),
    updatedAt: new Date(),
  });
};

export const fetchCachedPage = async (args: CachedPageArgs): Promise<CachedPageResult> => {
  const normalizedUrl = normalizeHttpUrl(args.url);
  if (!normalizedUrl) {
    throw new Error(`Invalid page cache URL: ${args.url}`);
  }

  const existing = await getExistingPageCache(args.kind, normalizedUrl);
  const now = nowMs();

  if (
    existing &&
    !args.forceRefresh &&
    existing.markdown &&
    existing.freshTil &&
    existing.freshTil.getTime() >= now
  ) {
    return toCachedResult({
      url: normalizedUrl,
      kind: args.kind,
      markdown: existing.markdown,
      links: Array.isArray(existing.links) ? existing.links : [],
      source: "cache",
      pulledAt: toEpochMs(existing.lastScrapedAt),
      freshTil: toEpochMs(existing.freshTil),
      contentHash: existing.contentHash,
    });
  }

  try {
    const { markdown, links } = await utils.getMdAndLinks(normalizedUrl);
    const safeMarkdown = markdown ?? "";
    const safeLinks = links ?? [];
    const contentHash = await sha256Hex(`${safeMarkdown}\n${JSON.stringify(safeLinks)}`);
    const freshTil = now + args.ttlMs;

    await upsertPageCache({
      existingId: existing?.id,
      kind: args.kind,
      url: normalizedUrl,
      markdown: safeMarkdown,
      links: safeLinks,
      contentHash,
      freshTil,
    });

    return toCachedResult({
      url: normalizedUrl,
      kind: args.kind,
      markdown: safeMarkdown,
      links: safeLinks,
      source: "live",
      pulledAt: now,
      freshTil,
      contentHash,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markFailedCheck({
      existingId: existing?.id,
      kind: args.kind,
      url: normalizedUrl,
      error: message,
    });

    if (existing?.markdown) {
      return toCachedResult({
        url: normalizedUrl,
        kind: args.kind,
        markdown: existing.markdown,
        links: Array.isArray(existing.links) ? existing.links : [],
        source: "stale_cache",
        pulledAt: toEpochMs(existing.lastScrapedAt),
        freshTil: toEpochMs(existing.freshTil, now),
        contentHash: existing.contentHash,
      });
    }

    throw error;
  }
};
