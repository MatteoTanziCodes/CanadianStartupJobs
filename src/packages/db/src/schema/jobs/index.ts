import {
  sqliteTable,
  text,
  integer,
} from "drizzle-orm/sqlite-core";
import {
  jobsRoles,
  jobsJobTypes,
  jobsProvinces,
  jobsIndustries,
  jobsExperienceLevels,
  jobsJobsCaches,
} from "./pivots";
import {
  booleanColumn,
  idColumn,
  timestampColumn,
  timestampNowColumn,
} from "../helpers";

const jobs = sqliteTable("jobs", {
  id: idColumn(),
  title: text("title").notNull(),
  city: text("city").notNull(),
  province: text("province").notNull(),
  remoteOk: booleanColumn("remote_ok").notNull(),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  description: text("description").notNull(),
  company: text("company").notNull(),
  jobBoardUrl: text("job_board_url"),
  postingUrl: text("posting_url"),
  isAtAStartup: booleanColumn("is_at_a_startup"),
  lastScrapedMarkdown: text("last_scraped_markdown"), // For vector search
  createdAt: timestampNowColumn("created_at"),
  updatedAt: timestampNowColumn("updated_at"),
});

const jobCaches = sqliteTable("job_caches", {
  id: idColumn(),
  url: text("url").notNull(),
  freshTil: timestampColumn("fresh_til"),
  lastHash: text("last_hash"),
  lastScrapedAt: timestampNowColumn("last_scraped_at"),
  lastCheckedAt: timestampNowColumn("last_checked_at"),
});

export {
  jobs,
  jobCaches,
  jobsRoles,
  jobsJobTypes,
  jobsProvinces,
  jobsIndustries,
  jobsExperienceLevels,
  jobsJobsCaches,
};
