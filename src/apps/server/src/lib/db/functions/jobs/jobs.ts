import { and, eq, asc, desc, inArray } from "drizzle-orm";
import {
  type Database,
  jobs,
  organizations,
  orgsJobs,
  provinces,
  jobTypes,
  experienceLevels,
  industries,
  roles,
  jobsProvinces,
  jobsJobTypes,
  jobsExperienceLevels,
  jobsIndustries,
  jobsRoles,
} from "@canadian-startup-jobs/db";
import { z } from "zod";
import { AppError, ERROR_CODES } from "@/lib/errors";
import { orgPivots } from "@/lib/db/functions/pivots/orgs";
import { jobPivots } from "@/lib/db/functions/pivots/jobs";

const jobCreateSchema = z.object({
  title: z.string(),
  city: z.string(),
  province: z.string(),
  remote_ok: z.boolean().default(false),
  salary_min: z.number().optional(),
  salary_max: z.number().optional(),
  description: z.string(),
  company: z.string(),
  job_board_url: z.string().optional(),
  posting_url: z.string().optional(),
  is_at_a_startup: z.boolean().optional(),
  last_scraped_markdown: z.string().optional(),
});

type JobCreate = z.infer<typeof jobCreateSchema>;
type JobsInsert = typeof jobs.$inferInsert;
type JobsSelect = typeof jobs.$inferSelect;
type OrganizationsSelect = typeof organizations.$inferSelect;

type JobWithRichData = JobsSelect & {
  organization: OrganizationsSelect | null;
  tags: {
    provinces: typeof provinces.$inferSelect[];
    experienceLevels: typeof experienceLevels.$inferSelect[];
    industries: typeof industries.$inferSelect[];
    jobTypes: typeof jobTypes.$inferSelect[];
    roles: typeof roles.$inferSelect[];
  };
};

type FilterOptions = {
  provinceId?: number;
  jobTypeId?: number;
  experienceLevelId?: number;
  industryId?: number;
  roleId?: number;
};

const orderAsc = asc(jobs.id);
const orderDesc = desc(jobs.id);
const orderStatement = (order?: "asc" | "desc"): typeof orderAsc => {
  if (order === "asc") {
    return orderAsc;
  }
  return orderDesc;
};

const create_jobs = async (db: Database, jobCreateArgs: JobCreate) => {
  const insert: JobsInsert = {
    title: jobCreateArgs.title,
    city: jobCreateArgs.city,
    province: jobCreateArgs.province,
    remoteOk: jobCreateArgs.remote_ok,
    salaryMin: jobCreateArgs.salary_min,
    salaryMax: jobCreateArgs.salary_max,
    description: jobCreateArgs.description,
    company: jobCreateArgs.company,
    jobBoardUrl: jobCreateArgs.job_board_url,
    postingUrl: jobCreateArgs.posting_url,
    isAtAStartup: jobCreateArgs.is_at_a_startup,
  };

  const result = await db.insert(jobs).values(insert).returning({ id: jobs.id });
  if (result.length === 0) {
    throw new AppError(ERROR_CODES.DB_INSERT_FAILED, "Failed to create new job", {
      jobCreateArgs,
    });
  }
  return result[0];
};

const getJobById = async (db: Database, id: number): Promise<JobsSelect> => {
  const result = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!result[0]) {
    throw new AppError(ERROR_CODES.DB_QUERY_FAILED, "Job not found", { id });
  }
  return result[0];
};

const getVisibleJobIds = async (db: Database) => {
  const visibleRows = await db
    .select({ jobId: jobs.id })
    .from(jobs)
    .innerJoin(orgsJobs, eq(orgsJobs.jobId, jobs.id))
    .innerJoin(organizations, eq(organizations.id, orgsJobs.orgId))
    .where(
      and(
        eq(jobs.listingStatus, "active"),
        eq(jobs.reviewStatus, "approved"),
        eq(organizations.qualificationStatus, "qualified"),
      ),
    );

  return [...new Set(visibleRows.map((row) => row.jobId))];
};

const intersectWithPivot = async (
  currentIds: Set<number>,
  pivotIds: number[],
) => {
  const pivotIdSet = new Set(pivotIds);
  for (const id of Array.from(currentIds)) {
    if (!pivotIdSet.has(id)) {
      currentIds.delete(id);
    }
  }
};

const countJobs = async (db: Database, filters?: FilterOptions) => {
  const visibleJobIds = await getVisibleJobIds(db);
  if (visibleJobIds.length === 0) {
    return 0;
  }

  const hasActiveFilters = filters && Object.values(filters).some((value) => value !== undefined);
  if (!hasActiveFilters) {
    return visibleJobIds.length;
  }

  const filteredJobIds = new Set<number>(visibleJobIds);

  if (filters.provinceId) {
    const pivot = await db
      .select({ jobId: jobsProvinces.jobId })
      .from(jobsProvinces)
      .where(eq(jobsProvinces.provinceId, filters.provinceId));
    await intersectWithPivot(filteredJobIds, pivot.map((item) => item.jobId));
  }

  if (filters.jobTypeId) {
    const pivot = await db
      .select({ jobId: jobsJobTypes.jobId })
      .from(jobsJobTypes)
      .where(eq(jobsJobTypes.jobTypeId, filters.jobTypeId));
    await intersectWithPivot(filteredJobIds, pivot.map((item) => item.jobId));
  }

  if (filters.experienceLevelId) {
    const pivot = await db
      .select({ jobId: jobsExperienceLevels.jobId })
      .from(jobsExperienceLevels)
      .where(eq(jobsExperienceLevels.experienceLevelId, filters.experienceLevelId));
    await intersectWithPivot(filteredJobIds, pivot.map((item) => item.jobId));
  }

  if (filters.industryId) {
    const pivot = await db
      .select({ jobId: jobsIndustries.jobId })
      .from(jobsIndustries)
      .where(eq(jobsIndustries.industryId, filters.industryId));
    await intersectWithPivot(filteredJobIds, pivot.map((item) => item.jobId));
  }

  if (filters.roleId) {
    const pivot = await db
      .select({ jobId: jobsRoles.jobId })
      .from(jobsRoles)
      .where(eq(jobsRoles.roleId, filters.roleId));
    await intersectWithPivot(filteredJobIds, pivot.map((item) => item.jobId));
  }

  return filteredJobIds.size;
};

