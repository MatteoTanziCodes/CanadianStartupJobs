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
            className="relative overflow-hidden rounded-[2rem] border shadow-[0_24px_65px_rgba(98,62,33,0.14),0_2px_0_rgba(255,255,255,0.45)_inset]"
            style={{
              backgroundColor: COLOURS.background,
              borderColor: "rgba(62,39,24,0.14)",
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(139,35,50,0.12),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(173,120,78,0.12),_transparent_30%)]" />
            <div className="relative px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
              <JobDetail job={selectedRichJob} />
            </div>
          </section>
        ) : isSelectedJobLoading ? (
          <section className="flex min-h-[320px] items-center justify-center rounded-[2rem] border border-black/10 shadow-[0_22px_70px_rgba(0,0,0,0.06)]" style={{ backgroundColor: COLOURS.background }}>
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
