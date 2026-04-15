// components/Homepage.tsx
"use client";

import React from "react";
import JobDetail from "@/components/jobs/JobDetail";
import { Spinner } from "@/components/ui/spinner";
import { useJobsContext } from "@/contexts/jobs";
import HeroSection from "@/components/legacy/layout/heroSection";

const Homepage: React.FC = () => {
  const { selectedRichJob, isSelectedJobLoading } = useJobsContext();

  return (
    <div className="flex min-h-0 flex-col overflow-visible">
      <div className="flex min-h-0 flex-col overflow-visible px-4 pb-6 sm:px-6 lg:px-8">
        {selectedRichJob ? (
          <section className="min-h-0">
            <div className="relative">
              <JobDetail job={selectedRichJob} />
            </div>
          </section>
        ) : isSelectedJobLoading ? (
          <section className="flex min-h-[320px] items-center justify-center rounded-[2rem] border border-black/10 bg-white shadow-[0_22px_70px_rgba(0,0,0,0.06)]">
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
