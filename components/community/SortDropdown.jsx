"use client";

import { useState } from "react";

export default function SortDropdown({ sortBy, timeRange, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const sortOptions = [
    { value: "recent", label: "Recent" },
    { value: "top", label: "Top" },
  ];

  const timeRangeOptions = [
    { value: "hour", label: "Past Hour" },
    { value: "day", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "all", label: "All Time" },
  ];

  const currentSortLabel = sortOptions.find(o => o.value === sortBy)?.label || "Recent";
  const currentTimeLabel = timeRangeOptions.find(o => o.value === timeRange)?.label;

  const handleSortChange = (newSort) => {
    onChange(newSort, newSort === "top" ? (timeRange || "all") : null);
    if (newSort !== "top") {
      setIsOpen(false);
    }
  };

  const handleTimeRangeChange = (newTimeRange) => {
    onChange("top", newTimeRange);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
      >
        <svg className="w-4 h-4 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
        <span>{currentSortLabel}</span>
        {sortBy === "top" && currentTimeLabel && (
          <span className="text-[var(--muted-foreground)]">· {currentTimeLabel}</span>
        )}
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] shadow-lg z-20 overflow-hidden">
            {/* Sort options */}
            <div className="p-1 border-b border-[var(--border)]">
              <p className="px-3 py-1 text-xs text-[var(--muted-foreground)] font-medium">Sort by</p>
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSortChange(option.value)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    sortBy === option.value
                      ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                      : 'text-[var(--foreground)] hover:bg-[var(--surface-2)]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Time range options (only for "top") */}
            {sortBy === "top" && (
              <div className="p-1">
                <p className="px-3 py-1 text-xs text-[var(--muted-foreground)] font-medium">Time Range</p>
                {timeRangeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleTimeRangeChange(option.value)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      timeRange === option.value
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                        : 'text-[var(--foreground)] hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
