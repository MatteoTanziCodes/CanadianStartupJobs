"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import JobDetail from "@/components/jobs/JobDetail";
import { jobsApi, type JobWithRichData } from "@/data/api/jobs";

export default function JobPageClient({ id }: { id: string }) {
  const [job, setJob] = useState<JobWithRichData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;

    const loadJob = async () => {
      const parsedId = Number.parseInt(id, 10);
      if (!Number.isFinite(parsedId)) {
        setStatus("missing");
        return;
      }

      try {
        const richJob = await jobsApi.getRichById(parsedId);
        if (cancelled) return;
        setJob(richJob);
        setStatus("ready");
      } catch (error) {
        console.error("Failed to fetch job:", error);
        if (cancelled) return;
        setStatus("missing");
      }
    };

    loadJob();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="text-sm text-neutral-600">Loading job details...</p>
      </main>
    );
  }

  if (status !== "ready" || !job) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="text-sm text-neutral-600">We couldn&apos;t find that job. It may have been removed.</p>
        <Link
          href="/"
          className="mt-4 rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Back to listings
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Back to listings
        </Link>
      </div>
      <div className="mx-auto max-w-3xl">
        <JobDetail job={job} />
      </div>
    </main>
  );
}
