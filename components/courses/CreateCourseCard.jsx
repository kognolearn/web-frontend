"use client";

import Link from "next/link";

export default function CreateCourseCard() {
  return (
    <Link
      href="/courses/create"
      className="gradient-border rounded-2xl transition-all duration-300 ease-in-out"
    >
      <div className="card-shell relative rounded-2xl p-6 h-40 flex flex-col items-center justify-center cursor-pointer group overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mb-3 shadow-inner">
          <svg
            className="w-7 h-7 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <span className="relative text-sm font-semibold text-[var(--foreground)] tracking-wide">
          Create New Course
        </span>
        <span className="relative mt-1 text-xs uppercase text-[var(--muted-foreground)]">
          Generate study plan
        </span>
      </div>
    </Link>
  );
}
