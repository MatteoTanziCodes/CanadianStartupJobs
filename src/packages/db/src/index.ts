import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  organizations,
  jobBoardCaches,
  orgsSizes,
  orgsStages,
  orgsProvinces,
  orgsIndustries,
  orgsJobs,
   orgsJobBoardCaches,
  jobs,
  jobCaches,
  jobsRoles,
  jobsJobTypes,
  jobsProvinces,
  jobsIndustries,
  jobsExperienceLevels,
  jobsJobsCaches,
  provinces,
  jobTypes,
  experienceLevels,
  industries,
  roles,
  teamSize,
  raisingStage,
  sources,
  portfolioCaches,
  sourcesPortfolioCaches,
  calls,
  queues
} from "./schema/index";
import { createSchemaFactory } from "drizzle-zod";
const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  coerce: {
    date: true
  }
});
const schemas = {
  organizations: {
    select: createSelectSchema(organizations),
    insert: createInsertSchema(organizations),
    update: createUpdateSchema(organizations),
  },
  jobBoardCaches: {
    select: createSelectSchema(jobBoardCaches),
    insert: createInsertSchema(jobBoardCaches),
    update: createUpdateSchema(jobBoardCaches),
  },
  orgsSizes: {
    select: createSelectSchema(orgsSizes),
    insert: createInsertSchema(orgsSizes),
    update: createUpdateSchema(orgsSizes),
  },
  orgsStages: {
    select: createSelectSchema(orgsStages),
    insert: createInsertSchema(orgsStages),
    update: createUpdateSchema(orgsStages),
  },
  orgsProvinces: {
    select: createSelectSchema(orgsProvinces),
    insert: createInsertSchema(orgsProvinces),
    update: createUpdateSchema(orgsProvinces),
  },
  orgsIndustries: {
    select: createSelectSchema(orgsIndustries),
    insert: createInsertSchema(orgsIndustries),
    update: createUpdateSchema(orgsIndustries),
  },
  orgsJobs: {
    select: createSelectSchema(orgsJobs),
    insert: createInsertSchema(orgsJobs),
    update: createUpdateSchema(orgsJobs),
  },
  orgsJobBoardCaches: {
    select: createSelectSchema(orgsJobBoardCaches),
    insert: createInsertSchema(orgsJobBoardCaches),
    update: createUpdateSchema(orgsJobBoardCaches),
  },
  // Additional schemas mirroring the imports from ./schema/index
  jobs: {
    select: createSelectSchema(jobs),
    insert: createInsertSchema(jobs),
    update: createUpdateSchema(jobs),
  },
  jobCaches: {
    select: createSelectSchema(jobCaches),
    insert: createInsertSchema(jobCaches),
    update: createUpdateSchema(jobCaches),
  },
  jobsRoles: {
    select: createSelectSchema(jobsRoles),
    insert: createInsertSchema(jobsRoles),
    update: createUpdateSchema(jobsRoles),
  },
  jobsJobTypes: {
    select: createSelectSchema(jobsJobTypes),
    insert: createInsertSchema(jobsJobTypes),
    update: createUpdateSchema(jobsJobTypes),
  },
  jobsProvinces: {
    select: createSelectSchema(jobsProvinces),
    insert: createInsertSchema(jobsProvinces),
    update: createUpdateSchema(jobsProvinces),
  },
  jobsIndustries: {
    select: createSelectSchema(jobsIndustries),
    insert: createInsertSchema(jobsIndustries),
    update: createUpdateSchema(jobsIndustries),
  },
  jobsExperienceLevels: {
    select: createSelectSchema(jobsExperienceLevels),
    insert: createInsertSchema(jobsExperienceLevels),
    update: createUpdateSchema(jobsExperienceLevels),
  },
  jobsJobsCaches: {
    select: createSelectSchema(jobsJobsCaches),
    insert: createInsertSchema(jobsJobsCaches),
    update: createUpdateSchema(jobsJobsCaches),
  },
  provinces: {
    select: createSelectSchema(provinces),
    insert: createInsertSchema(provinces),
    update: createUpdateSchema(provinces),
  },
  jobTypes: {
    select: createSelectSchema(jobTypes),
    insert: createInsertSchema(jobTypes),
    update: createUpdateSchema(jobTypes),
  },
  experienceLevels: {
    select: createSelectSchema(experienceLevels),
    insert: createInsertSchema(experienceLevels),
    update: createUpdateSchema(experienceLevels),
  },
  industries: {
    select: createSelectSchema(industries),
    insert: createInsertSchema(industries),
    update: createUpdateSchema(industries),
  },
  roles: {
    select: createSelectSchema(roles),
    insert: createInsertSchema(roles),
    update: createUpdateSchema(roles),
  },
  teamSize: {
    select: createSelectSchema(teamSize),
    insert: createInsertSchema(teamSize),
    update: createUpdateSchema(teamSize),
  },
  raisingStage: {
    select: createSelectSchema(raisingStage),
    insert: createInsertSchema(raisingStage),
    update: createUpdateSchema(raisingStage),
  },
  sources: {
    select: createSelectSchema(sources),
    insert: createInsertSchema(sources),
    update: createUpdateSchema(sources),
  },
  portfolioCaches: {
    select: createSelectSchema(portfolioCaches),
    insert: createInsertSchema(portfolioCaches),
    update: createUpdateSchema(portfolioCaches),
  },
  sourcesPortfolioCaches: {
    select: createSelectSchema(sourcesPortfolioCaches),
    insert: createInsertSchema(sourcesPortfolioCaches),
    update: createUpdateSchema(sourcesPortfolioCaches),
  },
  calls: {
    select: createSelectSchema(calls),
    insert: createInsertSchema(calls),
    update: createUpdateSchema(calls),
  },
  queues: {
    select: createSelectSchema(queues),
    insert: createInsertSchema(queues),
    update: createUpdateSchema(queues),
  },
};

