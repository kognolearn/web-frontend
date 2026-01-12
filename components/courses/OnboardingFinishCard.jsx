"use client";

import Tooltip from "@/components/ui/Tooltip";

export default function OnboardingFinishCard({ courseName, onContinue, onDelete }) {
  const handleDelete = (event) => {
    event.stopPropagation();
    if (onDelete) onDelete();
  };

  const handleContinue = () => {
    if (onContinue) onContinue();
  };

  const displayName = courseName || "Your Course";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleContinue}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleContinue();
        }
      }}
      aria-label={`Continue setting up ${displayName}`}
      className="relative h-full min-h-[11.5rem] rounded-2xl bg-gradient-to-br from-[var(--surface-1)] to-[var(--surface-2)]/30 border border-[var(--border)] overflow-hidden cursor-pointer transition-all duration-300 group hover:border-[var(--primary)]/50 hover:shadow-xl hover:shadow-[var(--primary)]/10 hover:-translate-y-0.5"
    >
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/0 via-transparent to-[var(--primary)]/0 group-hover:from-[var(--primary)]/8 group-hover:to-[var(--primary)]/3 transition-all duration-300" />

      <div className="relative flex flex-col p-5 h-full">
        {/* Header with title and delete button */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-[var(--foreground)] line-clamp-2 leading-snug group-hover:text-[var(--primary)] transition-colors duration-200 flex-1 pr-2">
            {displayName}
          </h3>

          {/* Delete button */}
          <div className="flex items-center shrink-0 -mt-1 -mr-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300">
            <Tooltip content="Delete" position="bottom">
              <button
                type="button"
                onClick={handleDelete}
                className="p-2 rounded-xl text-[var(--muted-foreground)] hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                aria-label="Delete draft course"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Status section */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30">
              <svg className="h-3 w-3 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
              </svg>
            </div>
            <span className="text-xs text-[var(--muted-foreground)]">
              Setup incomplete
            </span>
          </div>
        </div>

        {/* Footer action */}
        <div className="pt-3 border-t border-[var(--border)]/70">
          <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium text-[var(--primary)] bg-[var(--primary)]/10 border border-[var(--primary)]/20 group-hover:bg-[var(--primary)]/15 group-hover:border-[var(--primary)]/30 transition-all duration-200">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            Continue Setup
          </div>
        </div>
      </div>
    </div>
  );
}
