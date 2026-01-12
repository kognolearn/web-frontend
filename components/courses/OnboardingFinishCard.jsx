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

  const title = courseName
    ? `Finish generating your ${courseName} course`
    : "Finish generating your course";

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
      aria-label={title}
      className="relative h-full min-h-[11.5rem] rounded-2xl border border-[var(--primary)]/35 bg-gradient-to-br from-[var(--surface-1)] to-[var(--surface-2)]/70 overflow-hidden cursor-pointer transition-all duration-300 group hover:border-[var(--primary)]/60 hover:shadow-xl hover:shadow-[var(--primary)]/15 hover:-translate-y-0.5"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 via-transparent to-[var(--primary)]/10 opacity-80" />
      <div className="relative flex flex-col p-5 h-full">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/20 text-[var(--primary)]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h6m0 0v6m0-6L10 17l-5-5" />
              </svg>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]/80">
                Continue onboarding
              </p>
              <h3 className="text-base font-semibold text-[var(--foreground)] line-clamp-2">
                {title}
              </h3>
            </div>
          </div>

          <Tooltip content="Delete" position="bottom">
            <button
              type="button"
              onClick={handleDelete}
              className="p-2 rounded-xl text-[var(--muted-foreground)] hover:text-rose-500 hover:bg-rose-500/10 transition-all"
              aria-label="Delete onboarding continuation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </Tooltip>
        </div>

        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
          Pick up where you left off. We&apos;ll keep your preview lesson and progress intact.
        </p>

        <div className="flex-1" />

        <div className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
          Continue generating
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