// Get database connection string from environment variables
const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER || "postgres"}:${process.env.POSTGRES_PASSWORD || "postgres"}@${process.env.POSTGRES_HOST || "localhost"}:${process.env.POSTGRES_PORT || "5433"}/${process.env.POSTGRES_DB || "canadian_startup_db"}`;

const databaseUrl = process.env.DB_SCHEMA
  ? `${connectionString}${connectionString.includes("?") ? "&" : "?"}options=-c%20search_path%3D${process.env.DB_SCHEMA}`
  : connectionString;

const client = neon(databaseUrl);

// Create drizzle instance
export const db = drizzle(client, {
  schema: {
    organizations,
    jobBoardCaches,
    orgsSizes,
    orgsStages,
    orgsProvinces,
    orgsIndustries,
    orgsJobs,
    orgsJobBoardCaches,
    jobs,
    jobCaches,
    jobsRoles,
    jobsJobTypes,
    jobsProvinces,
    jobsIndustries,
    jobsExperienceLevels,
    jobsJobsCaches,
    provinces,
    jobTypes,
    experienceLevels,
    industries,
    roles,
    teamSize,
    raisingStage,
    sources,
    portfolioCaches,
    sourcesPortfolioCaches,
    calls,
    queues
  },
});

// Export schema for use in other services
export * from "./schema/index";
export {
  schemas,
  organizations,
  jobBoardCaches,
  orgsSizes,
  orgsStages,
  orgsProvinces,
  orgsIndustries,
  orgsJobs,
  orgsJobBoardCaches,
  jobs,
  jobCaches,
  jobsRoles,
  jobsJobTypes,
  jobsProvinces,
  jobsIndustries,
  jobsExperienceLevels,
  jobsJobsCaches,
  provinces,
  jobTypes,
  experienceLevels,
  industries,
  roles,
  teamSize,
  raisingStage,
  sources,
  portfolioCaches,
  sourcesPortfolioCaches,
  calls,
  queues
};

// Export types
export type Database = typeof db;
