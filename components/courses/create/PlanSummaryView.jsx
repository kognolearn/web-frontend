"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Confidence options for module-level selection
 */
const confidenceOptions = [
  {
    id: "new",
    label: "Unfamiliar",
    description: "Haven't learned this yet",
    baseScore: 0.1,
    color: "bg-red-500",
    activeClass: "bg-red-500/20 text-red-600 border-red-500/30",
  },
  {
    id: "somewhat",
    label: "Still Learning",
    description: "Know some basics",
    baseScore: 0.5,
    color: "bg-yellow-500",
    activeClass: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
  },
  {
    id: "confident",
    label: "Confident",
    description: "Ready for review",
    baseScore: 0.9,
    color: "bg-green-500",
    activeClass: "bg-green-500/20 text-green-600 border-green-500/30",
  },
];

/**
 * Format minutes into readable duration
 */
function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Get exam yield badge styling
 */
function getYieldBadgeClass(yieldLevel) {
  switch (yieldLevel?.toLowerCase()) {
    case "high":
      return "bg-green-500/20 text-green-600";
    case "medium":
      return "bg-yellow-500/20 text-yellow-600";
    case "low":
      return "bg-gray-500/20 text-gray-500";
    default:
      return "bg-gray-500/20 text-gray-500";
  }
}

/**
 * Module card with expandable lesson list and confidence selector
 */