const listJobs = async (
  db: Database,
  skip: number = 0,
  take: number = 10,
  filters?: FilterOptions,
): Promise<JobsSelect[]> => {
  const visibleJobIds = await getVisibleJobIds(db);
  if (visibleJobIds.length === 0) {
    return [];
  }

  const hasActiveFilters = filters && Object.values(filters).some((value) => value !== undefined);
  if (!hasActiveFilters) {
    return db
      .select()
      .from(jobs)
      .where(inArray(jobs.id, visibleJobIds))
      .orderBy(orderStatement("desc"))
      .limit(take)
      .offset(skip);
  }

  const jobIdsToFilter = new Set<number>(visibleJobIds);

  if (filters.provinceId) {
    const pivot = await db
      .select({ jobId: jobsProvinces.jobId })
      .from(jobsProvinces)
      .where(eq(jobsProvinces.provinceId, filters.provinceId));
    await intersectWithPivot(jobIdsToFilter, pivot.map((item) => item.jobId));
  }

  if (filters.jobTypeId) {
    const pivot = await db
      .select({ jobId: jobsJobTypes.jobId })
      .from(jobsJobTypes)
      .where(eq(jobsJobTypes.jobTypeId, filters.jobTypeId));
    await intersectWithPivot(jobIdsToFilter, pivot.map((item) => item.jobId));
  }

  if (filters.experienceLevelId) {
    const pivot = await db
      .select({ jobId: jobsExperienceLevels.jobId })
      .from(jobsExperienceLevels)
      .where(eq(jobsExperienceLevels.experienceLevelId, filters.experienceLevelId));
    await intersectWithPivot(jobIdsToFilter, pivot.map((item) => item.jobId));
  }

  if (filters.industryId) {
    const pivot = await db
      .select({ jobId: jobsIndustries.jobId })
      .from(jobsIndustries)
      .where(eq(jobsIndustries.industryId, filters.industryId));
    await intersectWithPivot(jobIdsToFilter, pivot.map((item) => item.jobId));
  }

  if (filters.roleId) {
    const pivot = await db
      .select({ jobId: jobsRoles.jobId })
      .from(jobsRoles)
      .where(eq(jobsRoles.roleId, filters.roleId));
    await intersectWithPivot(jobIdsToFilter, pivot.map((item) => item.jobId));
  }

  if (jobIdsToFilter.size === 0) {
    return [];
  }

  return db
    .select()
    .from(jobs)
    .where(inArray(jobs.id, Array.from(jobIdsToFilter)))
    .orderBy(orderStatement("desc"))
    .limit(take)
    .offset(skip);
};

const getJobWithRichData = async (db: Database, id: number): Promise<JobWithRichData> => {
  const job = await getJobById(db, id);

  const orgJobPivots = await orgPivots.job.get_by_job(db, id);
  let organization: OrganizationsSelect | null = null;
  if (orgJobPivots.length > 0) {
    const orgResult = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgJobPivots[0].orgId))
      .limit(1);
    organization = orgResult[0] ?? null;
  }

  const [industryPivots, experienceLevelPivots, jobTypePivots, provincePivots, rolePivots] =
    await Promise.all([
      jobPivots.industry.get_by_job(db, id),
      jobPivots.experienceLevel.get_by_job(db, id),
      jobPivots.jobType.get_by_job(db, id),
      jobPivots.provinces.get_by_job(db, id),
      jobPivots.roles.get_by_job(db, id),
    ]);

  const industriesData = industryPivots.length
    ? await db
        .select()
        .from(industries)
        .where(inArray(industries.id, industryPivots.map((pivot) => pivot.industryId)))
    : [];

  const experienceLevelsData = experienceLevelPivots.length
    ? await db
        .select()
        .from(experienceLevels)
        .where(
          inArray(
            experienceLevels.id,
            experienceLevelPivots.map((pivot) => pivot.experienceLevelId),
          ),
        )
    : [];

  const jobTypesData = jobTypePivots.length
    ? await db
        .select()
        .from(jobTypes)
        .where(inArray(jobTypes.id, jobTypePivots.map((pivot) => pivot.jobTypeId)))
    : [];

  const provincesData = provincePivots.length
    ? await db
        .select()
        .from(provinces)
        .where(inArray(provinces.id, provincePivots.map((pivot) => pivot.provinceId)))
    : [];

  const rolesData = rolePivots.length
    ? await db
        .select()
        .from(roles)
        .where(inArray(roles.id, rolePivots.map((pivot) => pivot.roleId)))
    : [];

  return {
    ...job,
    organization,
    tags: {
      provinces: provincesData,
      experienceLevels: experienceLevelsData,
      industries: industriesData,
      jobTypes: jobTypesData,
      roles: rolesData,
    },
  };
};

export { create_jobs, countJobs, getJobById, getJobWithRichData, listJobs, jobCreateSchema };
