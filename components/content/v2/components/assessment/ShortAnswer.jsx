"use client";

import React, { useState, useCallback } from "react";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";

/**
 * ShortAnswer - Single line text input
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {string} [props.value] - Current value
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {string} props.placeholder - Placeholder text
 * @param {number} [props.max_length] - Maximum character length
 * @param {boolean} [props.case_sensitive] - Whether matching is case sensitive
 * @param {string} [props.prompt] - Question text (supports markdown/LaTeX)
 * @param {string} [props.question] - Alternative question text prop (alias for prompt)
 */
export default function ShortAnswer({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  placeholder = "Enter your answer...",
  max_length = 200,
  case_sensitive = false,
  prompt,
  question,
}) {
  // Support both 'prompt' and 'question' prop names
  const questionText = prompt || question;
  const [localValue, setLocalValue] = useState(value || "");

  const currentValue = value !== undefined ? value : localValue;

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    if (max_length && newValue.length > max_length) return;

    setLocalValue(newValue);
    onChange?.(newValue);
  }, [max_length, onChange]);

  // Determine border color based on grade
  let borderClass = "border-[var(--border)]";
  if (isGraded && grade) {
    if (grade.passed || grade.status === "correct") {
      borderClass = "border-emerald-500";
    } else {
      borderClass = "border-rose-500";
    }
  }

  return (
    <div id={id} className="v2-short-answer">
      {/* Question */}
      {questionText && (
        <div className="mb-4">
          <MarkdownRenderer content={questionText} />
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          value={currentValue}
          onChange={handleChange}
          disabled={disabled || isGraded}
          placeholder={placeholder}
          maxLength={max_length}
          className={`
            w-full px-4 py-3 rounded-xl border ${borderClass}
            bg-[var(--surface-2)] text-[var(--foreground)]
            focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
            disabled:opacity-50 disabled:cursor-not-allowed
            placeholder:text-[var(--muted-foreground)]
            transition-colors
          `}
        />
      </div>

      {/* Character count */}
      {max_length && !isGraded && (
        <p className="mt-1 text-xs text-[var(--muted-foreground)] text-right">
          {currentValue.length}/{max_length}
        </p>
      )}

      {/* Show correct answer if wrong */}
      {isGraded && !grade?.passed && grade?.expected && (
        <div className="mt-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Correct answer: <span className="font-medium">{grade.expected}</span>
          </p>
        </div>
      )}

      {/* Grade feedback */}
      {isGraded && grade?.feedback && (
        <p className={`mt-2 text-sm ${
          grade.passed
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400"
        }`}>
          {grade.feedback}
        </p>
      )}
    </div>
  );
}
