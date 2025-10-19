"use client";

import Link from "next/link";

export default function CourseCard({ courseCode, courseName, courseId }) {
  return (
    <Link href={`/courses/${courseId}`}>
      <div className="card relative rounded-2xl p-6 transition-all duration-200 cursor-pointer h-40 flex flex-col justify-between group overflow-hidden">
        <div className="relative">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2 group-hover:text-[var(--primary)] transition-colors">
            {courseCode}
          </h3>
          <p className="text-sm text-[var(--muted-foreground)] line-clamp-3">
            {courseName}
          </p>
        </div>
        <div className="relative flex items-center justify-between mt-4 text-xs text-[var(--muted-foreground)]">
          <span className="tracking-wide uppercase">View Course</span>
          <svg
            className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors"
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
