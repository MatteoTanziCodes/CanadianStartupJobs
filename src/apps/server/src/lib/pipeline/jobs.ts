import { and, eq, inArray, not, or } from "drizzle-orm";
import { db, jobs, orgsJobs } from "@/lib/db/runtime";
import { getCanonicalPostingUrl } from "@/lib/quality/urls";

type UpsertJobArgs = {
  organizationId: number;
  url: string;
  companyName: string;
  title: string;
  city: string;
  province: string;
  description: string;
  remoteOk: boolean;
  salaryMin?: number | null;
  salaryMax?: number | null;
  postingUrl?: string | null;
  atsProvider?: string | null;
  extractionMethod: string;
  reviewStatus: "approved" | "review";
  reviewReason?: string | null;
  isAtAStartup?: boolean | null;
  lastScrapedMarkdown?: string | null;
};

export const findExistingJob = async (args: {
  url?: string | null;
  canonicalPostingUrl?: string | null;
  organizationId?: number;
  title?: string | null;
}) => {
  const conditions = [];

  if (args.canonicalPostingUrl) {
    conditions.push(eq(jobs.canonicalPostingUrl, args.canonicalPostingUrl));
  }

  if (args.url) {
    conditions.push(eq(jobs.postingUrl, args.url));
    conditions.push(eq(jobs.jobBoardUrl, args.url));
  }

  const matchingJobs = conditions.length
    ? await db.select().from(jobs).where(or(...conditions))
    : [];

  if (matchingJobs.length > 0) {
    return matchingJobs[0];
  }

  if (!args.organizationId || !args.title) {
    return null;
  }

  const existingForOrg = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      city: jobs.city,
      province: jobs.province,
      remoteOk: jobs.remoteOk,
      salaryMin: jobs.salaryMin,
      salaryMax: jobs.salaryMax,
      description: jobs.description,
      company: jobs.company,
      jobBoardUrl: jobs.jobBoardUrl,
      postingUrl: jobs.postingUrl,
      canonicalPostingUrl: jobs.canonicalPostingUrl,
      atsProvider: jobs.atsProvider,
      extractionMethod: jobs.extractionMethod,
      listingStatus: jobs.listingStatus,
      reviewStatus: jobs.reviewStatus,
      reviewReason: jobs.reviewReason,
      isAtAStartup: jobs.isAtAStartup,
      lastScrapedMarkdown: jobs.lastScrapedMarkdown,
      firstSeenAt: jobs.firstSeenAt,
      lastSeenAt: jobs.lastSeenAt,
      lastCheckedAt: jobs.lastCheckedAt,
      createdAt: jobs.createdAt,
      updatedAt: jobs.updatedAt,
    })
    .from(jobs)
    .innerJoin(orgsJobs, eq(orgsJobs.jobId, jobs.id))
    .where(and(eq(orgsJobs.orgId, args.organizationId), eq(jobs.title, args.title)))
    .limit(1);

  return existingForOrg[0] ?? null;
};

export const ensureOrgJobLink = async (organizationId: number, jobId: number) => {
  const existing = await db
    .select()
    .from(orgsJobs)
    .where(eq(orgsJobs.jobId, jobId));

  const matching = existing.find((row) => row.orgId === organizationId);

  const obsoleteOrgIds = existing
    .filter((row) => row.orgId !== organizationId)
    .map((row) => row.orgId);

  if (obsoleteOrgIds.length > 0) {
    await db
      .delete(orgsJobs)
      .where(and(eq(orgsJobs.jobId, jobId), not(eq(orgsJobs.orgId, organizationId))));
  }

  if (matching) {
    return matching;
  }

  const [created] = await db.insert(orgsJobs).values({ orgId: organizationId, jobId }).returning();
  return created;
};

