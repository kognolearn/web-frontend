"use client";

import Link from "next/link";

export default function CourseCard({ courseCode, courseName, courseId }) {
  return (
    <Link href={`/courses/${courseId}`}>
      <div className="rounded-xl border border-[var(--border-muted)] bg-[var(--surface-1)] p-6 hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer h-40 flex flex-col justify-between group">
        <div>
          <h3 className="text-lg font-bold text-[var(--foreground)] mb-2 group-hover:text-primary transition-colors">
            {courseCode}
          </h3>
          <p className="text-sm text-[var(--muted-foreground)] line-clamp-3">
            {courseName}
          </p>
        </div>
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-[var(--muted-foreground)]">View Course</span>
          <svg
            className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-primary transition-colors"
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
        </div>
      </div>
    </Link>
  );
}
