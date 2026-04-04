import { asc, desc, eq } from "drizzle-orm";
import {
  type Database,
  db,
  isDatabase,
  orgsIndustries,
  orgsJobs,
  orgsProvinces,
  orgsSizes,
  orgsStages,
} from "@/lib/db/runtime";

const getPivotRows = async (
  db: Database,
  table: any,
  column: any,
  value: number,
  orderBy: ReturnType<typeof asc>,
  skip?: number,
  take?: number,
) =>
  db
    .select()
    .from(table)
    .where(eq(column, value))
    .orderBy(orderBy)
    .limit(take ?? 10)
    .offset(skip ?? 0);

const addPivotRow = async (
  database: Database,
  table: typeof orgsIndustries,
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
  get_by_org: (db: Database, orgId: number, skip?: number, take?: number) =>
    getPivotRows(db, orgsIndustries, orgsIndustries.orgId, orgId, asc(orgsIndustries.industryId), skip, take),
  get_by_industry: (db: Database, industryId: number, skip?: number, take?: number) =>
    getPivotRows(
      db,
      orgsIndustries,
      orgsIndustries.industryId,
      industryId,
      desc(orgsIndustries.industryId),
      skip,
      take,
    ),
  add: withDb((database, orgId: number, industryId: number) =>
    addPivotRow(database, orgsIndustries, { orgId, industryId })),
};

const job = {
  get_by_org: (db: Database, orgId: number, skip?: number, take?: number) =>
    getPivotRows(db, orgsJobs, orgsJobs.orgId, orgId, asc(orgsJobs.jobId), skip, take),
  get_by_job: (db: Database, jobId: number, skip?: number, take?: number) =>
    getPivotRows(db, orgsJobs, orgsJobs.jobId, jobId, desc(orgsJobs.jobId), skip, take),
  add: withDb((database, orgId: number, jobId: number) =>
    addPivotRow(database, orgsJobs as any, { orgId, jobId })),
};

const province = {
  get_by_org: (db: Database, orgId: number, skip?: number, take?: number) =>
    getPivotRows(db, orgsProvinces, orgsProvinces.orgId, orgId, asc(orgsProvinces.provinceId), skip, take),
  get_by_province: (db: Database, provinceId: number, skip?: number, take?: number) =>
    getPivotRows(
      db,
      orgsProvinces,
      orgsProvinces.provinceId,
      provinceId,
      desc(orgsProvinces.provinceId),
      skip,
      take,
    ),
  add: withDb((database, orgId: number, provinceId: number) =>
    addPivotRow(database, orgsProvinces as any, { orgId, provinceId })),
};

const teamSize = {
  get_by_org: (db: Database, orgId: number, skip?: number, take?: number) =>
    getPivotRows(db, orgsSizes, orgsSizes.orgId, orgId, asc(orgsSizes.teamSizeId), skip, take),
  get_by_teamSize: (db: Database, teamSizeId: number, skip?: number, take?: number) =>
    getPivotRows(db, orgsSizes, orgsSizes.teamSizeId, teamSizeId, desc(orgsSizes.teamSizeId), skip, take),
  add: withDb((database, orgId: number, teamSizeId: number) =>
    addPivotRow(database, orgsSizes as any, { orgId, teamSizeId })),
};

const raisingStage = {
  get_by_org: (db: Database, orgId: number, skip?: number, take?: number) =>
    getPivotRows(db, orgsStages, orgsStages.orgId, orgId, asc(orgsStages.raisingStageId), skip, take),
  get_by_raisingStage: (db: Database, raisingStageId: number, skip?: number, take?: number) =>
    getPivotRows(
      db,
      orgsStages,
      orgsStages.raisingStageId,
      raisingStageId,
      desc(orgsStages.raisingStageId),
      skip,
      take,
    ),
  add: withDb((database, orgId: number, raisingStageId: number) =>
    addPivotRow(database, orgsStages as any, { orgId, raisingStageId })),
};

const orgPivots = { industry, job, province, teamSize, raisingStage };

export { orgPivots };
