"use client";

import Link from "next/link";

export default function CreateCourseCard() {
  return (
    <Link
      href="/courses/create"
      className="transition-all duration-300 ease-in-out rounded-xl border-2 border-dashed border-[var(--border-muted)] bg-[var(--surface-2)] hover:border-primary hover:bg-[var(--surface-muted)] cursor-pointer p-6 h-40 flex flex-col items-center justify-center group"
    >
      <div className="w-12 h-12 rounded-full bg-[var(--surface-muted)] flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
        <svg
          className="w-6 h-6 text-[var(--muted-foreground)] group-hover:text-primary transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <span className="text-sm font-medium text-[var(--muted-foreground)] group-hover:text-[var(--muted-foreground-strong)] transition-colors">
        Create New Course
      </span>
    </Link>
  );
}
