"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { authFetch } from "@/lib/api";

// Icon components for each milestone type
const MilestoneIcons = {
  "book-plus": (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  "check-circle": (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  trophy: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  flame: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
  ),
  fire: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  star: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  "file-check": (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  medal: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
};

function MilestoneCard({ milestone, isLast }) {
  const Icon = MilestoneIcons[milestone.icon] || MilestoneIcons["check-circle"];

  return (
    <div className="relative flex gap-4">
      {/* Timeline connector */}
      {!isLast && (
        <div
          className={`absolute left-5 top-12 w-0.5 h-[calc(100%-24px)] ${
            milestone.achieved ? "bg-[var(--primary)]" : "bg-[var(--border)]"
          }`}
        />
      )}

      {/* Icon circle */}
      <div
        className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          milestone.achieved
            ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30"
            : "bg-[var(--surface-2)] text-[var(--muted-foreground)] border border-[var(--border)]"
        }`}
      >
        {Icon}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4
              className={`font-semibold ${
                milestone.achieved
                  ? "text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)]"
              }`}
            >
              {milestone.title}
            </h4>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
              {milestone.description}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Image
              src="/images/seed_icon.png"
              alt="Seeds"
              width={16}
              height={16}
              className={milestone.achieved ? "" : "opacity-50 grayscale"}
            />
            <span
              className={`text-sm font-semibold ${
                milestone.achieved
                  ? "text-[var(--primary)]"
                  : "text-[var(--muted-foreground)]"
              }`}
            >
              +{milestone.seeds}
            </span>
          </div>
        </div>

        {milestone.achieved && milestone.achievedAt && (
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Achieved {new Date(milestone.achievedAt).toLocaleDateString()}
          </p>
        )}

        {milestone.repeatable && milestone.achieved && (
          <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
            Repeatable
          </span>
        )}
      </div>
    </div>
  );
}

function CategorySection({ category }) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-4">
        {category.title}
      </h3>
      <div>
        {category.milestones.map((milestone, index) => (
          <MilestoneCard
            key={milestone.key}
            milestone={milestone}
            isLast={index === category.milestones.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

export default function MilestonesTimeline({ collapsed = false }) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({ total: 0, achieved: 0 });
  const [isExpanded, setIsExpanded] = useState(!collapsed);

  const fetchMilestones = useCallback(async () => {
    try {
      const res = await authFetch("/api/seeds/milestones/all");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setStats(data.stats || { total: 0, achieved: 0 });
      }
    } catch (err) {
      console.error("Failed to fetch milestones:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-[var(--surface-2)] rounded mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--surface-2)]" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-[var(--surface-2)] rounded mb-2" />
                  <div className="h-3 w-48 bg-[var(--surface-2)] rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = stats.total > 0 ? (stats.achieved / stats.total) * 100 : 0;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-[var(--surface-2)]/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--primary)]/20 text-[var(--primary)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div className="text-left">
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              Milestones
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              {stats.achieved} of {stats.total} completed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Progress bar */}
          <div className="hidden sm:block w-32">
            <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--primary)] rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Expand/collapse icon */}
          <svg
            className={`w-5 h-5 text-[var(--muted-foreground)] transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 sm:px-6 pb-6 border-t border-[var(--border)]">
          {/* Mobile progress bar */}
          <div className="sm:hidden py-4">
            <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--primary)] rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="pt-4 sm:pt-6">
            {categories.length === 0 ? (
              <p className="text-center text-[var(--muted-foreground)] py-8">
                No milestones available yet.
              </p>
            ) : (
              categories.map((category) => (
                <CategorySection key={category.title} category={category} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
