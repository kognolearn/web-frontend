"use client";

import Link from "next/link";

export default function CourseCard({ courseCode, courseName, courseId }) {
  return (
    <Link href={`/courses/${courseId}`}>
      <div className="gradient-border rounded-2xl">
        <div className="card-shell relative rounded-2xl p-6 transition-all duration-300 cursor-pointer h-40 flex flex-col justify-between group overflow-hidden">
          <div className="absolute -top-16 right-0 h-32 w-32 rounded-full bg-primary/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2 group-hover:text-primary transition-colors">
              {courseCode}
            </h3>
            <p className="text-sm text-[var(--muted-foreground)] line-clamp-3">
              {courseName}
            </p>
          </div>
          <div className="relative flex items-center justify-between mt-4 text-xs text-[var(--muted-foreground)]">
            <span className="tracking-wide uppercase">View Course</span>
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
      </div>
    </Link>
  );
}
