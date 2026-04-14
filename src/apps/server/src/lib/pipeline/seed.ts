import { addToQueue } from "@/lib/db/functions/queues";
import { db, jobs, organizationSeeds, organizations, orgsJobs, queues, sources } from "@/lib/db/runtime";
import { DEFAULT_ORGANIZATIONS } from "./defaultOrganizations";
import { DEFAULT_SOURCES } from "./defaultSources";
import { getCanonicalDomain, normalizeHttpUrl, normalizeSourceUrl } from "@/lib/quality/urls";

type SeedOptions = {
  force?: boolean;
};

const ORGANIZATION_SEED_BATCH_SIZE = 30;
const SOURCE_SEED_BATCH_SIZE = 6;
const QUALIFIED_JOBBOARD_BACKFILL_BATCH_SIZE = 20;
const MAX_QUEUE_BACKLOG_BEFORE_SEEDING = 150;

const getQueuedOrganizationUrls = (items: Array<{
  agent: string;
  status: string;
  payload: unknown;
}>) =>
  new Set(
    items.flatMap((item) => {
      if (!["organizationAgent", "qualificationAgent", "jobBoardAgent"].includes(item.agent)) {
        return [];
      }

      const payload = item.payload as { url?: string; careersUrl?: string } | null;
      return [payload?.url, payload?.careersUrl]
        .map((value) => normalizeHttpUrl(value ?? ""))
        .filter(Boolean) as string[];
    }),
  );

