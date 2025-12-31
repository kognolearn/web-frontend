"use client";

import React, { useState, useCallback } from "react";

/**
 * NumericAnswer - Number input with tolerance display
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {number} [props.value] - Current value
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {string} props.placeholder - Placeholder text
 * @param {string} [props.unit] - Unit label
 * @param {number} [props.tolerance] - Display tolerance (actual in grading_logic)
 */
export default function NumericAnswer({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  placeholder = "Enter a number",
  unit,
  tolerance,
}) {
  const [inputValue, setInputValue] = useState(
    value !== undefined ? String(value) : ""
  );
  const [error, setError] = useState(null);

  const handleChange = useCallback((e) => {
    const strValue = e.target.value;
    setInputValue(strValue);
    setError(null);

    if (strValue === "") {
      onChange?.(undefined);
      return;
    }

    const numValue = parseFloat(strValue);
    if (isNaN(numValue)) {
      setError("Please enter a valid number");
      return;
    }

    onChange?.(numValue);
  }, [onChange]);

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
    <div id={id} className="v2-numeric-answer">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            inputMode="decimal"
            value={inputValue}
            onChange={handleChange}
            disabled={disabled || isGraded}
            placeholder={placeholder}
            className={`
              w-full px-4 py-3 rounded-xl border ${borderClass}
              bg-[var(--surface-2)] text-[var(--foreground)]
              focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
              disabled:opacity-50 disabled:cursor-not-allowed
              placeholder:text-[var(--muted-foreground)]
              transition-colors
              ${unit ? "pr-16" : ""}
            `}
          />
          {unit && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--muted-foreground)]">
              {unit}
            </span>
          )}
        </div>
      </div>

      {/* Tolerance hint */}
      {tolerance !== undefined && !isGraded && (
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Tolerance: ±{tolerance}
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="mt-1 text-xs text-rose-500">{error}</p>
      )}

      {/* Show correct answer if wrong */}
      {isGraded && !grade?.passed && grade?.expected !== undefined && (
        <div className="mt-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Correct answer:{" "}
            <span className="font-medium">
              {grade.expected}
              {unit && ` ${unit}`}
            </span>
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
