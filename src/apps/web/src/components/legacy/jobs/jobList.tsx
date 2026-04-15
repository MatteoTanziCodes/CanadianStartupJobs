"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useJobsContext } from "@/contexts/jobs";
import { useResponsive } from "@/hooks/useResponsive";

/**
 * JobList (loading placeholder)
 * Roadmap:
 * - Add filter bar (keyword, province, remote, type) per codex.prompt.md
 * - Replace skeleton cards with <JobCard /> rendering real data from the backend jobs API
 * - Implement pagination or infinite scroll (configurable)
 * - Add source badge (local / scraper) + Verified 🇨🇦 indicator
 */
export default function JobList(props: JobListProps = {}) {
  const { filteredJobs, selectJob, selectedJobId, currentPage, totalPages, prevPage, nextPage } = useJobsContext();
  const { isMobile, isDesktop } = useResponsive();
  const router = useRouter();
  const jobCount = filteredJobs.length;
  const displayedJobs = useMemo(() => {
    if (!isDesktop) {
      return filteredJobs.slice(0, 3);
    }
    return filteredJobs;
  }, [filteredJobs, isDesktop]);

  const handleJobClick = (jobId: string) => {
    if (isMobile) {
      router.push(`/jobs/${jobId}`);
      return;
    }
    selectJob(jobId);
  };

  const listStyle: CSSProperties = props.maxHeight
    ? {
        height: `${props.maxHeight}px`,
        maxHeight: `${props.maxHeight}px`,
        minHeight: 0,
        WebkitOverflowScrolling: "touch",
        scrollbarGutter: "stable",
      }
    : {
        minHeight: 0,
        WebkitOverflowScrolling: "touch",
        scrollbarGutter: "stable",
      };

  return (
    <section
      aria-label="Job listings"
      role="region"
      className="flex h-full min-h-0 flex-col space-y-3 overflow-hidden"
    >
      <h2 className="text-lg font-semibold text-neutral-800">Latest Jobs</h2>
      <div
        className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-2 overscroll-contain touch-pan-y"
        style={listStyle}
        role="list"
        aria-busy="true"
        aria-live="polite"
      >
        {jobCount === 0 ? (
          <p className="py-4 text-sm text-neutral-500">No jobs match your search yet.</p>
        ) : (
          displayedJobs.map((job) => (
            <div
              key={job.id}
              className="bg-transparent"
            >
              <button
                type="button"
                onClick={() => handleJobClick(job.id)}
                className={`w-full rounded-xl border px-4 py-4 text-left shadow-sm transition ${
                  job.id === selectedJobId
                    ? "border-black bg-white"
                    : "border-black/10 bg-white/95 hover:border-black/40"
                }`}
              >
                <p className="text-sm font-medium text-neutral-900">{job.title}</p>
                <p className="text-xs text-neutral-600">{job.company}</p>
                {job.location && (
                  <p className="mt-2 text-xs text-neutral-500">{job.location}</p>
                )}
                {(job.salaryMin || job.salaryMax) && (
                  <p className="mt-1 text-xs font-medium text-neutral-700">
                    ${job.salaryMin?.toLocaleString() ?? "—"} - ${job.salaryMax?.toLocaleString() ?? "—"}
                  </p>
                )}
                {job.description && (
                  <p className="mt-2 text-xs leading-5 text-neutral-600">{job.description}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-neutral-500">
                  {job.jobType && <span>{job.jobType}</span>}
                  {job.experience && <span>{job.experience}</span>}
                  {job.industry && <span>{job.industry}</span>}
                  {job.role && <span>{job.role}</span>}
                </div>
              </button>
            </div>
          ))
        )}
      </div>
      {isDesktop && totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-black/10 pt-3">
          <button
            type="button"
            onClick={prevPage}
            disabled={currentPage === 1}
            className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <p className="text-xs text-neutral-500">
            Page {currentPage} of {totalPages}
          </p>
          <button
            type="button"
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}

type JobListProps = {
  maxHeight?: number;
};
