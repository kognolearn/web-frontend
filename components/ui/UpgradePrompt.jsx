"use client";

import Link from "next/link";

export default function UpgradePrompt({
  resourceType = "resource",
  current = 0,
  limit = 1,
  className = "",
}) {
  const resourceLabels = {
    course: "course",
    courses: "courses",
    midterm: "midterm exam",
    midterms: "midterm exams",
    final: "final exam",
    finals: "final exams",
    cheatsheet: "cheatsheet",
    cheatsheets: "cheatsheets",
  };

  const label = resourceLabels[resourceType] || resourceType;

  return (
    <div
      className={`bg-[var(--accent)]/10 border border-[var(--accent)] rounded-lg p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-[var(--accent)]/20 rounded-full flex items-center justify-center">
          <svg
            className="w-5 h-5 text-[var(--accent)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>

        <div className="flex-1">
          <h4 className="font-semibold text-[var(--text-primary)] mb-1">
            Free Tier Limit Reached
          </h4>
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            You've used {current} of {limit} {label} available on the free plan.
            Upgrade to Pro for unlimited access.
          </p>

          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
          >
            Upgrade to Pro
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