export const upsertJob = async (args: UpsertJobArgs) => {
  const canonicalPostingUrl = getCanonicalPostingUrl(args.postingUrl ?? args.url);
  const now = new Date();

  const existing = await findExistingJob({
    url: args.postingUrl ?? args.url,
    canonicalPostingUrl,
    organizationId: args.organizationId,
    title: args.title,
  });

  if (existing) {
    const [updated] = await db
      .update(jobs)
      .set({
        title: args.title,
        city: args.city,
        province: args.province,
        description: args.description,
        company: args.companyName,
        jobBoardUrl: args.url,
        postingUrl: args.postingUrl ?? args.url,
        canonicalPostingUrl: canonicalPostingUrl || existing.canonicalPostingUrl,
        atsProvider: args.atsProvider ?? existing.atsProvider,
        extractionMethod: args.extractionMethod,
        listingStatus: "active",
        reviewStatus: args.reviewStatus,
        reviewReason: args.reviewReason ?? null,
        remoteOk: args.remoteOk,
        salaryMin: args.salaryMin ?? null,
        salaryMax: args.salaryMax ?? null,
        isAtAStartup: args.isAtAStartup ?? existing.isAtAStartup,
        lastScrapedMarkdown: args.lastScrapedMarkdown ?? existing.lastScrapedMarkdown,
        lastSeenAt: now,
        lastCheckedAt: now,
        updatedAt: now,
      })
      .where(eq(jobs.id, existing.id))
      .returning();

    await ensureOrgJobLink(args.organizationId, existing.id);
    return updated ?? existing;
  }

  const [created] = await db
    .insert(jobs)
    .values({
      title: args.title,
      city: args.city,
      province: args.province,
      description: args.description,
      company: args.companyName,
      jobBoardUrl: args.url,
      postingUrl: args.postingUrl ?? args.url,
      canonicalPostingUrl: canonicalPostingUrl || undefined,
      atsProvider: args.atsProvider ?? undefined,
      extractionMethod: args.extractionMethod,
      listingStatus: "active",
      reviewStatus: args.reviewStatus,
      reviewReason: args.reviewReason ?? null,
      remoteOk: args.remoteOk,
      salaryMin: args.salaryMin ?? null,
      salaryMax: args.salaryMax ?? null,
      isAtAStartup: args.isAtAStartup ?? null,
      lastScrapedMarkdown: args.lastScrapedMarkdown ?? null,
      firstSeenAt: now,
      lastSeenAt: now,
      lastCheckedAt: now,
    })
    .returning();

  if (!created) {
    throw new Error(`Failed to upsert job ${args.url}`);
  }

  await ensureOrgJobLink(args.organizationId, created.id);
  return created;
};

export const markMissingJobsAsStale = async (args: {
  organizationId: number;
  activeUrls: string[];
}) => {
  const normalizedActiveUrls = args.activeUrls
    .map((url) => getCanonicalPostingUrl(url))
    .filter(Boolean);

  const existing = await db
    .select({
      jobId: jobs.id,
      canonicalPostingUrl: jobs.canonicalPostingUrl,
      postingUrl: jobs.postingUrl,
      jobBoardUrl: jobs.jobBoardUrl,
      listingStatus: jobs.listingStatus,
    })
    .from(jobs)
    .innerJoin(orgsJobs, eq(orgsJobs.jobId, jobs.id))
    .where(eq(orgsJobs.orgId, args.organizationId));

  const staleJobIds = existing
    .filter((job) => {
      const canonicalUrl = getCanonicalPostingUrl(
        job.canonicalPostingUrl || job.postingUrl || job.jobBoardUrl || "",
      );

      return (
        job.listingStatus !== "stale" &&
        !!canonicalUrl &&
        !normalizedActiveUrls.includes(canonicalUrl)
      );
    })
    .map((job) => job.jobId);

  if (staleJobIds.length === 0) {
    return [];
  }

  const now = new Date();
  return await db
    .update(jobs)
    .set({
      listingStatus: "stale",
      lastCheckedAt: now,
      updatedAt: now,
    })
    .where(inArray(jobs.id, staleJobIds))
    .returning();
};
