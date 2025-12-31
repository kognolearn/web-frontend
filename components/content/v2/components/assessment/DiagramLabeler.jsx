"use client";

import React, { useState, useCallback } from "react";

/**
 * DiagramLabeler - Fill in labels on a diagram
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {Object.<string, string>} [props.value] - Label values { labelId: text }
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {string} props.image_url - Diagram image URL
 * @param {Array<{id: string, text?: string, x: number, y: number}>} props.labels - Label positions
 */
export default function DiagramLabeler({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  image_url,
  labels = [],
}) {
  const [localValue, setLocalValue] = useState(value || {});

  const currentValue = value !== undefined ? value : localValue;

  const handleLabelChange = useCallback((labelId, text) => {
    if (disabled || isGraded) return;

    const updated = {
      ...currentValue,
      [labelId]: text,
    };
    setLocalValue(updated);
    onChange?.(updated);
  }, [disabled, isGraded, currentValue, onChange]);

  // Get grade status for a label
  const getLabelStatus = (labelId) => {
    if (!isGraded || !grade?.expected) return null;
    const expected = grade.expected[labelId];
    const actual = currentValue[labelId];

    if (!expected) return null;
    return String(actual || "").trim().toLowerCase() ===
      String(expected).trim().toLowerCase()
      ? "correct"
      : "incorrect";
  };

  return (
    <div id={id} className="v2-diagram-labeler">
      {/* Diagram with labels */}
      <div className="relative inline-block">
        {image_url ? (
          <img
            src={image_url}
            alt="Diagram to label"
            className="rounded-xl border border-[var(--border)]"
          />
        ) : (
          <div className="w-96 h-64 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-center">
            <span className="text-sm text-[var(--muted-foreground)]">
              No diagram image provided
            </span>
          </div>
        )}

        {/* Label inputs positioned on the image */}
        {labels.map((label) => {
          const status = getLabelStatus(label.id);
          const isPrefilled = label.text && !disabled && !isGraded;

          let inputClass = "border-[var(--border)] bg-white dark:bg-[var(--surface-1)]";
          if (status === "correct") {
            inputClass = "border-emerald-500 bg-emerald-500/10";
          } else if (status === "incorrect") {
            inputClass = "border-rose-500 bg-rose-500/10";
          }

          return (
            <div
              key={label.id}
              className="absolute transform -translate-x-1/2"
              style={{
                left: `${label.x}%`,
                top: `${label.y}%`,
              }}
            >
              {/* Connector line */}
              <div className="w-px h-4 bg-[var(--border)] mx-auto" />

              {/* Input field */}
              {isPrefilled ? (
                <div className={`
                  px-2 py-1 rounded-lg border ${inputClass}
                  text-sm text-[var(--foreground)] whitespace-nowrap
                  shadow-sm
                `}>
                  {label.text}
                </div>
              ) : (
                <input
                  type="text"
                  value={currentValue[label.id] || ""}
                  onChange={(e) => handleLabelChange(label.id, e.target.value)}
                  disabled={disabled || isGraded}
                  placeholder="?"
                  className={`
                    w-24 px-2 py-1 rounded-lg border ${inputClass}
                    text-sm text-center text-[var(--foreground)]
                    focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
                    disabled:opacity-75 disabled:cursor-not-allowed
                    placeholder:text-[var(--muted-foreground)]
                    shadow-sm
                  `}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Label list for easier input */}
      <div className="mt-4 space-y-2">
        <h4 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
          Labels
        </h4>
        {labels.filter(l => !l.text).map((label, index) => {
          const status = getLabelStatus(label.id);

          return (
            <div key={label.id} className="flex items-center gap-3">
              <span className="text-sm text-[var(--muted-foreground)] w-6">
                {index + 1}.
              </span>
              <input
                type="text"
                value={currentValue[label.id] || ""}
                onChange={(e) => handleLabelChange(label.id, e.target.value)}
                disabled={disabled || isGraded}
                placeholder={`Label ${index + 1}`}
                className={`
                  flex-1 px-3 py-2 rounded-xl border
                  ${
                    status === "correct"
                      ? "border-emerald-500 bg-emerald-500/10"
                      : status === "incorrect"
                      ? "border-rose-500 bg-rose-500/10"
                      : "border-[var(--border)] bg-[var(--surface-2)]"
                  }
                  text-sm text-[var(--foreground)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              />
              {status === "incorrect" && grade?.expected?.[label.id] && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                  {grade.expected[label.id]}
                </span>
              )}
            </div>
          );
        })}
      </div>

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
