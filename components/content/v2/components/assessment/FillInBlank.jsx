"use client";

import React, { useState, useCallback, useMemo } from "react";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";

/**
 * FillInBlank - Template with {{blank}} inputs
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {Object.<string, string|number>} [props.value] - Answers { blankId: value }
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {string} props.template - Template with {{blankId}} placeholders
 * @param {Array<{id: string, hint?: string, input_type: 'text'|'number'|'dropdown', options?: string[]}>} props.blanks
 * @param {boolean} [props.case_sensitive] - Whether matching is case sensitive
 */
export default function FillInBlank({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  template = "",
  blanks = [],
  case_sensitive = false,
}) {
  const [localValue, setLocalValue] = useState(value || {});

  const currentValue = value !== undefined ? value : localValue;

  const handleChange = useCallback((blankId, newValue) => {
    if (disabled || isGraded) return;

    const updated = {
      ...currentValue,
      [blankId]: newValue,
    };
    setLocalValue(updated);
    onChange?.(updated);
  }, [disabled, isGraded, currentValue, onChange]);

  // Get grade status for a specific blank
  const getBlankGrade = (blankId) => {
    if (!isGraded || !grade?.expected) return null;
    const expected = grade.expected[blankId];
    const actual = currentValue[blankId];

    if (!actual) return "incorrect";

    const isMatch = case_sensitive
      ? String(actual) === String(expected)
      : String(actual).toLowerCase() === String(expected).toLowerCase();

    return isMatch ? "correct" : "incorrect";
  };

  // Parse template and replace {{blankId}} with inputs
  const parsedContent = useMemo(() => {
    const parts = [];
    const regex = /\{\{(\w+)\}\}/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(template)) !== null) {
      // Add text before the blank
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: template.slice(lastIndex, match.index),
        });
      }

      // Add the blank
      const blankId = match[1];
      const blank = blanks.find((b) => b.id === blankId) || { id: blankId, input_type: "text" };
      parts.push({
        type: "blank",
        blank,
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < template.length) {
      parts.push({
        type: "text",
        content: template.slice(lastIndex),
      });
    }

    return parts;
  }, [template, blanks]);

  return (
    <div id={id} className="v2-fill-in-blank">
      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
        <div className="flex flex-wrap items-center gap-1 leading-relaxed">
          {parsedContent.map((part, index) => {
            if (part.type === "text") {
              return (
                <span key={index} className="text-[var(--foreground)]">
                  {part.content}
                </span>
              );
            }

            const { blank } = part;
            const blankGrade = getBlankGrade(blank.id);

            let inputClass = "border-[var(--border)]";
            if (blankGrade === "correct") {
              inputClass = "border-emerald-500 bg-emerald-500/10";
            } else if (blankGrade === "incorrect") {
              inputClass = "border-rose-500 bg-rose-500/10";
            }

            if (blank.input_type === "dropdown") {
              return (
                <select
                  key={index}
                  value={currentValue[blank.id] || ""}
                  onChange={(e) => handleChange(blank.id, e.target.value)}
                  disabled={disabled || isGraded}
                  className={`
                    px-3 py-1.5 rounded-lg border ${inputClass}
                    bg-[var(--surface-1)] text-[var(--foreground)]
                    focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
                    disabled:opacity-50 disabled:cursor-not-allowed
                    text-sm
                  `}
                >
                  <option value="">Select...</option>
                  {(blank.options || []).map((option, optIndex) => (
                    <option key={optIndex} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              );
            }

            return (
              <input
                key={index}
                type={blank.input_type === "number" ? "number" : "text"}
                value={currentValue[blank.id] || ""}
                onChange={(e) => handleChange(blank.id, e.target.value)}
                disabled={disabled || isGraded}
                placeholder={blank.hint || "..."}
                className={`
                  w-32 px-3 py-1.5 rounded-lg border ${inputClass}
                  bg-[var(--surface-1)] text-[var(--foreground)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
                  disabled:opacity-50 disabled:cursor-not-allowed
                  placeholder:text-[var(--muted-foreground)]
                  text-sm text-center
                `}
              />
            );
          })}
        </div>
      </div>

      {/* Show correct answers if wrong */}
      {isGraded && grade?.expected && !grade.passed && (
        <div className="mt-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
            Correct answers:
          </p>
          <ul className="text-sm text-[var(--foreground)] space-y-1">
            {Object.entries(grade.expected).map(([blankId, expected]) => (
              <li key={blankId}>
                <span className="text-[var(--muted-foreground)]">{blankId}:</span>{" "}
                <span className="font-medium">{expected}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grade feedback */}
      {isGraded && grade?.feedback && (
        <p className={`mt-3 text-sm ${
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
