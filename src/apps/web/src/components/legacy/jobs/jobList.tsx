"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useJobsContext } from "@/contexts/jobs";

/**
 * JobList (loading placeholder)
 * Roadmap:
 * - Add filter bar (keyword, province, remote, type) per codex.prompt.md
 * - Replace skeleton cards with <JobCard /> rendering real data from the backend jobs API
 * - Implement pagination or infinite scroll (configurable)
 * - Add source badge (local / scraper) + Verified 🇨🇦 indicator
 */
export default function JobList(props: JobListProps = {}) {
  const [isMobile, setIsMobile] = useState(false);
  const firstCardRef = useRef<HTMLDivElement | null>(null);
  const [cardHeight, setCardHeight] = useState<number>();
  const { filteredJobs, selectJob, selectedJobId } = useJobsContext();
  const firstJobKey = filteredJobs[0]?.id ?? null;
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  const router = useRouter();
  const jobCount = filteredJobs.length;
  const totalPages = isMobile ? 1 : Math.max(1, Math.ceil(jobCount / itemsPerPage));
  const activePage = isMobile ? 1 : Math.min(currentPage, totalPages);
  const displayedJobs = isMobile
    ? filteredJobs
    : filteredJobs.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const updateMatch = () => setIsMobile(mediaQuery.matches);

    updateMatch();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateMatch);
      return () => mediaQuery.removeEventListener("change", updateMatch);
    }

    mediaQuery.addListener(updateMatch);
    return () => mediaQuery.removeListener(updateMatch);
  }, []);

  useEffect(() => {
    if (!isMobile || filteredJobs.length === 0) return;

    const measure = () => {
      if (firstCardRef.current) {
        setCardHeight(firstCardRef.current.offsetHeight);
      }
    };

    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
    };
  }, [isMobile, filteredJobs.length, firstJobKey]);

  const handleJobClick = (jobId: string) => {
    if (isMobile) {
      router.push(`/jobs/${jobId}`);
      return;
    }
    selectJob(jobId);
  };

  const listStyle: CSSProperties = {};

  if (isMobile && cardHeight) {
    listStyle.maxHeight = `${cardHeight}px`;
    listStyle.height = `${cardHeight}px`;
  }

  return (
    <section
      aria-label="Job listings"
      role="region"
      className="flex h-full min-h-0 flex-col space-y-3"
    >
      <h2 className="text-lg font-semibold text-neutral-800">Latest Jobs</h2>
      <div
        className={
          isMobile
            ? "flex-1 min-h-0 overflow-y-auto pr-2 snap-y snap-mandatory space-y-0"
            : "flex-1 min-h-0 space-y-2 overflow-y-auto pr-2"
        }
        style={listStyle}
        role="list"
        aria-busy="true"
        aria-live="polite"
      >
        {jobCount === 0 ? (
          <p className="py-4 text-sm text-neutral-500">No jobs match your search yet.</p>
        ) : (
          displayedJobs.map((job, index) => (
            <div
              key={job.id}
              ref={index === 0 ? firstCardRef : undefined}
              className={`snap-start ${isMobile ? "sticky top-0 z-10 bg-white" : ""}`}
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
      {!isMobile && jobCount > itemsPerPage && (
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            className="rounded-full border border-black/10 px-3 py-1 text-sm text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={activePage === 1}
          >
            Previous
          </button>
          <span className="text-xs text-neutral-500">
            Page {activePage} of {totalPages}
          </span>
          <button
            type="button"
            className="rounded-full border border-black/10 px-3 py-1 text-sm text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={activePage === totalPages}
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
