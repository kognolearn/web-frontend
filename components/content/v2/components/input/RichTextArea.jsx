"use client";

import React, { useState, useCallback, useMemo } from "react";

/**
 * RichTextArea - Multi-line prose input with word count
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {string} [props.value] - Current value
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {number} props.min_words - Minimum word count
 * @param {number} [props.max_words] - Maximum word count
 * @param {string} props.placeholder - Placeholder text
 */
export default function RichTextArea({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  min_words = 0,
  max_words,
  placeholder = "Enter your response...",
}) {
  const [localValue, setLocalValue] = useState(value || "");

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

  // Determine border color based on grade
  let borderClass = "border-[var(--border)]";
  if (isGraded && grade) {
    if (grade.status === "correct" || grade.passed) {
      borderClass = "border-emerald-500";
    } else if (grade.status === "incorrect" || grade.passed === false) {
      borderClass = "border-rose-500";
    }
  } else if (wordCountStatus === "above") {
    borderClass = "border-rose-500";
  }

  return (
    <div id={id} className="v2-rich-text-area">
      <textarea
        value={currentValue}
        onChange={handleChange}
        disabled={disabled || isGraded}
        placeholder={placeholder}
        rows={6}
        className={`
          w-full px-4 py-3 rounded-xl border ${borderClass}
          bg-[var(--surface-2)] text-[var(--foreground)]
          focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
          disabled:opacity-50 disabled:cursor-not-allowed
          placeholder:text-[var(--muted-foreground)]
          resize-y min-h-[120px] transition-colors
        `}
      />

      {/* Word count */}
      <div className="mt-2 flex items-center justify-between text-xs">
        <div className={`
          ${wordCountStatus === "below"
            ? "text-amber-600 dark:text-amber-400"
            : wordCountStatus === "above"
            ? "text-rose-600 dark:text-rose-400"
            : "text-[var(--muted-foreground)]"
          }
        `}>
          {wordCount} word{wordCount !== 1 ? "s" : ""}
          {wordCountStatus === "below" && ` (minimum ${min_words})`}
          {wordCountStatus === "above" && ` (maximum ${max_words})`}
        </div>

        {/* Requirements */}
        <div className="text-[var(--muted-foreground)]">
          {min_words > 0 && `Min: ${min_words}`}
          {min_words > 0 && max_words && " · "}
          {max_words && `Max: ${max_words}`}
        </div>
      </div>

      {/* Grade feedback */}
      {isGraded && grade?.feedback && (
        <p className={`mt-2 text-sm ${
          grade.status === "correct" || grade.passed
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400"
        }`}>
          {grade.feedback}
        </p>
      )}
    </div>
  );
}
