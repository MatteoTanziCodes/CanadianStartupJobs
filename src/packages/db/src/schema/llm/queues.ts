import {
  sqliteTable,
  text,
  integer,
} from "drizzle-orm/sqlite-core";
import { idColumn, timestampNowColumn } from "../helpers";

const queues = sqliteTable("llm-queues", {
  id: idColumn(),
  payload: text("payload", { mode: "json" }).notNull(),
  agent: text().notNull(),
  status: text().notNull(),
  retryCount: integer("retry_count").default(0).notNull(),
  maxRetries: integer("max_retries").default(3).notNull(),
  deferredCount: integer("deferred_count").default(0).notNull(),
  createdAt: timestampNowColumn("created_at"),
  updatedAt: timestampNowColumn("updated_at"),
});

export { queues };
