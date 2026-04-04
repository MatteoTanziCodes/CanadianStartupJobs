import { eq, or, sql } from "drizzle-orm";
import { db, organizations } from "@/lib/db/runtime";
import { getCanonicalDomain } from "@/lib/quality/urls";

type UpsertOrganizationArgs = {
  url: string;
  careersPage?: string | null;
  name: string;
  city: string;
  province: string;
  description: string;
  industry?: string | null;
  canonicalDomainOverride?: string | null;
};

export const findExistingOrganization = async (args: {
  url?: string | null;
  canonicalDomain?: string | null;
}) => {
  const conditions = [];

  if (args.canonicalDomain) {
    conditions.push(eq(organizations.canonicalDomain, args.canonicalDomain));
  }

  if (args.url) {
    conditions.push(eq(organizations.website, args.url));
  }

  if (conditions.length === 0) {
    return null;
  }

  const result = await db
    .select()
    .from(organizations)
    .where(or(...conditions))
    .limit(1);

  return result[0] ?? null;
};

export const upsertOrganization = async (args: UpsertOrganizationArgs) => {
  const canonicalDomain = args.canonicalDomainOverride === undefined
    ? getCanonicalDomain(args.url)
    : args.canonicalDomainOverride;
  const careersDomain = args.careersPage ? getCanonicalDomain(args.careersPage) : null;
  const now = new Date();

  const existing = await findExistingOrganization({
    url: args.url,
    canonicalDomain,
  });

  if (existing) {
    const [updated] = await db
      .update(organizations)
      .set({
        name: args.name,
        city: args.city,
        province: args.province,
        description: args.description,
        website: args.url,
        careersPage: args.careersPage ?? existing.careersPage,
        industry: args.industry ?? existing.industry,
        canonicalDomain: canonicalDomain || existing.canonicalDomain,
        careersDomain: careersDomain || existing.careersDomain,
        lastSeenAt: now,
        updatedAt: now,
      })
      .where(eq(organizations.id, existing.id))
      .returning();

    return updated ?? existing;
  }

  const [created] = await db
    .insert(organizations)
    .values({
      name: args.name,
      city: args.city,
      province: args.province,
      description: args.description,
      website: args.url,
      careersPage: args.careersPage ?? undefined,
      industry: args.industry ?? undefined,
      canonicalDomain: canonicalDomain || undefined,
      careersDomain: careersDomain || undefined,
      lastSeenAt: now,
    })
    .returning();

  if (!created) {
    throw new Error(`Failed to upsert organization ${args.url}`);
  }

  return created;
};

export const findExistingOrganizationByName = async (name: string) => {
  const normalizedName = name.trim().replace(/\s+/g, " ").toLowerCase();
  if (!normalizedName) {
    return null;
  }

  const result = await db
    .select()
    .from(organizations)
    .where(sql`lower(trim(${organizations.name})) = ${normalizedName}`)
    .limit(1);

  return result[0] ?? null;
};

export const updateOrganizationQualification = async (args: {
  organizationId: number;
  qualificationStatus: string;
  ownershipStatus: string;
  operationsStatus: string;
  canadianConfidence: number;
  qualificationEvidenceSummary?: string | null;
  evidenceUrls?: string[] | null;
  reviewReason?: string | null;
}) => {
  const now = new Date();
  const [updated] = await db
    .update(organizations)
    .set({
      qualificationStatus: args.qualificationStatus,
      ownershipStatus: args.ownershipStatus,
      operationsStatus: args.operationsStatus,
      canadianConfidence: args.canadianConfidence,
      qualificationEvidenceSummary: args.qualificationEvidenceSummary ?? null,
      evidenceUrls: args.evidenceUrls ?? null,
      reviewReason: args.reviewReason ?? null,
      lastQualifiedAt: now,
      updatedAt: now,
    })
    .where(eq(organizations.id, args.organizationId))
    .returning();

  if (!updated) {
    throw new Error(`Failed to update qualification for organization ${args.organizationId}`);
  }

  return updated;
};

export const updateOrganizationCareersDiscovery = async (args: {
  organizationId: number;
  careersPage?: string | null;
  careersCandidates?: string[] | null;
  careersProvider?: string | null;
  careersDiscoveryMethod?: string | null;
  careersConfidence?: number | null;
  lastCareersValidatedAt?: Date | null;
}) => {
  const now = new Date();
  const careersDomain = args.careersPage ? getCanonicalDomain(args.careersPage) : null;

  const [updated] = await db
    .update(organizations)
    .set({
      careersPage: args.careersPage ?? null,
      careersDomain,
      careersCandidates: args.careersCandidates ?? null,
      careersProvider: args.careersProvider ?? null,
      careersDiscoveryMethod: args.careersDiscoveryMethod ?? null,
      careersConfidence: args.careersConfidence ?? 0,
      lastCareersValidatedAt: args.lastCareersValidatedAt ?? null,
      updatedAt: now,
    })
    .where(eq(organizations.id, args.organizationId))
    .returning();

  if (!updated) {
    throw new Error(`Failed to update careers discovery for organization ${args.organizationId}`);
  }

  return updated;
};

export const getQualifiedOrganizationIds = async () => {
  const result = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.qualificationStatus, "qualified"));

  return result.map((item) => item.id);
};
