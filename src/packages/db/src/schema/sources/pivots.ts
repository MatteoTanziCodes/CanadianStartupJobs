import { sqliteTable, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { sources, portfolioCaches } from "./index";

const sourcesPortfolioCaches = sqliteTable(
  "sources_portfolio_caches",
  {
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id),
    portfolioCacheId: integer("portfolio_cache_id")
      .notNull()
      .references(() => portfolioCaches.id),
  },
  (t) => [
    {
      pk: primaryKey({ columns: [t.sourceId, t.portfolioCacheId] }),
    },
  ],
);

export { sourcesPortfolioCaches };
