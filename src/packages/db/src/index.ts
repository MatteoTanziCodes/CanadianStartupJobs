import { drizzle } from "drizzle-orm/d1";
import {
  organizations,
  organizationSeeds,
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
  pageCaches,
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
  organizationSeeds: {
    select: createSelectSchema(organizationSeeds),
    insert: createInsertSchema(organizationSeeds),
    update: createUpdateSchema(organizationSeeds),
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
  pageCaches: {
    select: createSelectSchema(pageCaches),
    insert: createInsertSchema(pageCaches),
    update: createUpdateSchema(pageCaches),
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
const schema = {
  organizations,
  organizationSeeds,
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
  pageCaches,
  calls,
  queues,
};

export const createDb = (database: any) => drizzle(database, { schema });

// Export schema for use in other services
export * from "./schema/index";
export {
  schema,
  schemas,
  organizations,
  organizationSeeds,
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
  pageCaches,
  calls,
  queues
};

// Export types
export type Database = ReturnType<typeof createDb>;
