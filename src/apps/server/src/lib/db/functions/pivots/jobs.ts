import { and, eq, asc, desc } from "drizzle-orm";
import {
  type Database,
  db,
  isDatabase,
  jobsExperienceLevels,
  jobsIndustries,
  jobsJobsCaches,
  jobsJobTypes,
  jobsProvinces,
  jobsRoles,
} from "@/lib/db/runtime";

const getByPivot = async (
  db: Database,
  table: typeof jobsExperienceLevels,
  column: typeof jobsExperienceLevels.jobId | typeof jobsExperienceLevels.experienceLevelId,
  value: number,
  orderBy: ReturnType<typeof asc>,
  skip?: number,
  take?: number,
) =>
  db
    .select()
    .from(table)
    .where(eq(column as any, value))
    .orderBy(orderBy)
    .limit(take ?? 10)
    .offset(skip ?? 0);

const addPivotRow = async (
  database: Database,
  table: typeof jobsExperienceLevels,
  values: Record<string, number>,
) => {
  const result = await database.insert(table).values(values as any).onConflictDoNothing().returning();
  return result[0] ?? null;
};

const withDb = <TArgs extends unknown[], TResult>(
  handler: (database: Database, ...args: TArgs) => TResult,
) => {
  return (...args: [Database, ...TArgs] | TArgs): TResult => {
    if (isDatabase(args[0])) {
      const [database, ...rest] = args as [Database, ...TArgs];
      return handler(database, ...rest);
    }
    return handler(db, ...(args as TArgs));
  };
};

const industry = {
  get_by_job: (db: Database, jobId: number, skip?: number, take?: number) =>
    getByPivot(db, jobsIndustries as any, jobsIndustries.jobId as any, jobId, asc(jobsIndustries.jobId), skip, take),
  get_by_industry: (db: Database, industryId: number, skip?: number, take?: number) =>
    getByPivot(
      db,
      jobsIndustries as any,
      jobsIndustries.industryId as any,
      industryId,
      desc(jobsIndustries.industryId),
      skip,
      take,
    ),
  add: withDb((database, jobId: number, industryId: number) =>
    addPivotRow(database, jobsIndustries as any, { jobId, industryId })),
};

const experienceLevel = {
  get_by_job: (db: Database, jobId: number, skip?: number, take?: number) =>
    getByPivot(
      db,
      jobsExperienceLevels as any,
      jobsExperienceLevels.jobId as any,
      jobId,
      asc(jobsExperienceLevels.jobId),
      skip,
      take,
    ),
  get_by_experienceLevel: (db: Database, experienceLevelId: number, skip?: number, take?: number) =>
    getByPivot(
      db,
      jobsExperienceLevels as any,
      jobsExperienceLevels.experienceLevelId as any,
      experienceLevelId,
      desc(jobsExperienceLevels.experienceLevelId),
      skip,
      take,
    ),
  add: withDb((database, jobId: number, experienceLevelId: number) =>
    addPivotRow(database, jobsExperienceLevels as any, { jobId, experienceLevelId })),
};

const jobCache = {
  get_by_job: (db: Database, jobId: number, skip?: number, take?: number) =>
    getByPivot(db, jobsJobsCaches as any, jobsJobsCaches.jobId as any, jobId, asc(jobsJobsCaches.jobId), skip, take),
  get_by_jobCache: (db: Database, jobCacheId: number, skip?: number, take?: number) =>
    getByPivot(
      db,
      jobsJobsCaches as any,
      jobsJobsCaches.jobCacheId as any,
      jobCacheId,
      desc(jobsJobsCaches.jobCacheId),
      skip,
      take,
    ),
  add: withDb((database, jobId: number, jobCacheId: number) =>
    addPivotRow(database, jobsJobsCaches as any, { jobId, jobCacheId })),
};

const jobType = {
  get_by_job: (db: Database, jobId: number, skip?: number, take?: number) =>
    getByPivot(db, jobsJobTypes as any, jobsJobTypes.jobId as any, jobId, asc(jobsJobTypes.jobId), skip, take),
  get_by_jobType: (db: Database, jobTypeId: number, skip?: number, take?: number) =>
    getByPivot(
      db,
      jobsJobTypes as any,
      jobsJobTypes.jobTypeId as any,
      jobTypeId,
      desc(jobsJobTypes.jobTypeId),
      skip,
      take,
    ),
  add: withDb((database, jobId: number, jobTypeId: number) =>
    addPivotRow(database, jobsJobTypes as any, { jobId, jobTypeId })),
};

const provinces = {
  get_by_job: (db: Database, jobId: number, skip?: number, take?: number) =>
    getByPivot(db, jobsProvinces as any, jobsProvinces.jobId as any, jobId, asc(jobsProvinces.jobId), skip, take),
  get_by_province: (db: Database, provinceId: number, skip?: number, take?: number) =>
    getByPivot(
      db,
      jobsProvinces as any,
      jobsProvinces.provinceId as any,
      provinceId,
      desc(jobsProvinces.provinceId),
      skip,
      take,
    ),
  add: withDb((database, jobId: number, provinceId: number) =>
    addPivotRow(database, jobsProvinces as any, { jobId, provinceId })),
};

const roles = {
  get_by_job: (db: Database, jobId: number, skip?: number, take?: number) =>
    getByPivot(db, jobsRoles as any, jobsRoles.jobId as any, jobId, asc(jobsRoles.jobId), skip, take),
  get_by_role: (db: Database, roleId: number, skip?: number, take?: number) =>
    getByPivot(db, jobsRoles as any, jobsRoles.roleId as any, roleId, desc(jobsRoles.roleId), skip, take),
  add: withDb((database, jobId: number, roleId: number) =>
    addPivotRow(database, jobsRoles as any, { jobId, roleId })),
};

const jobPivots = { industry, experienceLevel, jobCache, jobType, provinces, roles };

export { jobPivots };
