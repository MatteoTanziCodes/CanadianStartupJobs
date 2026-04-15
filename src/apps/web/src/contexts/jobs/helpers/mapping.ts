import { type Job as ApiJob } from "@/data/api/jobs";
import { type Job } from "@/contexts/jobs/types";

const toPreviewDescription = (description: string) => {
  const normalized = description.replace(/\s+/g, " ").trim();
  if (normalized.length <= 220) {
    return normalized;
  }

  return `${normalized.slice(0, 217).trimEnd()}...`;
};

export function mapApiJobToFrontend(apiJob: ApiJob): Job {
  return {
    id: apiJob.id.toString(),
    title: apiJob.title,
    company: apiJob.company,
    description: toPreviewDescription(apiJob.description),
    salaryMin: apiJob.salaryMin,
    salaryMax: apiJob.salaryMax,
    city: apiJob.city,
    province: apiJob.province,
    location: `${apiJob.city}, ${apiJob.province}`,
    applyUrl: apiJob.postingUrl,
    remoteOk: apiJob.remoteOk,
    isAtAStartup: apiJob.isAtAStartup,
    jobType: undefined,
    experience: undefined,
    industry: undefined,
    role: undefined,
  };
}

export function mapApiJobsToFrontend(apiJobs: ApiJob[]): Record<string, Job> {
  const jobsMap: Record<string, Job> = {};
  apiJobs.forEach((job) => {
    const mappedJob = mapApiJobToFrontend(job);
    jobsMap[mappedJob.id] = mappedJob;
  });
  return jobsMap;
}
