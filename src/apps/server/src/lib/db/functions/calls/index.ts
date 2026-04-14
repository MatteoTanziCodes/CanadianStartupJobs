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
const MAX_STRING_LENGTH = 1_200;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 20;
const MAX_ERROR_STACK_LENGTH = 1_500;

const compactErrorValue = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  const compacted: Record<string, unknown> = {};

  if ("message" in record) {
    compacted.message = sanitizeForStorage(record.message, 1);
  }

  if ("stack" in record && typeof record.stack === "string") {
    compacted.stack =
      record.stack.length <= MAX_ERROR_STACK_LENGTH
        ? record.stack
        : `${record.stack.slice(0, MAX_ERROR_STACK_LENGTH)}… [truncated ${record.stack.length - MAX_ERROR_STACK_LENGTH} chars]`;
  }

  if ("code" in record) {
    compacted.code = sanitizeForStorage(record.code, 1);
  }

  if ("name" in record) {
    compacted.name = sanitizeForStorage(record.name, 1);
  }

  if (Object.keys(compacted).length > 0) {
    return compacted;
  }

  return value;
};

const sanitizeForStorage = (value: unknown, depth = 0): unknown => {
  if (value == null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value.length <= MAX_STRING_LENGTH) {
      return value;
    }

    return `${value.slice(0, MAX_STRING_LENGTH)}… [truncated ${value.length - MAX_STRING_LENGTH} chars]`;
  }

  if (depth >= 4) {
    return "[truncated nested value]";
  }

  if (Array.isArray(value)) {
    const sanitizedItems = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeForStorage(compactErrorValue(item), depth + 1));

    if (value.length > MAX_ARRAY_ITEMS) {
      sanitizedItems.push(`[truncated ${value.length - MAX_ARRAY_ITEMS} items]`);
    }

    return sanitizedItems;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const sanitizedEntries = entries
      .slice(0, MAX_OBJECT_KEYS)
      .map(([key, nestedValue]) => [key, sanitizeForStorage(nestedValue, depth + 1)] as const);

    if (entries.length > MAX_OBJECT_KEYS) {
      sanitizedEntries.push(["_truncatedKeys", entries.length - MAX_OBJECT_KEYS]);
    }

    return Object.fromEntries(sanitizedEntries);
  }

  return String(value);
};

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
  const sanitizedArgs = {
    ...args,
    payload: sanitizeForStorage(args.payload),
    usage: sanitizeForStorage(args.usage),
    result: sanitizeForStorage(args.result),
    logs: sanitizeForStorage(args.logs),
    errors: sanitizeForStorage(args.errors),
  };
  const response = await db.insert(calls).values(sanitizedArgs).returning();
  if (!response[0]) throw new AppError(ERROR_CODES.DB_INSERT_FAILED, "Failed to create call item", {
    ...sanitizedArgs
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
  const usage = sanitizeForStorage(args.usage);
  const result = sanitizeForStorage(args.result);
  const logs = sanitizeForStorage(args.logs);
  const errors = sanitizeForStorage(args.errors);

  let response;
  try {
    response = await db.update(calls).set({ usage, result, logs, errors }).where(eq(calls.id, args.id)).returning();
  } catch (error) {
    const fallbackErrors = sanitizeForStorage([
      {
        message: "Call update payload exceeded storage limits",
        originalError: error instanceof Error ? error.message : String(error),
      },
    ]);

    response = await db
      .update(calls)
      .set({
        usage: [],
        result: [],
        logs: ["call update payload truncated due to storage limits"],
        errors: fallbackErrors,
      })
      .where(eq(calls.id, args.id))
      .returning();
  }

  if (!response[0]) throw new AppError(ERROR_CODES.DB_QUERY_FAILED, "Failed to update ", {
    ...args
  });
  return response[0];
};

export { createCall, updateCall, CreateCallType };
