"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { MathJax } from "better-react-mathjax";

/**
 * MathInput - LaTeX math entry with live preview
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {string} [props.value] - Current LaTeX value
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {string} props.placeholder - Placeholder text
 */
export default function MathInput({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  placeholder = "Enter LaTeX (e.g., \\frac{1}{2})",
}) {
  const [localValue, setLocalValue] = useState(value || "");
  const [showPreview, setShowPreview] = useState(true);
  const textareaRef = useRef(null);

  const currentValue = value !== undefined ? value : localValue;

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange?.(newValue);
  }, [onChange]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [currentValue]);

  // Common LaTeX snippets
  const insertSnippet = (snippet) => {
    if (disabled || isGraded) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue =
      currentValue.substring(0, start) + snippet + currentValue.substring(end);

    setLocalValue(newValue);
    onChange?.(newValue);

    // Set cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      const cursorPos = start + snippet.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };

  const snippets = [
    { label: "Fraction", value: "\\frac{}{}" },
    { label: "Square Root", value: "\\sqrt{}" },
    { label: "Power", value: "^{}" },
    { label: "Subscript", value: "_{}" },
    { label: "Sum", value: "\\sum_{i=1}^{n}" },
    { label: "Integral", value: "\\int_{a}^{b}" },
    { label: "Infinity", value: "\\infty" },
    { label: "Pi", value: "\\pi" },
  ];

  // Determine border color based on grade
  let borderClass = "border-[var(--border)]";
  if (isGraded && grade) {
    if (grade.status === "correct" || grade.passed) {
      borderClass = "border-emerald-500";
    } else if (grade.status === "incorrect" || grade.passed === false) {
      borderClass = "border-rose-500";
    }
  }

  return (
    <div id={id} className="v2-math-input space-y-3">
      {/* Snippet buttons */}
      {!disabled && !isGraded && (
        <div className="flex flex-wrap gap-1">
          {snippets.map((snippet) => (
            <button
              key={snippet.label}
              onClick={() => insertSnippet(snippet.value)}
              className="px-2 py-1 text-xs rounded-lg
                border border-[var(--border)] bg-[var(--surface-2)]
                hover:bg-[var(--surface-1)] transition-colors"
              type="button"
            >
              {snippet.label}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex flex-col gap-3">
        <textarea
          ref={textareaRef}
          value={currentValue}
          onChange={handleChange}
          disabled={disabled || isGraded}
          placeholder={placeholder}
          rows={2}
          className={`
            w-full px-4 py-3 rounded-xl border ${borderClass}
            bg-[var(--surface-2)] text-[var(--foreground)]
            font-mono text-sm
            focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
            disabled:opacity-50 disabled:cursor-not-allowed
            placeholder:text-[var(--muted-foreground)]
            resize-none transition-colors
          `}
        />

        {/* Preview toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs text-[var(--primary)] hover:underline"
            type="button"
          >
            {showPreview ? "Hide Preview" : "Show Preview"}
          </button>
        </div>

        {/* Live preview */}
        {showPreview && currentValue && (
          <div className={`
            p-4 rounded-xl border ${borderClass}
            bg-[var(--surface-2)] min-h-[60px]
            flex items-center justify-center
          `}>
            <MathJax dynamic>
              {`\\[${currentValue}\\]`}
            </MathJax>
          </div>
        )}
      </div>

      {/* Grade feedback */}
      {isGraded && grade?.feedback && (
        <p className={`text-sm ${
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
