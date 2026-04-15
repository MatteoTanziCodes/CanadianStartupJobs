import React from "react";
import type { CSSProperties } from "react";
import { COLOURS } from "@/utils/constants";
import { useJobsContext } from "@/contexts/jobs";

type HeroSectionProps = {
  maxHeight?: number;
};

const HeroSection: React.FC<HeroSectionProps> = ({ maxHeight } = {}) => {
  const { selectedJob, selectedRichJob, isSelectedJobLoading } = useJobsContext();
  const computedMaxHeight =
    typeof maxHeight === "number" ? Math.max(160, maxHeight) : undefined;
  const activeJob = selectedRichJob ?? selectedJob;

  const baseStyle: CSSProperties = {
    backgroundColor: COLOURS.background,
    borderColor: COLOURS.border,
  };

  if (computedMaxHeight) {
    baseStyle.maxHeight = computedMaxHeight;
  }

  if (!activeJob) {
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
    typeof activeJob.description === "string"
      ? activeJob.description.split(/\n+/).map((segment) => segment.trim()).filter(Boolean)
      : [];
  const locationLabel = selectedRichJob
    ? `${selectedRichJob.city}, ${selectedRichJob.province}`
    : activeJob.location;
  const applyUrl = selectedRichJob?.postingUrl ?? activeJob.applyUrl;
  const salaryLabel =
    activeJob.salaryMin || activeJob.salaryMax
      ? `$${activeJob.salaryMin?.toLocaleString() ?? "—"} - $${activeJob.salaryMax?.toLocaleString() ?? "—"}`
      : null;
  const richTags = selectedRichJob
    ? [
        ...selectedRichJob.tags.jobTypes.map((tag) => tag.name),
        ...selectedRichJob.tags.experienceLevels.map((tag) => tag.name),
        ...selectedRichJob.tags.industries.map((tag) => tag.name),
        ...selectedRichJob.tags.roles.map((tag) => tag.name),
      ]
    : [activeJob.jobType, activeJob.experience, activeJob.industry, activeJob.role].filter(Boolean);

  return (
    <section
      className="flex h-full flex-col gap-6 overflow-y-auto rounded-[2rem] border border-black/10 bg-gradient-to-br from-white via-[#fffaf6] to-[#f5ece3] p-8 shadow-[0_22px_70px_rgba(0,0,0,0.08)]"
      style={sectionStyle}
    >
      <div className="w-full max-w-4xl space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8b2332]">{activeJob.company}</p>
          <h2 className="max-w-4xl text-3xl font-semibold text-neutral-900 sm:text-4xl">{activeJob.title}</h2>
          <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600">
            {locationLabel && <p className="m-0">{locationLabel}</p>}
            {salaryLabel && <p className="m-0 font-medium text-neutral-900">{salaryLabel}</p>}
            {activeJob.remoteOk && <p className="m-0">Remote friendly</p>}
            {applyUrl && (
              <a
                href={applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full bg-[#8b2332] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#721c28] focus:outline-none focus:ring-2 focus:ring-[#8b2332] focus:ring-offset-1"
                style={{ backgroundColor: COLOURS.primary, padding: "6px 12px" }}
              >
                Apply Now
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium text-neutral-700">
          {richTags.map((tag) => (
            <span key={tag as string} className="rounded-full border border-black/10 bg-white/80 px-3 py-1 uppercase tracking-wide shadow-sm">
              {tag}
            </span>
          ))}
        </div>

        {paragraphs.length > 0 ? (
          <div className="max-w-3xl space-y-4 text-[15px] leading-8 text-neutral-700">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-600">Detailed description coming soon.</p>
        )}
        {isSelectedJobLoading && (
          <p className="text-xs uppercase tracking-wide text-neutral-500">Refreshing job details...</p>
        )}
      </div>
    </section>
  );
};

export default HeroSection;
