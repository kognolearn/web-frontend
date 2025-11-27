"use client";

import Link from "next/link";

export default function CreateCourseCard() {
  return (
    <Link href="/courses/create" className="block rounded-2xl transition-all duration-200 ease-in-out">
      <div className="card relative rounded-2xl p-6 h-40 flex flex-col items-center justify-center cursor-pointer group overflow-hidden">
        <div className="relative w-14 h-14 rounded-full flex items-center justify-center mb-3"
             style={{backgroundColor: 'color-mix(in srgb, var(--primary) 16%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 40%, var(--border))'}}>
          <svg
            className="w-7 h-7"
            style={{color: 'var(--primary)'}}
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
          Build study plan
        </span>
      </div>
    </Link>
  );
}
