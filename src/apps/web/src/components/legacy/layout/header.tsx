"use client";

import JobFilters from "@/components/legacy/layout/jobFilters";
import SearchBar from "@/components/legacy/layout/searchbar";
import { useJobsContext } from "@/contexts/jobs";
import { COLOURS } from "@/utils/constants";

export default function Header({
  className = "",
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "sidebar";
}) {
  const { searchTerm, setSearchTerm } = useJobsContext();
  const isSidebar = variant === "sidebar";

  return (
    <header
      className={`relative z-50 backdrop-blur ${className}`.trim()}
      style={{ backgroundColor: COLOURS.muted }}
    >
      <div
        className={`flex w-full flex-col ${
          isSidebar ? "gap-3 px-4 py-4" : "mx-auto max-w-6xl gap-4 px-4 py-6 sm:px-6 lg:px-8"
        }`}
      >
        <SearchBar value={searchTerm} onChange={setSearchTerm} variant={variant} />
        <JobFilters variant={variant} />
      </div>
    </header>
  );
}
