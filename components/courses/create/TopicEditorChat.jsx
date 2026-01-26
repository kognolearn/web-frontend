"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Collapsible module accordion for topic display
 */
function ModuleAccordion({
  module,
  isOpen,
  onToggle,
  onDeleteSubtopic,
  onDeleteAll,
}) {
  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      {/* Module header */}
      <button
        type="button"
        onClick={() => onToggle(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-[var(--surface-2)] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <svg
              className="w-4 h-4 text-[var(--muted-foreground)]"
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
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--muted-foreground)] bg-[var(--surface-muted)] px-2 py-0.5 rounded-full">
            {module.subtopics.length} topics
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteAll(module.id);
            }}
            className="p-1 text-[var(--muted-foreground)] hover:text-[var(--danger)] transition-colors"
            title="Remove all topics in this module"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </button>

      {/* Subtopics list */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1">
              {module.subtopics.map((subtopic) => (
                <div
                  key={subtopic.id}
                  className="flex items-center justify-between py-2 px-3 bg-[var(--surface-2)] rounded-lg group"
                >
                  <span className="text-sm text-[var(--foreground)] truncate flex-1">
                    {subtopic.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteSubtopic(module.id, subtopic.id)}
                    className="p-1 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 hover:text-[var(--danger)] transition-all"
                    title="Remove topic"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Topic editor adapted for chat UI - displays topics in collapsible cards
 */
export default function TopicEditorChat({
  overviewTopics = [],
  deletedSubtopics = [],
  onDeleteSubtopic,
  onDeleteAllSubtopics,
  onRestoreSubtopic,
  onRestoreAll,
  onAddTopic,
  onRegenerate,
  isLoading = false,
  outdatedMessage = "",
}) {
  const [openModules, setOpenModules] = useState({});
  const [newTopicTitle, setNewTopicTitle] = useState("");

  const totalTopics = overviewTopics.reduce((sum, m) => sum + m.subtopics.length, 0);

  const handleToggleModule = useCallback((moduleId, isOpen) => {
    setOpenModules((prev) => ({ ...prev, [moduleId]: isOpen }));
  }, []);

  const handleAddTopic = useCallback(() => {
    if (!newTopicTitle.trim()) return;
    onAddTopic(newTopicTitle.trim());
    setNewTopicTitle("");
  }, [newTopicTitle, onAddTopic]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleAddTopic();
      }
    },
    [handleAddTopic]
  );

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
        <div className="flex items-center justify-center gap-3">
          <div className="relative w-5 h-5">
            <div className="absolute inset-0 border-2 border-[var(--border)] rounded-full" />
            <div className="absolute inset-0 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-sm text-[var(--muted-foreground)]">Generating topics...</span>
        </div>
      </div>
    );
  }

  if (overviewTopics.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">No topics generated yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] overflow-hidden">
      {outdatedMessage && (
        <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-start gap-2 text-amber-700 text-sm">
              <svg
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v4m0 4h.01M12 3l9 16H3L12 3z"
                />
              </svg>
              <span>{outdatedMessage}</span>
            </div>
            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                className="text-xs font-medium text-amber-700 hover:text-amber-800"
              >
                Regenerate
              </button>
            )}
          </div>
        </div>
      )}
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-1)]">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-[var(--foreground)]">Your Topics</h4>
          <span className="text-xs text-[var(--muted-foreground)]">
            {totalTopics} topics in {overviewTopics.length} modules
          </span>
        </div>
      </div>

      {/* Module list */}
      <div className="max-h-[400px] overflow-y-auto">
        {overviewTopics.map((module) => (
          <ModuleAccordion
            key={module.id}
            module={module}
            isOpen={openModules[module.id] ?? false}
            onToggle={(isOpen) => handleToggleModule(module.id, isOpen)}
            onDeleteSubtopic={onDeleteSubtopic}
            onDeleteAll={onDeleteAllSubtopics}
          />
        ))}
      </div>

      {/* Deleted topics (if any) */}
      {deletedSubtopics.length > 0 && (
        <div className="p-3 border-t border-[var(--border)] bg-[var(--surface-muted)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--muted-foreground)]">
              {deletedSubtopics.length} removed topic{deletedSubtopics.length > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={onRestoreAll}
              className="text-xs text-[var(--primary)] hover:underline"
            >
              Restore all
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {deletedSubtopics.slice(0, 5).map((entry) => (
              <button
                key={entry.subtopic.id}
                type="button"
                onClick={() => onRestoreSubtopic(entry.subtopic.id)}
                className="text-xs px-2 py-1 bg-[var(--surface-1)] rounded-full text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                + {entry.subtopic.title}
              </button>
            ))}
            {deletedSubtopics.length > 5 && (
              <span className="text-xs px-2 py-1 text-[var(--muted-foreground)]">
                +{deletedSubtopics.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="p-3 border-t border-[var(--border)] space-y-2">
        {/* Add topic input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newTopicTitle}
            onChange={(e) => setNewTopicTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a topic..."
            className="flex-1 px-3 py-2 text-sm bg-[var(--surface-1)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
          />
          <button
            type="button"
            onClick={handleAddTopic}
            disabled={!newTopicTitle.trim()}
            className="px-3 py-2 text-sm bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            Add
          </button>
        </div>

        {/* Action buttons */}
        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            className="w-full px-3 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-1)] rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Regenerate topics
          </button>
        )}
      </div>
    </div>
  );
}
