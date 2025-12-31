"use client";

import React, { useState, useCallback } from "react";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import { Check, X } from "lucide-react";

/**
 * SelectGroup - Single choice MCQ (radio buttons)
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {string} [props.value] - Selected option ID
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {Array<{id: string, label: string}>} props.options - Available options
 * @param {false} [props.multi_select] - Must be false for single select
 */
export default function SelectGroup({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  options = [],
  multi_select = false,
}) {
  const [localValue, setLocalValue] = useState(value || null);

  const currentValue = value !== undefined ? value : localValue;

  const handleSelect = useCallback((optionId) => {
    if (disabled || isGraded) return;
    setLocalValue(optionId);
    onChange?.(optionId);
  }, [disabled, isGraded, onChange]);

  // Determine if an option is correct/incorrect based on grade
  const getOptionStatus = (optionId) => {
    if (!isGraded || !grade) return null;

    const isSelected = optionId === currentValue;
    const isCorrectAnswer = grade.expected === optionId;

    if (isSelected && grade.passed) return "correct";
    if (isSelected && !grade.passed) return "selected-incorrect";
    if (isCorrectAnswer && !grade.passed) return "correct-answer";
    return null;
  };

  return (
    <div id={id} className="v2-select-group space-y-2">
      {options.map((option) => {
        const isSelected = option.id === currentValue;
        const status = getOptionStatus(option.id);

        let optionClass = "border-[var(--border)] bg-[var(--surface-2)]";
        let iconContent = null;

        if (status === "correct") {
          optionClass = "border-emerald-500 bg-emerald-500/10";
          iconContent = <Check className="w-4 h-4 text-emerald-500" />;
        } else if (status === "selected-incorrect") {
          optionClass = "border-rose-500 bg-rose-500/10";
          iconContent = <X className="w-4 h-4 text-rose-500" />;
        } else if (status === "correct-answer") {
          optionClass = "border-emerald-500 bg-emerald-500/5";
          iconContent = <Check className="w-4 h-4 text-emerald-500" />;
        } else if (isSelected) {
          optionClass = "border-[var(--primary)] bg-[var(--primary)]/10";
        }

        return (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            disabled={disabled || isGraded}
            className={`
              w-full flex items-start gap-3 p-4 rounded-xl border ${optionClass}
              text-left transition-all
              ${
                disabled || isGraded
                  ? "cursor-not-allowed opacity-75"
                  : "hover:border-[var(--primary)]/50 cursor-pointer"
              }
            `}
          >
            {/* Radio indicator */}
            <div
              className={`
                flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2
                flex items-center justify-center transition-colors
                ${
                  isSelected
                    ? status === "correct"
                      ? "border-emerald-500 bg-emerald-500"
                      : status === "selected-incorrect"
                      ? "border-rose-500 bg-rose-500"
                      : "border-[var(--primary)] bg-[var(--primary)]"
                    : status === "correct-answer"
                    ? "border-emerald-500"
                    : "border-[var(--border)]"
                }
              `}
            >
              {isSelected && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>

            {/* Label */}
            <div className="flex-1 text-sm text-[var(--foreground)]">
              <MarkdownRenderer content={option.label} />
            </div>

            {/* Status icon */}
            {iconContent && (
              <div className="flex-shrink-0">{iconContent}</div>
            )}
          </button>
        );
      })}

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