export const seedDefaultOrganizations = async (options: SeedOptions = {}) => {
  const [existingSeeds, existingOrganizations, existingQueueItems, queuedCount, jobCount] = await Promise.all([
    db.select({
      website: organizationSeeds.website,
      canonicalDomain: organizationSeeds.canonicalDomain,
    }).from(organizationSeeds),
    db.select({
      id: organizations.id,
      name: organizations.name,
      website: organizations.website,
      careersPage: organizations.careersPage,
      canonicalDomain: organizations.canonicalDomain,
      qualificationStatus: organizations.qualificationStatus,
    }).from(organizations),
    db.select({
      agent: queues.agent,
      status: queues.status,
      payload: queues.payload,
    }).from(queues),
    db.$count(queues),
    db.$count(jobs),
  ]);

  const existingSeedKeys = new Set(
    existingSeeds
      .flatMap((seed) => [seed.website, seed.canonicalDomain])
      .map((value) => normalizeHttpUrl(value ?? "") || (value ?? "").trim().toLowerCase())
      .filter(Boolean),
  );

  let insertedSeeds = 0;
  for (const seed of DEFAULT_ORGANIZATIONS) {
    const normalizedWebsite = normalizeHttpUrl(seed.website);
    const canonicalDomain = getCanonicalDomain(seed.website);
    const matchingKey = normalizedWebsite || canonicalDomain;
    if (!matchingKey || existingSeedKeys.has(matchingKey)) {
      continue;
    }

    await db.insert(organizationSeeds).values({
      name: seed.name,
      website: normalizedWebsite || seed.website,
      canonicalDomain: canonicalDomain || undefined,
      priority: seed.priority ?? 100,
      status: "active",
      notes: seed.notes ?? null,
    });
    existingSeedKeys.add(matchingKey);
    insertedSeeds += 1;
  }

  if (!options.force && queuedCount >= MAX_QUEUE_BACKLOG_BEFORE_SEEDING) {
    return {
      seeded: insertedSeeds,
      totalSeeds: DEFAULT_ORGANIZATIONS.length,
      queued: 0,
      queuedCount,
      jobCount,
      queueItems: [],
      reason: "queue-backlog-too-high",
    };
  }

  const activeQueueItems = existingQueueItems.filter(
    (item) => item.status === "queued" || item.status === "in_progress",
  );
  const queuedOrganizationUrls = getQueuedOrganizationUrls(activeQueueItems);

  const organizationIndex = new Map<string, typeof existingOrganizations[number]>();
  for (const organization of existingOrganizations) {
    const keys = [
      normalizeHttpUrl(organization.website ?? ""),
      organization.canonicalDomain?.trim().toLowerCase(),
    ].filter(Boolean) as string[];

    for (const key of keys) {
      if (!organizationIndex.has(key)) {
        organizationIndex.set(key, organization);
      }
    }
  }

  const organizationSeedCandidates = options.force
    ? DEFAULT_ORGANIZATIONS
    : DEFAULT_ORGANIZATIONS.filter((seed) => {
        const normalizedWebsite = normalizeHttpUrl(seed.website);
        const canonicalDomain = getCanonicalDomain(seed.website);
        const existingOrganization =
          organizationIndex.get(normalizedWebsite) ??
          organizationIndex.get(canonicalDomain);

        if (!existingOrganization) {
          return !queuedOrganizationUrls.has(normalizedWebsite);
        }

        const organizationUrl = normalizeHttpUrl(existingOrganization.website ?? seed.website) || seed.website;
        return (
          existingOrganization.qualificationStatus !== "qualified" &&
          !queuedOrganizationUrls.has(organizationUrl)
        );
      });
  const organizationSeedBatch = options.force
    ? organizationSeedCandidates
    : organizationSeedCandidates.slice(0, ORGANIZATION_SEED_BATCH_SIZE);

  const queued = [];
  for (const seed of organizationSeedBatch) {
    const normalizedWebsite = normalizeHttpUrl(seed.website);
    const canonicalDomain = getCanonicalDomain(seed.website);
    const existingOrganization =
      organizationIndex.get(normalizedWebsite) ??
      organizationIndex.get(canonicalDomain);

    if (!existingOrganization) {
      if (!options.force && queuedOrganizationUrls.has(normalizedWebsite)) {
        continue;
      }

      const queuedItem = await addToQueue({
        payload: {
          url: normalizedWebsite || seed.website,
        },
        agent: "organizationAgent",
        maxRetries: 3,
      });

      queued.push({
        id: queuedItem.id,
        organization: seed.name,
        action: "organizationAgent",
      });
      queuedOrganizationUrls.add(normalizedWebsite);
      continue;
    }

    const organizationUrl = normalizeHttpUrl(existingOrganization.website ?? seed.website) || seed.website;
    if (
      existingOrganization.qualificationStatus !== "qualified" &&
      (options.force || !queuedOrganizationUrls.has(organizationUrl))
    ) {
      const queuedItem = await addToQueue({
        payload: {
          organizationId: existingOrganization.id,
          name: existingOrganization.name,
          url: organizationUrl,
          careersPage: existingOrganization.careersPage ?? undefined,
        },
        agent: "qualificationAgent",
        maxRetries: 3,
      });

      queued.push({
        id: queuedItem.id,
        organization: existingOrganization.name,
        action: "qualificationAgent",
      });
      queuedOrganizationUrls.add(organizationUrl);
    }
  }

  const activeJobBoardQueueKeys = new Set(
    activeQueueItems.flatMap((item) => {
      if (item.agent !== "jobBoardAgent") {
        return [];
      }

      const payload = item.payload as { organizationId?: number; careersUrl?: string } | null;
      return [
        payload?.organizationId ? `org:${payload.organizationId}` : null,
        payload?.careersUrl ? `careers:${normalizeHttpUrl(payload.careersUrl)}` : null,
      ].filter(Boolean) as string[];
    }),
  );

  const currentOrganizations = await db.select({
    id: organizations.id,
    name: organizations.name,
    careersPage: organizations.careersPage,
    qualificationStatus: organizations.qualificationStatus,
  }).from(organizations);

  const orgJobLinks = await db.select({
    orgId: orgsJobs.orgId,
  }).from(orgsJobs);
  const orgIdsWithJobs = new Set(orgJobLinks.map((row) => row.orgId));

  const qualifiedWithoutJobs = currentOrganizations
    .filter((organization) =>
      organization.qualificationStatus === "qualified"
      && organization.careersPage
      && !orgIdsWithJobs.has(organization.id)
      && !activeJobBoardQueueKeys.has(`org:${organization.id}`)
      && !activeJobBoardQueueKeys.has(`careers:${normalizeHttpUrl(organization.careersPage)}`)
    )
    .slice(0, QUALIFIED_JOBBOARD_BACKFILL_BATCH_SIZE);

  for (const organization of qualifiedWithoutJobs) {
    const normalizedCareers = normalizeHttpUrl(organization.careersPage ?? "");
    if (!normalizedCareers) {
      continue;
    }

    const queuedItem = await addToQueue({
      payload: {
        organizationId: organization.id,
        careersUrl: normalizedCareers,
        companyName: organization.name,
      },
      agent: "jobBoardAgent",
      maxRetries: 3,
    });

    queued.push({
      id: queuedItem.id,
      organization: organization.name,
      action: "jobBoardAgent",
    });

    activeJobBoardQueueKeys.add(`org:${organization.id}`);
    activeJobBoardQueueKeys.add(`careers:${normalizedCareers}`);
  }

  return {
    seeded: insertedSeeds,
    totalSeeds: DEFAULT_ORGANIZATIONS.length,
    queued: queued.length,
    queuedCount,
    jobCount,
    queueItems: queued,
  };
};

