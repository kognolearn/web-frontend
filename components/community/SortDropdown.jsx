"use client";

import { useState } from "react";

export default function SortDropdown({ sortBy, timeRange, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const sortOptions = [
    { value: "recent", label: "Recent", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { value: "top", label: "Top", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  ];

  const timeRangeOptions = [
    { value: "hour", label: "Last Hour" },
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
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] hover:border-[var(--border-hover)] transition-all"
      >
        <svg className="w-4 h-4 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
        <span>{currentSortLabel}</span>
        {sortBy === "top" && currentTimeLabel && (
          <span className="text-xs text-[var(--muted-foreground)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded">{currentTimeLabel}</span>
        )}
        <svg className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-xl z-20 overflow-hidden">
            {/* Sort options */}
            <div className="p-2 border-b border-[var(--border)]">
              <p className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold">Sort by</p>
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSortChange(option.value)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2.5 ${
                    sortBy === option.value
                      ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-medium'
                      : 'text-[var(--foreground)] hover:bg-[var(--surface-2)]'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={option.icon} />
                  </svg>
                  {option.label}
                  {sortBy === option.value && (
                    <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* Time range options (only for "top") */}
            {sortBy === "top" && (
              <div className="p-2">
                <p className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold">Time Range</p>
                {timeRangeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleTimeRangeChange(option.value)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                      timeRange === option.value
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-medium'
                        : 'text-[var(--foreground)] hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    {option.label}
                    {timeRange === option.value && (
                      <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
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
