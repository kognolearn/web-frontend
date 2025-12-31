"use client";

import React, { useState, useCallback, useMemo } from "react";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import { ChevronDown } from "lucide-react";

/**
 * LongFormResponse - Long text with rubric display
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {string} [props.value] - Current value
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {string} [props.rubric] - Display rubric (markdown)
 * @param {number} props.min_words - Minimum word count
 * @param {number} [props.max_words] - Maximum word count
 */
export default function LongFormResponse({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  rubric,
  min_words = 100,
  max_words,
}) {
  const [localValue, setLocalValue] = useState(value || "");
  const [showRubric, setShowRubric] = useState(false);

  const currentValue = value !== undefined ? value : localValue;

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange?.(newValue);
  }, [onChange]);

  // Calculate word count
  const wordCount = useMemo(() => {
    if (!currentValue.trim()) return 0;
    return currentValue.trim().split(/\s+/).length;
  }, [currentValue]);

  // Word count status
  const wordCountStatus = useMemo(() => {
    if (wordCount < min_words) return "below";
    if (max_words && wordCount > max_words) return "above";
    return "ok";
  }, [wordCount, min_words, max_words]);

  // Determine border color
  let borderClass = "border-[var(--border)]";
  if (isGraded && grade) {
    if (grade.passed) {
      borderClass = "border-emerald-500";
    } else {
      borderClass = "border-rose-500";
    }
  } else if (wordCountStatus === "above") {
    borderClass = "border-rose-500";
  }

  return (
    <div id={id} className="v2-long-form-response space-y-3">
      {/* Rubric */}
      {rubric && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] overflow-hidden">
          <button
            onClick={() => setShowRubric(!showRubric)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-1)] transition-colors"
          >
            <span className="text-sm font-medium text-[var(--foreground)]">
              Rubric / Grading Criteria
            </span>
            <ChevronDown
              className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${
                showRubric ? "rotate-180" : ""
              }`}
            />
          </button>
          {showRubric && (
            <div className="px-4 pb-4 border-t border-[var(--border)]">
              <div className="pt-4 prose prose-sm max-w-none dark:prose-invert">
                <MarkdownRenderer content={rubric} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Text area */}
      <textarea
        value={currentValue}
        onChange={handleChange}
        disabled={disabled || isGraded}
        placeholder="Write your response here..."
        rows={12}
        className={`
          w-full px-4 py-3 rounded-xl border ${borderClass}
          bg-[var(--surface-2)] text-[var(--foreground)]
          focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
          disabled:opacity-50 disabled:cursor-not-allowed
          placeholder:text-[var(--muted-foreground)]
          resize-y min-h-[250px] transition-colors
        `}
      />

      {/* Word count & requirements */}
      <div className="flex items-center justify-between text-xs">
        <div
          className={`
            ${
              wordCountStatus === "below"
                ? "text-amber-600 dark:text-amber-400"
                : wordCountStatus === "above"
                ? "text-rose-600 dark:text-rose-400"
                : "text-[var(--muted-foreground)]"
            }
          `}
        >
          <span className="font-medium">{wordCount}</span> words
          {wordCountStatus === "below" && (
            <span> ({min_words - wordCount} more needed)</span>
          )}
          {wordCountStatus === "above" && (
            <span> ({wordCount - max_words} over limit)</span>
          )}
        </div>
        <div className="text-[var(--muted-foreground)]">
          Required: {min_words}
          {max_words && `-${max_words}`} words
        </div>
      </div>

      {/* Grade feedback / score */}
      {isGraded && grade && (
        <div
          className={`p-4 rounded-xl border ${
            grade.passed
              ? "border-emerald-500 bg-emerald-500/5"
              : "border-rose-500 bg-rose-500/5"
          }`}
        >
          {grade.earnedPoints !== undefined && grade.points !== undefined && (
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-lg font-semibold ${
                  grade.passed
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {grade.earnedPoints}/{grade.points} points
              </span>
            </div>
          )}
          {grade.feedback && (
            <p
              className={`text-sm ${
                grade.passed
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-rose-700 dark:text-rose-300"
              }`}
            >
              {grade.feedback}
            </p>
          )}

          {/* Rubric criterion scores */}
          {grade.criterionScores && (
            <div className="mt-3 space-y-2">
              <h4 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                Rubric Scores
              </h4>
              {grade.criterionScores.map((criterion, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-[var(--foreground)]">
                    {criterion.name}
                  </span>
                  <span
                    className={`font-medium ${
                      criterion.earned >= criterion.max * 0.7
                        ? "text-emerald-600 dark:text-emerald-400"
                        : criterion.earned >= criterion.max * 0.4
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {criterion.earned}/{criterion.max}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