export const seedDefaultSources = async (options: SeedOptions = {}) => {
  const [existingSources, existingQueueItems, queuedCount, jobCount] = await Promise.all([
    db.select({
      website: sources.website,
      portfolio: sources.portfolio,
    }).from(sources),
    db.select({
      agent: queues.agent,
      status: queues.status,
      payload: queues.payload,
    }).from(queues),
    db.$count(queues),
    db.$count(jobs),
  ]);

  const existingKeys = new Set(
    existingSources
      .flatMap((source) => [source.website, source.portfolio])
      .map((value) => normalizeSourceUrl(value ?? ""))
      .filter(Boolean),
  );
  const activeSourceQueueItems = existingQueueItems.filter(
    (item) => item.agent === "sourceAgent" && (item.status === "queued" || item.status === "in_progress"),
  );

  if (!options.force && queuedCount >= MAX_QUEUE_BACKLOG_BEFORE_SEEDING) {
    return {
      seeded: 0,
      skipped: DEFAULT_SOURCES.length,
      reason: "queue-backlog-too-high",
      queuedCount,
      jobCount,
      activeSourceQueueCount: activeSourceQueueItems.length,
      remainingSources: DEFAULT_SOURCES.length,
      queued: [],
    };
  }

  const queuedSourceKeys = new Set(
    activeSourceQueueItems.flatMap((item) => {
      const payload = item.payload as { home?: string; portfolio?: string } | null;
      return [payload?.home, payload?.portfolio]
        .map((value) => normalizeSourceUrl(value ?? ""))
        .filter(Boolean) as string[];
    }),
  );

  const sourcesToQueue = options.force
    ? DEFAULT_SOURCES
    : DEFAULT_SOURCES.filter(
        (source) =>
          !existingKeys.has(normalizeSourceUrl(source.home)) &&
          !existingKeys.has(normalizeSourceUrl(source.portfolio)) &&
          !queuedSourceKeys.has(normalizeSourceUrl(source.home)) &&
          !queuedSourceKeys.has(normalizeSourceUrl(source.portfolio)),
      );
  const remainingCapacity = Math.max(0, SOURCE_SEED_BATCH_SIZE - activeSourceQueueItems.length);
  const queueBatch = options.force
    ? sourcesToQueue
    : sourcesToQueue.slice(0, remainingCapacity);

  const queued = [];
  for (const source of queueBatch) {
    const queuedItem = await addToQueue({
      payload: {
        home: source.home,
        portfolio: source.portfolio,
        kind: source.kind,
      },
      agent: "sourceAgent",
    });

    queued.push({
      id: queuedItem.id,
      source: source.name,
    });
  }

  return {
    seeded: queued.length,
    skipped: DEFAULT_SOURCES.length - queued.length,
    reason: queued.length > 0
      ? "queued"
      : sourcesToQueue.length > 0 && remainingCapacity === 0 && !options.force
        ? "source-capacity-reached"
        : "already-seeded",
    queuedCount,
    jobCount,
    activeSourceQueueCount: activeSourceQueueItems.length,
    remainingSources: Math.max(0, sourcesToQueue.length - queueBatch.length),
    queued,
  };
};
