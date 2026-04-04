"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { COLOURS } from "@/utils/constants";
import {
  DEFAULT_FILTERS,
  FILTER_DROPDOWN_CONFIG,
  FilterDropdownConfig,
  FilterState,
} from "@/components/legacy/jobs/filterConfig";
import { useJobsContext } from "@/contexts/jobs";

export type DropdownFilters = FilterState;

const INITIAL_STATE: DropdownFilters = {
  province: "Any Province",
  jobType: "Any Job Type",
  experience: "Any Experience",
  industry: "Any Industry",
  role: "Any Role",
};

type JobFiltersProps = {
  onChange?: (filters: DropdownFilters) => void;
};

export default function JobFilters({ onChange }: JobFiltersProps) {
  const { filters, setFilters } = useJobsContext();
  const [openKey, setOpenKey] = useState<keyof FilterState | null>(null);

  useEffect(() => {
    onChange?.(filters);
  }, [filters, onChange]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenKey(null);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const activeCount = useMemo(
    () =>
      FILTER_DROPDOWN_CONFIG.reduce(
        (count, { key, defaultValue }) =>
          count + Number(filters[key] !== defaultValue),
        0,
      ),
    [filters],
  );

  const handleSelect = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setOpenKey(null);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setOpenKey(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOpenKey(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
          Filters
        </h2>
        <span className="text-xs text-neutral-500">{activeCount} active</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {FILTER_DROPDOWN_CONFIG.map((config) => (
          <DropdownField
            key={config.key}
            config={config}
            value={filters[config.key]}
            isOpen={openKey === config.key}
            onToggle={() =>
              setOpenKey((prev) => (prev === config.key ? null : config.key))
            }
            onSelect={(value) => handleSelect(config.key, value)}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="flex-1 rounded-full px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1"
          style={{ backgroundColor: COLOURS.primary }}
        >
          Apply
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="flex-1 rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Reset
        </button>
      </div>
    </form>
  );
}

type DropdownFieldProps = {
  config: FilterDropdownConfig;
  value: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
};

function DropdownField({
  config,
  value,
  isOpen,
  onToggle,
  onSelect,
}: DropdownFieldProps) {
  const { label, options } = config;
  return (
    <div className="relative">
      <button
        type="button"
        className="flex w-full h-full items-start justify-between rounded-lg border border-black/10 bg-white px-3 py-2 text-sm shadow-sm hover:border-black focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span className="text-left">
          <span className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {label}
          </span>
          <span className="block text-sm text-neutral-800">{value}</span>
        </span>
        <span className="ml-3 text-neutral-500">{isOpen ? "▴" : "▾"}</span>
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-40 mt-2 w-full max-h-56 overflow-y-auto rounded-lg border border-black/10 bg-white p-2 text-sm shadow-lg"
        >
          {options.map((option) => (
            <li key={option}>
              <button
                type="button"
                className={`w-full rounded-md px-3 py-2 text-left hover:bg-neutral-100 ${
                  option === value
                    ? "font-medium text-black"
                    : "text-neutral-700"
                }`}
                onClick={() => onSelect(option)}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
