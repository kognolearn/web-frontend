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
        className="relative h-full min-h-[11.5rem] rounded-2xl flex flex-col overflow-hidden bg-gradient-to-br from-[var(--surface-1)] to-[var(--surface-2)]/50 border border-amber-500/30"
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5" />
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-amber-400/10 to-transparent transform -skew-x-12 animate-[shimmer_2s_linear_infinite]" style={{ width: '50%' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col p-5 h-full">
          {/* Building badge */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/25">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Building</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold text-[var(--foreground)] line-clamp-2 leading-snug mb-auto">
            {courseCode}
          </h3>
          
          {/* Loading indicator */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--muted-foreground)]">Generating content...</span>
            </div>
            <div className="h-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
              <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-amber-500 to-orange-400 animate-[loading_1.5s_ease-in-out_infinite]" />
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%) skewX(-12deg); }
            100% { transform: translateX(300%) skewX(-12deg); }
          }
          @keyframes loading {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(150%); }
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
      className="relative h-full min-h-[11.5rem] rounded-2xl bg-gradient-to-br from-[var(--surface-1)] to-[var(--surface-2)]/30 border border-[var(--border)] overflow-hidden cursor-pointer transition-all duration-300 group hover:border-[var(--primary)]/50 hover:shadow-xl hover:shadow-[var(--primary)]/10 hover:-translate-y-0.5"
    >
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/0 via-transparent to-[var(--primary)]/0 group-hover:from-[var(--primary)]/8 group-hover:to-[var(--primary)]/3 transition-all duration-300" />

      <div className="relative flex flex-col p-5 h-full">
        {/* Time badge - top right */}
        {timeLabel && (
          <div className="absolute top-3 right-3 z-10 transition-all duration-300 ease-out opacity-0 md:opacity-100 md:group-hover:-translate-x-8 md:group-hover:opacity-0">
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
              isCompleted 
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' 
                : 'bg-[var(--surface-muted)] text-[var(--foreground)] border border-[var(--border)]'
            }`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {timeLabel}
            </div>
          </div>
        )}

        {/* Header with title and actions */}
        <div className="flex items-start justify-between gap-3">
          <h3 className={`text-base font-semibold text-[var(--foreground)] line-clamp-2 leading-snug group-hover:text-[var(--primary)] transition-colors duration-200 flex-1 ${timeLabel ? 'pr-28' : ''}`}>
            {courseCode}
          </h3>

          {/* Action buttons - shown on hover, replaces time badge position */}
          <div className={`flex items-center gap-0.5 transition-all duration-300 ease-out shrink-0 -mt-1 ${
            timeLabel 
              ? 'absolute top-3 right-3 z-20 translate-x-0 opacity-100 md:translate-x-4 md:opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100' 
              : 'opacity-100 md:opacity-0 md:group-hover:opacity-100 -mr-1'
          }`}>
            <Tooltip content={shareCopied ? "Copied!" : "Share"} position="bottom">
              <button
                onClick={handleShareClick}
                className="p-2 rounded-xl text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-all"
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
                className="p-2 rounded-xl text-[var(--muted-foreground)] hover:text-rose-500 hover:bg-rose-500/10 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Spacer to push content down - absorbs extra space when title is short */}
        <div className="flex-1" />

        {/* Progress section - stays at constant position above footer */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--foreground)]/70">Progress</span>
            {topicProgressPercent !== null ? (
              <span className={`font-semibold ${isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-[var(--foreground)]'}`}>
                {topicProgressPercent}%
              </span>
            ) : (
              <span className="text-[var(--foreground)]/50">Calibrating</span>
            )}
          </div>
          <div className="h-1.5 rounded-full bg-[var(--surface-muted)] border border-[var(--border)]/30 overflow-hidden">
            {topicProgressValue !== null ? (
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, topicProgressValue * 100))}%`,
                  background: isCompleted 
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : 'var(--primary)',
                }}
              />
            ) : (
              <div className="h-full w-full animate-pulse bg-gradient-to-r from-[var(--surface-2)] via-[var(--primary)]/20 to-[var(--surface-2)]" />
            )}
          </div>
        </div>

        {/* Footer with actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-[var(--border)]/70">
          <button
            onClick={handleCheatsheetClick}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium text-[var(--foreground)] bg-[var(--surface-muted)]/70 border border-[var(--border)]/50 hover:bg-[var(--primary)]/15 hover:text-[var(--primary)] hover:border-[var(--primary)]/30 transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Cheatsheet
          </button>
          <button
            onClick={handleReviewClick}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium text-[var(--foreground)] bg-[var(--surface-muted)]/70 border border-[var(--border)]/50 hover:bg-[var(--primary)]/15 hover:text-[var(--primary)] hover:border-[var(--primary)]/30 transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Review
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openCourse();
            }}
            className="p-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-[var(--primary)]/20"
            aria-label="Open course"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
