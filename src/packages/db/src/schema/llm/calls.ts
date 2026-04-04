import {
  sqliteTable,
  text,
  integer,
} from "drizzle-orm/sqlite-core";
import { queues } from "./queues";
import { idColumn, timestampNowColumn } from "../helpers";

const calls = sqliteTable("llm-calls", {
  id: idColumn(),
  payload: text("payload", { mode: "json" }).notNull(),
  queueId: integer("queue_id").references(() => queues.id).notNull(),
  agent: text().notNull(),
  usage: text("usage", { mode: "json" }).notNull().default("[]"),
  result: text("result", { mode: "json" }).notNull().default("[]"),
  logs: text("logs", { mode: "json" }).notNull().default("[]"),
  errors: text("errors", { mode: "json" }).notNull().default("[]"),
  createdAt: timestampNowColumn("created_at"),
  updatedAt: timestampNowColumn("updated_at"),
});

export { calls };
