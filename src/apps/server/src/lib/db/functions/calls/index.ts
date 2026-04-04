/*
const calls = pgTable("llm-calls", {
  id: serial("id").primaryKey(),
  payload: jsonb().notNull(),
  queueId: integer("queue_id").references(() => queues.id).notNull(),
  agent: text().notNull(),
  usage: jsonb().notNull().default([]),
  result: jsonb().notNull().default([]),
  logs: jsonb().notNull().default([]),
  errors: jsonb().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
*/
import { eq } from "drizzle-orm";
import { db, calls } from "@/lib/db/runtime";
import { z } from "zod";
import { AppError, ERROR_CODES } from "@/lib/errors";

const jsonbSchema = z.union([z.array(z.any()), z.any()]);

const createCallSchema = z.object({
  queueId: z.number(),
  payload: jsonbSchema,
  agent: z.string(),
  usage: jsonbSchema,
  result: jsonbSchema,
  logs: jsonbSchema,
  errors: jsonbSchema,
});

type CreateCallType = z.infer<typeof createCallSchema>;

const createCall = async (args: CreateCallType) => {
  const response = await db.insert(calls).values(args).returning();
  if (!response[0]) throw new AppError(ERROR_CODES.DB_INSERT_FAILED, "Failed to create call item", {
    ...args
  });
  return response[0];
};

const updateCallSchema = z.object({
  id: z.number(),
  usage: jsonbSchema,
  result: jsonbSchema,
  logs: jsonbSchema,
  errors: jsonbSchema
});

type UpdateCall = z.infer<typeof updateCallSchema>;

const updateCall = async (args: UpdateCall) => {
  const { usage, result, logs, errors } = args;
  const response = await db.update(calls).set({ usage, result, logs, errors }).where(eq(calls.id, args.id)).returning();
  if (!response[0]) throw new AppError(ERROR_CODES.DB_QUERY_FAILED, "Failed to update ", {
    ...args
  });
  return response[0];
};

export { createCall, updateCall, CreateCallType };
