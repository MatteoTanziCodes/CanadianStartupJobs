import { db } from "@/lib/db/runtime";
/**
 * Main Goal:
 * Search and filter jobs
 *
 * Filtering Schema (Implemented via Pivot Tables):
 * Key (Text Search)
 * Province -> `provinces` table + `jobs_provinces`
 * Job Type -> `job_types` table + `jobs_job_types`
 * Experience Level -> `experience_levels` table + `jobs_experience_levels`
 * Industry -> `industries` table + `jobs_industries`
 * Role -> `roles` table + `jobs_roles`
 *
 * DB Schema:
 * - jobs (Main table)
 * - provinces, job_types, experience_levels, industries, roles (Lookup tables)
 * - jobs_provinces, jobs_job_types, jobs_experience_levels, jobs_industries, jobs_roles (Pivot tables)
 * Project Readme:
 * ## Overview
 Canadian Startup Jobs focuses on promoting local innovation, helping founders hire within Canada, and giving job seekers access to authentic, homegrown opportunities across tech, design, marketing, and more.

 CanadianStartupJobs is built to strengthen Canada’s startup ecosystem by making it easier for:
 - **Founders** to showcase their startups and hire verified Canadian talent.
 - **Job seekers** to discover opportunities at innovative, homegrown companies.
 - **Communities** to highlight the impact of Canadian entrepreneurship.

 ## Features (Planned)
 - Search and filter jobs
 - Verified Canadian-owned startups only
 - Simple job posting and management dashboard for founders
 - Public API for regional innovation hubs and directories, such as university accelerators
 */
