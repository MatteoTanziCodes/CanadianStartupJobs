import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import {
  orgsSizes,
  orgsStages,
  orgsProvinces,
  orgsIndustries,
  orgsJobs,
  orgsJobBoardCaches,
} from "./pivots";
import { idColumn, timestampColumn, timestampNowColumn } from "../helpers";

const organizations = sqliteTable("organizations", {
  id: idColumn(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  province: text("province").notNull(),
  description: text("description").notNull(),
  website: text("website"),
  careersPage: text("careers_page"),
  industry: text("industry"),
  createdAt: timestampNowColumn("created_at"),
  updatedAt: timestampNowColumn("updated_at"),
});

const jobBoardCaches = sqliteTable("job_board_caches", {
  id: idColumn(),
  url: text("url").notNull(),
  freshTil: timestampColumn("fresh_til"),
  lastHash: text("last_hash"),
  lastScrapedAt: timestampNowColumn("last_scraped_at"),
  lastCheckedAt: timestampNowColumn("last_checked_at"),
});


export {
  organizations,
  jobBoardCaches,
  orgsSizes,
  orgsStages,
  orgsProvinces,
  orgsIndustries,
  orgsJobs,
  orgsJobBoardCaches,
};
