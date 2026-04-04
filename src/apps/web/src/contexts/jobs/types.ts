import { type FilterState } from "@/components/legacy/jobs/filterConfig";
import { type JobWithRichData } from "@/data/api/jobs";

export type Job = {
  id: string;
  title: string;
  company: string;
  salaryMin?: string;
  salaryMax?: string;
  description?: string;
  applyUrl?: string;
  location?: string;
  city?: string;
  province?: string;
  jobType?: string;
  experience?: string;
  industry?: string;
  role?: string;
  [key: string]: unknown;
};

export type RichJob = JobWithRichData;

export type JobsContextValue = {
  totalJobs: number,
  jobsById: Record<string, Job>;
  jobIds: string[];
  filteredJobIds: string[];
  filteredJobs: Job[];
  selectedJobId: string | null;
  selectedJob: Job | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  selectJob: (id: string) => void;
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
};
