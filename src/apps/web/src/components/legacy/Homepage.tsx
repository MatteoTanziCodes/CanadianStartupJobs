// components/Homepage.tsx
"use client";

import React from "react";
import JobDetail from "@/components/jobs/JobDetail";
import { Spinner } from "@/components/ui/spinner";
import { useJobsContext } from "@/contexts/jobs";
import HeroSection from "@/components/legacy/layout/heroSection";
import { COLOURS } from "@/utils/constants";

const Homepage: React.FC = () => {
  const { selectedRichJob, isSelectedJobLoading } = useJobsContext();

  return (
    <div className="flex min-h-0 flex-col overflow-visible">
      <div className="flex min-h-0 flex-col overflow-visible px-4 pb-6 sm:px-6 lg:px-8">
        {selectedRichJob ? (
          <section
            className="relative overflow-hidden rounded-[2rem] border shadow-[0_8px_32px_rgba(98,62,33,0.12)]"
            style={{
              backgroundColor: COLOURS.background,
              borderColor: "rgba(62,39,24,0.14)",
            }}
          >
            <div className="relative px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
              <JobDetail job={selectedRichJob} />
            </div>
          </section>
        ) : isSelectedJobLoading ? (
          <section className="flex min-h-[320px] items-center justify-center rounded-[2rem] border border-black/10 shadow-[0_8px_32px_rgba(0,0,0,0.06)]" style={{ backgroundColor: COLOURS.background }}>
            <Spinner />
          </section>
        ) : (
          <HeroSection />
        )}
      </div>
    </div>
  );
};

export default Homepage;
