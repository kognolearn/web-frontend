"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Tooltip from "@/components/ui/Tooltip";

export default function CourseCard({ courseCode, courseName, courseId, secondsToComplete, status, onDelete, topicsProgress }) {
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

  const handleCheatsheetClick = (e) => {
    e.stopPropagation();
    router.push(`/courses/${courseId}/cheatsheet`);
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

  const MAX_VISIBLE_SECONDS = 100 * 60 * 60;

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
  const shouldShowTimeRemaining = !isCompleted && typeof secondsToComplete === "number" && secondsToComplete <= MAX_VISIBLE_SECONDS;
  const topicProgressValue = typeof topicsProgress === "number" ? Math.min(1, Math.max(0, topicsProgress)) : null;
  const topicProgressPercent = topicProgressValue !== null ? Math.round(topicProgressValue * 100) : null;
  const timeLabel = isCompleted ? "Done" : shouldShowTimeRemaining ? formatTimeRemaining(secondsToComplete) : null;
  const isPending = status === 'pending';

  // Pending/Building state - show a special loading card
  if (isPending) {
    return (
      <div
        role="button"
        tabIndex={-1}
        aria-label={`Course ${courseCode} is being built`}
        className="relative rounded-2xl flex flex-col overflow-hidden bg-[var(--surface-1)] border border-amber-500/20"
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 via-transparent to-amber-500/5" />
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-amber-500/8 to-transparent transform -skew-x-12 animate-[shimmer_2.5s_linear_infinite]" style={{ width: '50%' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col p-4">
          {/* Header with title and status */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-lg font-bold text-[var(--foreground)] line-clamp-2 leading-tight flex-1">
              {courseCode}
            </h3>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Building</span>
            </div>
          </div>
          
          {/* Loading indicator */}
          <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-amber-500/50 to-amber-400 animate-[loading_1.5s_ease-in-out_infinite]" />
          </div>
        </div>

        <style jsx>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%) skewX(-12deg); }
            100% { transform: translateX(300%) skewX(-12deg); }
          }
          @keyframes loading {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(200%); }
            100% { transform: translateX(-100%); }
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
      className="relative h-full min-h-[11.5rem] rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden cursor-pointer transition-all duration-200 group hover:border-[var(--primary)]/40 hover:shadow-lg hover:shadow-[var(--primary)]/5"
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/0 to-[var(--primary)]/0 group-hover:from-[var(--primary)]/5 group-hover:to-transparent transition-all duration-300" />

      <div className="relative flex flex-col p-4 h-full">
        {/* Header with title and actions */}
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Title section */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-[var(--foreground)] line-clamp-2 leading-tight group-hover:text-[var(--primary)] transition-colors duration-200">
              {courseCode}
            </h3>
            {courseName && (
              <p className="text-sm text-[var(--muted-foreground)] mt-1 line-clamp-1">{courseName}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
            <Tooltip content={shareCopied ? "Copied!" : "Share"} position="bottom">
              <button
                onClick={handleShareClick}
                className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-all"
                aria-label="Share course"
              >
                {shareCopied ? (
                  <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                )}
              </button>
            </Tooltip>
            <Tooltip content="Delete" position="bottom">
              <button
                onClick={handleDeleteClick}
                className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-rose-500 hover:bg-rose-500/10 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Footer pinned to bottom */}
        <div className="mt-auto pt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--muted-foreground)]">
            <span>Progress</span>
            <div className="flex items-center gap-2">
              {topicProgressPercent !== null ? (
                <span className="text-xs font-bold text-[var(--foreground)]">{topicProgressPercent}%</span>
              ) : (
                <span className="text-xs font-medium text-[var(--muted-foreground)]">Calibrating</span>
              )}
              {timeLabel && (
                <>
                  <span className="text-[var(--border)]">•</span>
                  <span className="text-xs font-medium text-[var(--muted-foreground)] flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {timeLabel}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
            {topicProgressValue !== null ? (
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, topicProgressValue * 100))}%`,
                  background: isCompleted 
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : 'linear-gradient(90deg, rgba(var(--primary-rgb), 0.7), var(--primary))',
                }}
              />
            ) : (
              <div className="h-full w-full animate-pulse bg-gradient-to-r from-[var(--surface-2)] via-[var(--primary)]/20 to-[var(--surface-2)]" />
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleCheatsheetClick}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold text-[var(--muted-foreground)] bg-[var(--surface-2)]/80 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Cheatsheet
            </button>
            <button
              onClick={handleReviewClick}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold text-[var(--muted-foreground)] bg-[var(--surface-2)]/80 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Review
            </button>
            <Tooltip content="Open course" position="bottom">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openCourse();
                }}
                className="p-2 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-all"
                aria-label="Open course"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
