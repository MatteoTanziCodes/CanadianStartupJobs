import { addToQueue } from "@/lib/db/functions/queues";
import { db, jobs, queues, sources } from "@/lib/db/runtime";
import { DEFAULT_SOURCES } from "./defaultSources";

type SeedOptions = {
  force?: boolean;
};

export const seedDefaultSources = async (options: SeedOptions = {}) => {
  const [existingSources, queuedCount, jobCount] = await Promise.all([
    db.select({
      website: sources.website,
      portfolio: sources.portfolio,
    }).from(sources),
    db.$count(queues),
    db.$count(jobs),
  ]);

  const existingKeys = new Set(
    existingSources.flatMap((source) => [source.website, source.portfolio]).filter(Boolean),
  );

  const sourcesToQueue = options.force
    ? DEFAULT_SOURCES
    : DEFAULT_SOURCES.filter(
        (source) =>
          !existingKeys.has(source.home) &&
          !existingKeys.has(source.portfolio),
      );

  if (!options.force && queuedCount > 0) {
    return {
      seeded: 0,
      skipped: DEFAULT_SOURCES.length,
      reason: "queue-not-empty",
      queuedCount,
      jobCount,
    };
  }

  const queued = [];
  for (const source of sourcesToQueue) {
    const queuedItem = await addToQueue({
      payload: {
        home: source.home,
        portfolio: source.portfolio,
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
    reason: queued.length > 0 ? "queued" : "already-seeded",
    queuedCount,
    jobCount,
    queued,
  };
};
