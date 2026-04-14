"use client";

import { ChangeEvent } from "react";

type SearchBarProps = {
  value: string;
  onChange: (next: string) => void;
  variant?: "default" | "sidebar";
};

export default function SearchBar({ value, onChange, variant = "default" }: SearchBarProps) {
  const handleInput = (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value);
  const isSidebar = variant === "sidebar";

  return (
    <label className="block">
      <span className="sr-only">Search jobs</span>
      <input
        type="search"
        value={value}
        onChange={handleInput}
        placeholder={isSidebar ? "Search roles or companies" : "Search roles, companies, or keywords"}
        className={`w-full rounded-lg border border-black/10 bg-white text-black shadow-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 ${
          isSidebar ? "px-3 py-2.5 text-sm" : "px-4 py-3 text-sm"
        }`}
      />
    </label>
  );
}
