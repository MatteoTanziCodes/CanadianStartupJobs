import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { idColumn, timestampColumn, timestampNowColumn } from "../helpers";

const pageCaches = sqliteTable("page_caches", {
  id: idColumn(),
  kind: text("kind").notNull(),
  url: text("url").notNull(),
  markdown: text("markdown"),
  links: text("links", { mode: "json" }),
  contentHash: text("content_hash"),
  status: text("status").notNull().default("fresh"),
  lastError: text("last_error"),
  freshTil: timestampColumn("fresh_til"),
  lastScrapedAt: timestampNowColumn("last_scraped_at"),
  lastCheckedAt: timestampNowColumn("last_checked_at"),
  createdAt: timestampNowColumn("created_at"),
  updatedAt: timestampNowColumn("updated_at"),
});

export { pageCaches };
