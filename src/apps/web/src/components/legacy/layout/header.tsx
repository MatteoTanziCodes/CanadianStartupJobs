"use client";

import JobFilters from "@/components/legacy/layout/jobFilters";
import SearchBar from "@/components/legacy/layout/searchbar";
import { useJobsContext } from "@/contexts/jobs";
import { COLOURS } from "@/utils/constants";

export default function Header() {
  const { searchTerm, setSearchTerm } = useJobsContext();

  return (
    <header
      className="relative z-50 backdrop-blur"
      style={{ backgroundColor: COLOURS.muted }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <SearchBar value={searchTerm} onChange={setSearchTerm} />
        <JobFilters />
      </div>
    </header>
  );
}
