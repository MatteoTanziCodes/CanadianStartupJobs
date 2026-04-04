import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
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
  canonicalDomain: text("canonical_domain"),
  careersDomain: text("careers_domain"),
  careersCandidates: text("careers_candidates", { mode: "json" }),
  careersProvider: text("careers_provider"),
  careersDiscoveryMethod: text("careers_discovery_method"),
  careersConfidence: integer("careers_confidence").notNull().default(0),
  qualificationStatus: text("qualification_status").notNull().default("pending"),
  ownershipStatus: text("ownership_status").notNull().default("unknown"),
  operationsStatus: text("operations_status").notNull().default("unknown"),
  canadianConfidence: integer("canadian_confidence").notNull().default(0),
  qualificationEvidenceSummary: text("qualification_evidence_summary"),
  evidenceUrls: text("evidence_urls", { mode: "json" }),
  reviewReason: text("review_reason"),
  lastQualifiedAt: timestampColumn("last_qualified_at"),
  lastCareersValidatedAt: timestampColumn("last_careers_validated_at"),
  lastSeenAt: timestampColumn("last_seen_at"),
  createdAt: timestampNowColumn("created_at"),
  updatedAt: timestampNowColumn("updated_at"),
});

const organizationSeeds = sqliteTable("organization_seeds", {
  id: idColumn(),
  name: text("name").notNull(),
  website: text("website").notNull(),
  canonicalDomain: text("canonical_domain"),
  priority: integer("priority").notNull().default(100),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
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
  organizationSeeds,
  jobBoardCaches,
  orgsSizes,
  orgsStages,
  orgsProvinces,
  orgsIndustries,
  orgsJobs,
  orgsJobBoardCaches,
};
