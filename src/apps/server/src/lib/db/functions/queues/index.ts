import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, queues, schemas, sources } from "@/lib/db/runtime";
import { z } from "zod";
import { AppError, ERROR_CODES } from "@/lib/errors";

const DISCOVERY_SOURCE_THRESHOLD = 20;

const getNextQueuedItem = async () => {
  const sourceCount = await db.$count(sources);
  const discoveryFirst = sourceCount < DISCOVERY_SOURCE_THRESHOLD;
  const prioritySql = discoveryFirst
    ? sql`CASE
        WHEN ${queues.agent} = 'sourceAgent' THEN 1
        WHEN ${queues.agent} = 'portfolioLinksAgent' THEN 2
        WHEN ${queues.agent} = 'organizationAgent' THEN 3
        WHEN ${queues.agent} = 'qualificationAgent' THEN 4
        WHEN ${queues.agent} = 'jobBoardAgent' THEN 5
        WHEN ${queues.agent} = 'jobAgent' THEN 6
      END`
    : sql`CASE
        WHEN ${queues.agent} = 'jobAgent' THEN 1
        WHEN ${queues.agent} = 'jobBoardAgent' THEN 2
        WHEN ${queues.agent} = 'qualificationAgent' THEN 3
        WHEN ${queues.agent} = 'organizationAgent' THEN 4
        WHEN ${queues.agent} = 'portfolioLinksAgent' THEN 5
        WHEN ${queues.agent} = 'sourceAgent' THEN 6
      END`;

  const response = await db.select().from(queues).where(eq(queues.status, "queued")).orderBy(
    prioritySql,
    asc(queues.createdAt),
  ).limit(1);
  if (!response[0]) throw new AppError(ERROR_CODES.DB_QUERY_FAILED, "No remaining tasks");
  return response[0];
};

const jsonbSchema = z.union([z.array(z.any()), z.any()]);

const ACTIVE_QUEUE_STATUSES = ["queued", "in_progress"] as const;

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nestedValue]) => `${JSON.stringify(key)}:${stableStringify(nestedValue)}`);
    return `{${entries.join(",")}}`;
  }

  return JSON.stringify(value);
};

const addToQueueSchema = z.object({
  payload: jsonbSchema,
  agent: z.string(),
  maxRetries: z.number().int().positive().optional(),
});

type AddToQueueArgs = z.infer<typeof addToQueueSchema>;

const addToQueue = async (args: AddToQueueArgs) => {
  const { payload, agent, maxRetries } = args;
  const nextPayloadKey = stableStringify(payload);

  const activeMatches = await db.select().from(queues).where(
    and(
      eq(queues.agent, agent),
      inArray(queues.status, [...ACTIVE_QUEUE_STATUSES]),
    ),
  );

  const existing = activeMatches.find((item) => stableStringify(item.payload) === nextPayloadKey);
  if (existing) {
    return existing;
  }

  const uploadValues = {
    payload,
    agent,
    status: "queued",
    retryCount: 0,
    ...(maxRetries ? { maxRetries } : {}),
  };
  const response = await db.insert(queues).values(uploadValues).returning();
  if (!response[0]) throw new AppError(ERROR_CODES.DB_INSERT_FAILED, "Couldn't queue task", {
    payload,
    agent,
    maxRetries,
  });
  return response[0];
}

const queueStatusEnum = z.enum(["queued", "in_progress", "failed", "cancelled", "done"]);

const updateQueuedItemStatusSchema = z.object({
  id: z.number(),
  status: queueStatusEnum,
  retryCount: z.number().optional(),
});

type UpdateQueuedItemStatusArgs = z.infer<typeof updateQueuedItemStatusSchema>;

const updateStatus = async (args: UpdateQueuedItemStatusArgs) => {
  const { id, status, retryCount } = args;
  const updateData: { status: string, retryCount?: number } = { status };
  if (retryCount !== undefined) updateData.retryCount = retryCount;
  const response = await db.update(queues).set(updateData).where(eq(queues.id, args.id)).returning();
  if (!response[0]) throw new AppError(ERROR_CODES.DB_INSERT_FAILED, "Couldn't queue task", {
    id,
    status,
    retryCount
  });
  return response[0];
};

const resetFailedQueuedItems = async (args: {
  agents?: string[];
} = {}) => {
  const failedItems = await db.select().from(queues).where(eq(queues.status, "failed"));
  const matchingItems = args.agents?.length
    ? failedItems.filter((item) => args.agents?.includes(item.agent))
    : failedItems;

  if (matchingItems.length === 0) {
    return [];
  }

  const resetItems = [];
  for (const item of matchingItems) {
    const [updated] = await db.update(queues)
      .set({ status: "queued", retryCount: 0 })
      .where(eq(queues.id, item.id))
      .returning();

    if (updated) {
      resetItems.push(updated);
    }
  }

  return resetItems;
};

export type GetNextQueuedItem = Awaited<ReturnType<typeof getNextQueuedItem>>;
export type QueuedItem = GetNextQueuedItem;

export const queuedItemSchema = schemas.queues.select;

export { getNextQueuedItem, addToQueue, updateStatus, resetFailedQueuedItems };
