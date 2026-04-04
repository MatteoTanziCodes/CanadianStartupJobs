import { eq, asc, sql } from "drizzle-orm";
import { db, queues, schemas } from "@/lib/db/runtime";
import { z } from "zod";
import { AppError, ERROR_CODES } from "@/lib/errors";

const getNextQueuedItem = async () => {
  const response = await db.select().from(queues).where(eq(queues.status, "queued")).orderBy(sql`CASE
    WHEN ${queues.agent} = 'jobAgent' THEN 1
    WHEN ${queues.agent} = 'jobBoardAgent' THEN 2
    WHEN ${queues.agent} = 'organizationAgent' THEN 3
    WHEN ${queues.agent} = 'portfolioLinksAgent' THEN 4
    WHEN ${queues.agent} = 'sourceAgent' THEN 5
  END`,
  asc(queues.createdAt)).limit(1);
  if (!response[0]) throw new AppError(ERROR_CODES.DB_QUERY_FAILED, "No remaining tasks");
  return response[0];
};

const jsonbSchema = z.union([z.array(z.any()), z.any()]);

const addToQueueSchema = z.object({
  payload: jsonbSchema,
  agent: z.string(),
});

type AddToQueueArgs = z.infer<typeof addToQueueSchema>;

const addToQueue = async (args: AddToQueueArgs) => {
  const { payload, agent } = args;
  const uploadValues = {
    payload,
    agent,
    status: "queued",
    retryCount: 0
  };
  const response = await db.insert(queues).values(uploadValues).returning();
  if (!response[0]) throw new AppError(ERROR_CODES.DB_INSERT_FAILED, "Couldn't queue task", {
    payload,
    agent
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

export type GetNextQueuedItem = Awaited<ReturnType<typeof getNextQueuedItem>>;
export type QueuedItem = GetNextQueuedItem;

export const queuedItemSchema = schemas.queues.select;

export { getNextQueuedItem, addToQueue, updateStatus };
