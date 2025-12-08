"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Tooltip from "@/components/ui/Tooltip";

export default function CourseCard({ courseCode, courseName, courseId, secondsToComplete, status, onDelete }) {
  const router = useRouter();
  const shareLink = `https://www.kognolearn.com/share/${courseId}`;
  const [shareCopied, setShareCopied] = useState(false);
  const shareResetRef = useRef(null);

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete();
  };

  const handleShareClick = (e) => {
    e.stopPropagation();
    const fallbackOpen = () => {
      if (typeof window !== "undefined") {
        window.open(shareLink, "_blank", "noopener,noreferrer");
      }
    };

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareLink)
        .then(() => {
          setShareCopied(true);
          if (shareResetRef.current) clearTimeout(shareResetRef.current);
          shareResetRef.current = setTimeout(() => setShareCopied(false), 1600);
        })
        .catch(fallbackOpen);
    } else {
      fallbackOpen();
    }
  };

  const handleReviewClick = (e) => {
    e.stopPropagation();
    router.push(`/courses/${courseId}/review`);
  };

  const openCourse = (e) => {
    // Don't navigate if course is still building or needs attention
    if (status === 'pending' || status === 'needs_attention') return;
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
        className="relative rounded-2xl p-5 h-44 flex flex-col overflow-hidden backdrop-blur-xl bg-[var(--surface-1)] border border-amber-500/30 shadow-lg shadow-amber-500/5"
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-500/10" />
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-amber-500/5 to-transparent transform -skew-x-12 animate-[shimmer_2.5s_linear_infinite]" style={{ width: '50%' }} />
        </div>

        {/* Top section */}
        <div className="relative z-10 flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10">
            {/* Animated building icon */}
            <svg className="w-5 h-5 text-amber-500 dark:text-amber-400 animate-[pulse_2s_ease-in-out_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Building</span>
          </div>
        </div>

        {/* Title */}
        <div className="relative z-10 flex-1">
          <h3 className="text-base font-semibold text-[var(--foreground)] line-clamp-2 leading-snug">
            {courseCode}
          </h3>
          <p className="text-xs text-[var(--muted-foreground)] mt-1.5">
            Creating your personalized course...
          </p>
        </div>

        <style jsx>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%) skewX(-12deg); }
            100% { transform: translateX(300%) skewX(-12deg); }
          }
        `}</style>
      </div>
    );
  }

  // Needs attention/Failed state - show error card with instructions
  if (needsAttention) {
    return (
      <div
        role="article"
        aria-label={`Course ${courseCode} failed to generate`}
        className="relative rounded-2xl p-5 h-44 flex flex-col overflow-hidden backdrop-blur-xl bg-[var(--surface-1)] border border-rose-500/30 shadow-lg shadow-rose-500/5"
      >
        {/* Error gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-rose-500/10" />

        {/* Top section */}
        <div className="relative z-10 flex items-start justify-between mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-500/10">
            {/* Error icon */}
            <svg className="w-5 h-5 text-rose-500 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/20">
              <span className="text-xs font-medium text-rose-600 dark:text-rose-400">Failed</span>
            </div>
            <Tooltip content="Delete this course" position="bottom">
              <button
                onClick={handleDeleteClick}
                className="p-1.5 rounded-full hover:bg-rose-500/10 text-[var(--muted-foreground)] hover:text-rose-500 transition-colors z-20"
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
          <h3 className="text-base font-semibold text-[var(--foreground)] line-clamp-1 leading-snug">
            {courseCode}
          </h3>
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
            Course generation failed
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">
            Please report this issue using the feedback button, then delete this course and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
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
        className="relative rounded-2xl p-5 h-40 flex flex-col cursor-pointer overflow-hidden group transition-all duration-300 hover:shadow-2xl backdrop-blur-xl bg-[var(--surface-1)] border border-[var(--border)] shadow-lg"
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 via-transparent to-[var(--primary)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Shine effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute -inset-full top-0 block w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 group-hover:animate-shine" />
      </div>

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
          <Tooltip content={shareCopied ? "Link copied" : "Copy share link"} position="bottom">
            <button
              onClick={handleShareClick}
              className="p-1.5 rounded-full hover:bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
              aria-label="Share course"
            >
              {shareCopied ? (
                <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 6l-4-4-4 4" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v14" />
                </svg>
              )}
            </button>
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
      <div className="relative z-10 flex items-center justify-between pt-3 border-t border-[var(--border)]">
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
    
      {/* Review Tab - sits below the card */}
      <button
        onClick={handleReviewClick}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--primary)] text-[var(--muted-foreground)] hover:text-white border border-[var(--border)] hover:border-[var(--primary)] transition-all duration-200 text-sm font-medium"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Review
      </button>
    </div>
  );
}
