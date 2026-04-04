"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { jobsApi } from "@/data/api/jobs";
import { DEFAULT_FILTERS, type FilterState } from "@/components/legacy/jobs/filterConfig";
import { type Job, type JobsContextValue } from "@/contexts/jobs/types";
import { mapApiJobsToFrontend } from "./helpers/mapping";
import { filterJobsByTermAndFilters, getJobsFromIds } from "./helpers/filtering";
import { useFiltersContext } from "@/contexts/filters";

const JobsContext = createContext<JobsContextValue | undefined>(undefined);

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [jobsById, setJobsById] = useState<Record<string, Job>>({});
  const [searchTerm, setSearchTermState] = useState("");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalJobs, setTotalJobs] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;
  const filterContext = useFiltersContext();

  const jobIds = Object.keys(jobsById);

  const totalPages = Math.ceil(totalJobs / pageSize);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setIsLoading(true);
        const skip = (currentPage - 1) * pageSize;
        const response = await jobsApi.list(skip, pageSize, {
          provinceId: filterContext.filters.province || undefined,
          jobTypeId: filterContext.filters.jobType || undefined,
          experienceLevelId: filterContext.filters.experience || undefined,
          industryId: filterContext.filters.industry || undefined,
          roleId: filterContext.filters.role || undefined,
        });
        setTotalJobs(response.count);
        setJobsById(mapApiJobsToFrontend(response.jobs));
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchJobs();
  }, [currentPage, filterContext.filters]);

  const filteredJobIds = useMemo(() => {
    return filterJobsByTermAndFilters(jobsById, jobIds, filters, searchTerm);
  }, [jobsById, jobIds, filters, searchTerm]);

  const filteredJobs = useMemo(() => {
    return getJobsFromIds(jobsById, filteredJobIds);
  }, [jobsById, filteredJobIds]);

  const activeJobId = useMemo(() => {
    if (filteredJobIds.length === 0) return null;
    if (selectedJobId && filteredJobIds.includes(selectedJobId)) return selectedJobId;
    return filteredJobIds[0];
  }, [filteredJobIds, selectedJobId]);

  const setSearchTerm = useCallback((term: string) => {
    setSearchTermState(term);
  }, []);

  const selectJob = useCallback((id: string) => {
    setSelectedJobId((current) => (jobsById[id] ? id : current));
  }, [jobsById]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);

  const value = useMemo<JobsContextValue>(
    () => ({
      jobsById,
      jobIds,
      filteredJobIds,
      filteredJobs,
      selectedJobId: activeJobId,
      selectedJob: activeJobId ? jobsById[activeJobId] ?? null : null,
      searchTerm,
      setSearchTerm,
      filters,
      setFilters,
      selectJob,
      isLoading,
      totalJobs,
      currentPage,
      totalPages,
      goToPage,
      nextPage,
      prevPage
    }),
    [jobsById, jobIds, filteredJobIds, filteredJobs, activeJobId, searchTerm, setSearchTerm, filters, setFilters, selectJob, isLoading, totalJobs, currentPage, totalPages, goToPage, nextPage, prevPage]
  );

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobsContext() {
  const context = useContext(JobsContext);
  if (!context) {
    throw new Error("useJobsContext must be used within JobsProvider");
  }
  return context;
}
