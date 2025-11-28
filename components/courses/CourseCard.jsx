"use client";

import { useRouter } from "next/navigation";
import Tooltip from "@/components/ui/Tooltip";

export default function CourseCard({ courseCode, courseName, courseId, secondsToComplete, status, onDelete }) {
  const router = useRouter();

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete();
  };

  const openCourse = (e) => {
    // Don't navigate if course is still building
    if (status === 'pending') return;
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
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const isCompleted = !secondsToComplete || secondsToComplete <= 0;
  const isPending = status === 'pending';
  const needsAttention = status === 'needs_attention';

  // Pending/Building state - show a special loading card
  if (isPending) {
    return (
      <div
        role="button"
        tabIndex={-1}
        aria-label={`Course ${courseCode} is being built`}
        className="relative rounded-2xl p-5 h-44 flex flex-col overflow-hidden backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-lg"
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 via-transparent to-[var(--primary)]/10 animate-pulse" />
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-full top-0 block w-1/2 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 animate-shimmer" />
        </div>

        {/* Top section */}
        <div className="relative z-10 flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--primary)]/10">
            {/* Animated loading spinner */}
            <svg className="w-5 h-5 text-[var(--primary)] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Building
          </span>
        </div>

        {/* Title */}
        <div className="relative z-10 flex-1">
          <h3 className="text-base font-semibold text-[var(--foreground)] line-clamp-2 leading-snug">
            {courseCode}
          </h3>
          <p className="text-xs text-[var(--muted-foreground)] mt-1.5 animate-pulse">
            Creating your personalized course...
          </p>
        </div>

        {/* Bottom section with progress indicator */}
        <div className="relative z-10 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-[var(--primary)] rounded-full animate-pulse" style={{ animation: 'pulse 1.5s ease-in-out infinite, moveProgress 2s ease-in-out infinite' }} />
            </div>
            <span className="text-xs text-[var(--muted-foreground)]">Processing</span>
          </div>
        </div>

        <style jsx>{`
          @keyframes moveProgress {
            0%, 100% { width: 20%; margin-left: 0; }
            50% { width: 40%; margin-left: 30%; }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%) skewX(-12deg); }
            100% { transform: translateX(200%) skewX(-12deg); }
          }
          .animate-shimmer {
            animation: shimmer 2.5s infinite;
          }
        `}</style>
      </div>
    );
  }

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
      className="relative rounded-2xl p-5 h-44 flex flex-col cursor-pointer overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-lg"
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 via-transparent to-[var(--primary)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Shine effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute -inset-full top-0 block w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 group-hover:animate-shine" />
      </div>

      {/* Top section with icon and status */}
      <div className="relative z-10 flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--primary)]/10 group-hover:bg-[var(--primary)]/20 transition-colors">
          <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content={needsAttention ? 'Course generation encountered an issue' : isCompleted ? 'You\'ve finished this course!' : 'Time remaining to complete this course'} position="bottom">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              needsAttention 
                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                : isCompleted 
                ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
                : 'bg-[var(--primary)]/10 text-[var(--primary)]'
            }`}>
              {needsAttention ? 'Needs Attention' : isCompleted ? 'Complete' : 'In Progress'}
            </span>
          </Tooltip>
          <Tooltip content="Delete this course" position="bottom">
            <button
              onClick={handleDeleteClick}
              className="p-1.5 rounded-full hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-500 transition-colors z-20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Title */}
      <div className="relative z-10 flex-1">
        <h3 className="text-base font-semibold text-[var(--foreground)] line-clamp-2 group-hover:text-[var(--primary)] transition-colors duration-200 leading-snug">
          {courseCode}
        </h3>
        {needsAttention && (
          <p className="text-xs text-rose-500 mt-1">
            There was an issue generating this course
          </p>
        )}
      </div>

      {/* Bottom section with time and action */}
      <div className="relative z-10 flex items-center justify-between pt-3 border-t border-white/10">
        <div className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{formatTimeRemaining(secondsToComplete)}</span>
        </div>
        <div className="flex items-center gap-1 text-sm font-medium text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors duration-200">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">Study</span>
          <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