function ModuleCard({
  module,
  isExpanded,
  onToggle,
  selectedConfidence,
  onConfidenceChange,
}) {
  const lessonCount = module.lessons?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] overflow-hidden"
    >
      {/* Module header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Title and metadata */}
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={() => onToggle(!isExpanded)}
              className="flex items-center gap-2 text-left w-full group"
            >
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <svg
                  className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.div>
              <span className="font-medium text-sm text-[var(--foreground)] truncate">
                {module.title}
              </span>
            </button>
            <div className="flex items-center gap-2 mt-1.5 pl-6">
              <span className="text-xs text-[var(--muted-foreground)]">
                {lessonCount} lessons
              </span>
              <span className="text-xs text-[var(--muted-foreground)]">
                {formatDuration(module.estimated_minutes || 0)}
              </span>
              {module.exam_yield && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${getYieldBadgeClass(module.exam_yield)}`}>
                  {module.exam_yield} yield
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Confidence toggles */}
        <div className="flex gap-2">
          {confidenceOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onConfidenceChange(module.id, option.id)}
              className={`
                flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border
                ${
                  selectedConfidence === option.id
                    ? option.activeClass
                    : "bg-[var(--surface-1)] text-[var(--muted-foreground)] border-transparent hover:bg-[var(--surface-muted)]"
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expandable lesson list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[var(--border)]"
          >
            <div className="p-3 space-y-1 max-h-[300px] overflow-y-auto">
              {(module.lessons || []).map((lesson, idx) => (
                <div
                  key={lesson.slug_id || idx}
                  className="flex items-center justify-between py-2 px-3 bg-[var(--surface-1)] rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs text-[var(--muted-foreground)] w-5 shrink-0">
                      {idx + 1}.
                    </span>
                    <span className="text-sm text-[var(--foreground)] truncate">
                      {lesson.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {lesson.estimated_minutes || 30}m
                    </span>
                    {lesson.exam_value >= 8 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600">
                        High exam
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Plan Summary View - Shows unified plan with modules, lessons, and confidence selection
 */
export default function PlanSummaryView({
  planSummary = null,
  moduleConfidenceState = {},
  onModuleConfidenceChange,
  onPlanModify,
  isUpdating = false,
  planModifyError = "",
  isLoading = false,
}) {
  const [expandedModules, setExpandedModules] = useState({});
  const [modifyText, setModifyText] = useState("");

  // Calculate confidence stats
  const confidenceStats = useMemo(() => {
    const counts = { new: 0, somewhat: 0, confident: 0 };
    const modules = planSummary?.modules || [];
    modules.forEach((module) => {
      const mode = moduleConfidenceState[module.id]?.mode || "somewhat";
      counts[mode] = (counts[mode] || 0) + 1;
    });
    return counts;
  }, [planSummary?.modules, moduleConfidenceState]);

  const handleToggleModule = useCallback((moduleId, isExpanded) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: isExpanded,
    }));
  }, []);

  const handleConfidenceChange = useCallback((moduleId, confidenceId) => {
    if (onModuleConfidenceChange) {
      onModuleConfidenceChange(moduleId, confidenceId);
    }
  }, [onModuleConfidenceChange]);

  const handleMarkAllAs = useCallback((confidenceId) => {
    const modules = planSummary?.modules || [];
    modules.forEach((module) => {
      handleConfidenceChange(module.id, confidenceId);
    });
  }, [planSummary?.modules, handleConfidenceChange]);

  const handleModifySubmit = useCallback(() => {
    if (!onPlanModify) return;
    const trimmed = modifyText.trim();
    if (!trimmed) return;
    onPlanModify(trimmed);
    setModifyText("");
  }, [modifyText, onPlanModify]);

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
        <div className="flex items-center justify-center gap-3">
          <div className="relative w-5 h-5">
            <div className="absolute inset-0 border-2 border-[var(--border)] rounded-full" />
            <div className="absolute inset-0 border-2 border-[var(--primary)] rounded-full border-t-transparent animate-spin" />
          </div>
          <span className="text-sm text-[var(--muted-foreground)]">Loading plan...</span>
        </div>
      </div>
    );
  }

  // No plan state
  if (!planSummary || !planSummary.modules || planSummary.modules.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">No plan available.</p>
      </div>
    );
  }

  const { course_title, total_minutes, module_count, lesson_count, modules } = planSummary;

  return (
    <div className="space-y-4">
      {/* Course overview header */}
      <div className="p-4 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
        <h3 className="font-semibold text-base text-[var(--foreground)] mb-2">
          {course_title}
        </h3>
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            {module_count} modules
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {lesson_count} lessons
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatDuration(total_minutes)}
          </span>
        </div>
      </div>

      {/* Confidence summary bar */}
      <div className="flex items-center gap-4 p-3 bg-[var(--surface-2)] rounded-xl">
        <span className="text-xs text-[var(--muted-foreground)]">Your confidence:</span>
        <div className="flex items-center gap-3">
          {confidenceOptions.map((option) => (
            <div key={option.id} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${option.color}`} />
              <span className="text-xs text-[var(--foreground)]">
                {confidenceStats[option.id]} {option.label.toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Module cards with lessons and confidence */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {modules.map((module) => (
          <ModuleCard
            key={module.id}
            module={module}
            isExpanded={expandedModules[module.id] || false}
            onToggle={(expanded) => handleToggleModule(module.id, expanded)}
            selectedConfidence={moduleConfidenceState[module.id]?.mode || "somewhat"}
            onConfidenceChange={handleConfidenceChange}
          />
        ))}
      </div>

      {/* Plan modification input */}
      {onPlanModify && (
        <div className="space-y-2 p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
          <label className="text-xs text-[var(--muted-foreground)]">
            Want to change the plan? Describe edits in plain language.
          </label>
          <textarea
            value={modifyText}
            onChange={(e) => setModifyText(e.target.value)}
            placeholder="e.g., Add more worked examples in Module 2, shorten Module 4"
            rows={2}
            disabled={isUpdating}
            className="w-full px-3 py-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all resize-none"
          />
          {planModifyError && (
            <div className="text-xs text-red-600">{planModifyError}</div>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleModifySubmit}
              disabled={isUpdating || !modifyText.trim()}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {isUpdating ? "Applying…" : "Apply changes"}
            </button>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleMarkAllAs("new")}
          className="flex-1 py-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-[var(--surface-2)] rounded-lg transition-colors"
        >
          Mark all Unfamiliar
        </button>
        <button
          type="button"
          onClick={() => handleMarkAllAs("somewhat")}
          className="flex-1 py-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-[var(--surface-2)] rounded-lg transition-colors"
        >
          Mark all Learning
        </button>
        <button
          type="button"
          onClick={() => handleMarkAllAs("confident")}
          className="flex-1 py-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-[var(--surface-2)] rounded-lg transition-colors"
        >
          Mark all Confident
        </button>
      </div>

      {/* Expand/collapse all */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => {
            const allExpanded = modules.every((m) => expandedModules[m.id]);
            const newState = {};
            modules.forEach((m) => {
              newState[m.id] = !allExpanded;
            });
            setExpandedModules(newState);
          }}
          className="text-xs text-[var(--primary)] hover:underline"
        >
          {modules.every((m) => expandedModules[m.id]) ? "Collapse all lessons" : "Expand all lessons"}
        </button>
      </div>
    </div>
  );
}
