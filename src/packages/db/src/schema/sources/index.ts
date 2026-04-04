import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sourcesPortfolioCaches } from "./pivots";
import { idColumn, timestampColumn, timestampNowColumn } from "../helpers";

const sources = sqliteTable("sources", {
  id: idColumn(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  website: text("website"),
  portfolio: text("portfolio"),
  createdAt: timestampNowColumn("created_at"),
  updatedAt: timestampNowColumn("updated_at"),
});

const portfolioCaches = sqliteTable("portfolio_caches", {
  id: idColumn(),
  url: text("url").notNull(),
  freshTil: timestampColumn("fresh_til"),
  lastHash: text("last_hash"),
  lastScrapedAt: timestampNowColumn("last_scraped_at"),
  lastCheckedAt: timestampNowColumn("last_checked_at"),
});

export { sources, portfolioCaches, sourcesPortfolioCaches };
