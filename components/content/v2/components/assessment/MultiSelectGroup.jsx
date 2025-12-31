"use client";

import React, { useState, useCallback } from "react";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import { Check, X } from "lucide-react";

/**
 * MultiSelectGroup - Multiple choice (checkboxes)
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {string[]} [props.value] - Selected option IDs
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {Array<{id: string, label: string}>} props.options - Available options
 */
export default function MultiSelectGroup({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  options = [],
}) {
  const [localValue, setLocalValue] = useState(value || []);

  const currentValue = value !== undefined ? value : localValue;

  const handleToggle = useCallback((optionId) => {
    if (disabled || isGraded) return;

    const newValue = currentValue.includes(optionId)
      ? currentValue.filter((id) => id !== optionId)
      : [...currentValue, optionId];

    setLocalValue(newValue);
    onChange?.(newValue);
  }, [disabled, isGraded, currentValue, onChange]);

  // Determine if an option is correct/incorrect based on grade
  const getOptionStatus = (optionId) => {
    if (!isGraded || !grade) return null;

    const isSelected = currentValue.includes(optionId);
    const expected = grade.expected || [];
    const shouldBeSelected = expected.includes(optionId);

    if (isSelected && shouldBeSelected) return "correct";
    if (isSelected && !shouldBeSelected) return "incorrect";
    if (!isSelected && shouldBeSelected) return "missed";
    return null;
  };

  return (
    <div id={id} className="v2-multi-select-group space-y-2">
      {options.map((option) => {
        const isSelected = currentValue.includes(option.id);
        const status = getOptionStatus(option.id);

        let optionClass = "border-[var(--border)] bg-[var(--surface-2)]";
        let iconContent = null;

        if (status === "correct") {
          optionClass = "border-emerald-500 bg-emerald-500/10";
          iconContent = <Check className="w-4 h-4 text-emerald-500" />;
        } else if (status === "incorrect") {
          optionClass = "border-rose-500 bg-rose-500/10";
          iconContent = <X className="w-4 h-4 text-rose-500" />;
        } else if (status === "missed") {
          optionClass = "border-amber-500 bg-amber-500/10";
          iconContent = <Check className="w-4 h-4 text-amber-500" />;
        } else if (isSelected) {
          optionClass = "border-[var(--primary)] bg-[var(--primary)]/10";
        }

        return (
          <button
            key={option.id}
            onClick={() => handleToggle(option.id)}
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
            {/* Checkbox indicator */}
            <div
              className={`
                flex-shrink-0 w-5 h-5 mt-0.5 rounded-md border-2
                flex items-center justify-center transition-colors
                ${
                  isSelected
                    ? status === "correct"
                      ? "border-emerald-500 bg-emerald-500"
                      : status === "incorrect"
                      ? "border-rose-500 bg-rose-500"
                      : "border-[var(--primary)] bg-[var(--primary)]"
                    : status === "missed"
                    ? "border-amber-500"
                    : "border-[var(--border)]"
                }
              `}
            >
              {isSelected && (
                <Check className="w-3 h-3 text-white" />
              )}
            </div>

            {/* Label */}
            <div className="flex-1 text-sm text-[var(--foreground)]">
              <MarkdownRenderer content={option.label} />
            </div>

            {/* Status icon */}
            {iconContent && !isSelected && (
              <div className="flex-shrink-0">{iconContent}</div>
            )}
          </button>
        );
      })}

      {/* Selection count */}
      {!isGraded && (
        <p className="text-xs text-[var(--muted-foreground)]">
          {currentValue.length} selected
        </p>
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
