"use client";

import { useRouter } from "next/navigation";

export default function CourseCard({ courseCode, courseName, courseId, secondsToComplete }) {
  const router = useRouter();

  const openCourse = (e) => {
    // Prevent clicks from nested interactive elements if any
    if (e) {
      e.stopPropagation();
    }
    router.push(`/courses/${courseId}`);
  };

  const formatTimeRemaining = (seconds) => {
    if (!seconds || seconds <= 0) return "Completed";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openCourse}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openCourse();
        }
      }}
      aria-label={`Open course ${courseCode}`}
      className="relative rounded-2xl p-6 h-44 flex flex-col justify-between cursor-pointer overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-lg"
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 via-transparent to-[var(--primary)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      {/* Shine effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute -inset-full top-0 block w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 group-hover:animate-shine" />
      </div>

      <div className="relative z-10">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2 line-clamp-2 group-hover:text-[var(--primary)] transition-colors duration-200">
          {courseCode}
        </h3>
        <div className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{formatTimeRemaining(secondsToComplete)}</span>
        </div>
      </div>

      {/* Bottom arrow indicator */}
      <div className="relative z-10 flex items-center justify-end">
        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors duration-200">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">Open</span>
          <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
