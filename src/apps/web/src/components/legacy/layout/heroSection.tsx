import React from "react";
import type { CSSProperties } from "react";
import { COLOURS } from "@/utils/constants";
import { useJobsContext } from "@/contexts/jobs";

type HeroSectionProps = {
  maxHeight?: number;
};

const HeroSection: React.FC<HeroSectionProps> = ({ maxHeight } = {}) => {
  const { selectedJob, filteredJobs } = useJobsContext();
  const computedMaxHeight =
    typeof maxHeight === "number" ? Math.max(160, maxHeight) : undefined;

  const baseStyle: CSSProperties = {
    backgroundColor: COLOURS.background,
    borderColor: COLOURS.border,
  };

  if (computedMaxHeight) {
    baseStyle.maxHeight = computedMaxHeight;
  }

  if (!selectedJob) {
    return (
      <section
        className="flex h-full items-center justify-center rounded-2xl border p-10 text-center shadow-sm"
        style={baseStyle}
      >
        <p className="text-sm text-neutral-600">
          No jobs match your search. Adjust the filters to explore more roles.
        </p>
      </section>
    );
  }

  const sectionStyle: CSSProperties = computedMaxHeight
    ? { maxHeight: `calc(${computedMaxHeight}px - 140px)` }
    : {};

  const paragraphs =
    typeof selectedJob.description === "string"
      ? selectedJob.description.split(/\n+/).map((segment) => segment.trim()).filter(Boolean)
      : [];

  return (
    <section
      className="flex h-full flex-col gap-6 overflow-y-auto rounded-2xl border p-8 shadow-sm"
      style={sectionStyle}
    >
      <div className="w-full max-w-4xl space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-600">{selectedJob.company}</p>
          <h2 className="text-3xl font-semibold text-neutral-900">{selectedJob.title}</h2>
          <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600">
            {selectedJob.location && <p className="m-0">{selectedJob.location}</p>}
            {selectedJob.applyUrl && (
              <a
                href={selectedJob.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full text-xs font-semibold uppercase tracking-wide text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
                style={{ backgroundColor: COLOURS.primary, padding: "6px 12px" }}
              >
                Apply Now
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium text-neutral-700">
          {selectedJob.jobType && (
            <span className="rounded-full bg-neutral-200 px-3 py-1 uppercase tracking-wide">{selectedJob.jobType}</span>
          )}
          {selectedJob.experience && (
            <span className="rounded-full bg-neutral-200 px-3 py-1 uppercase tracking-wide">{selectedJob.experience}</span>
          )}
          {selectedJob.industry && (
            <span className="rounded-full bg-neutral-200 px-3 py-1 uppercase tracking-wide">{selectedJob.industry}</span>
          )}
          {selectedJob.role && (
            <span className="rounded-full bg-neutral-200 px-3 py-1 uppercase tracking-wide">{selectedJob.role}</span>
          )}
        </div>

        {paragraphs.length > 0 ? (
          <div className="max-w-3xl space-y-3 text-sm leading-8 text-neutral-700">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-600">Detailed description coming soon.</p>
        )}
      </div>
    </section>
  );
};

export default HeroSection;
