"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

/**
 * Confidence options for module-level selection
 */
const confidenceOptions = [
  {
    id: "new",
    label: "Unfamiliar",
    description: "Haven't learned this yet",
    color: "bg-red-500",
    activeClass: "bg-red-500/20 text-red-600 border-red-500/30",
  },
  {
    id: "somewhat",
    label: "Still Learning",
    description: "Know some basics",
    color: "bg-yellow-500",
    activeClass: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
  },
  {
    id: "confident",
    label: "Confident",
    description: "Ready for review",
    color: "bg-green-500",
    activeClass: "bg-green-500/20 text-green-600 border-green-500/30",
  },
];

/**
 * Individual module confidence card
 */
function ModuleConfidenceCard({ module, selectedMode, onModeChange }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
    >
      {/* Module info */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium text-sm text-[var(--foreground)] truncate flex-1">
          {module.title}
        </span>
        <span className="text-xs text-[var(--muted-foreground)] bg-[var(--surface-muted)] px-2 py-0.5 rounded-full ml-2">
          {module.subtopics.length} topics
        </span>
      </div>

      {/* Confidence toggles */}
      <div className="flex gap-2">
        {confidenceOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onModeChange(module.id, option.id)}
            className={`
              flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border
              ${
                selectedMode === option.id
                  ? option.activeClass
                  : "bg-[var(--surface-1)] text-[var(--muted-foreground)] border-transparent hover:bg-[var(--surface-muted)]"
              }
            `}
          >
            {option.label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Confidence editor adapted for chat UI - compact module cards with toggle buttons
 */
export default function ConfidenceEditorChat({
  overviewTopics = [],
  moduleConfidenceState = {},
  onModuleModeChange,
}) {
  // Calculate summary stats
  const stats = useMemo(() => {
    const counts = { new: 0, somewhat: 0, confident: 0 };
    overviewTopics.forEach((module) => {
      const mode = moduleConfidenceState[module.id]?.mode || "somewhat";
      counts[mode] = (counts[mode] || 0) + 1;
    });
    return counts;
  }, [overviewTopics, moduleConfidenceState]);

  if (overviewTopics.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">No modules to rate.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 p-3 bg-[var(--surface-2)] rounded-xl">
        <span className="text-xs text-[var(--muted-foreground)]">Summary:</span>
        <div className="flex items-center gap-3">
          {confidenceOptions.map((option) => (
            <div key={option.id} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${option.color}`} />
              <span className="text-xs text-[var(--foreground)]">
                {stats[option.id]} {option.label.toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Module cards */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        {overviewTopics.map((module, index) => (
          <ModuleConfidenceCard
            key={module.id}
            module={module}
            selectedMode={moduleConfidenceState[module.id]?.mode || "somewhat"}
            onModeChange={onModuleModeChange}
          />
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            overviewTopics.forEach((module) => onModuleModeChange(module.id, "new"));
          }}
          className="flex-1 py-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-[var(--surface-2)] rounded-lg transition-colors"
        >
          Mark all Unfamiliar
        </button>
        <button
          type="button"
          onClick={() => {
            overviewTopics.forEach((module) => onModuleModeChange(module.id, "somewhat"));
          }}
          className="flex-1 py-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-[var(--surface-2)] rounded-lg transition-colors"
        >
          Mark all Learning
        </button>
        <button
          type="button"
          onClick={() => {
            overviewTopics.forEach((module) => onModuleModeChange(module.id, "confident"));
          }}
          className="flex-1 py-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-[var(--surface-2)] rounded-lg transition-colors"
        >
          Mark all Confident
        </button>
      </div>
    </div>
  );
}
