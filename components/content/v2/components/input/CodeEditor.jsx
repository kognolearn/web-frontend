"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Copy, Check, RotateCcw } from "lucide-react";

/**
 * CodeEditor - Code input with syntax highlighting (basic)
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {string} [props.value] - Current code value
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {string} props.language - Programming language
 * @param {string} props.initial_code - Initial code template
 * @param {number[]} [props.readonly_lines] - Line numbers that cannot be edited
 */
export default function CodeEditor({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  language = "python",
  initial_code = "",
  readonly_lines = [],
}) {
  const [localValue, setLocalValue] = useState(value || initial_code);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  const currentValue = value !== undefined ? value : localValue;

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange?.(newValue);
  }, [onChange]);

  const handleReset = () => {
    setLocalValue(initial_code);
    onChange?.(initial_code);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Sync scroll between line numbers and textarea
  const handleScroll = (e) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.target.scrollTop;
    }
  };

  // Handle tab key for indentation
  const handleKeyDown = (e) => {
    if (disabled || isGraded) return;

    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;

      const newValue =
        currentValue.substring(0, start) + "  " + currentValue.substring(end);

      setLocalValue(newValue);
      onChange?.(newValue);

      // Set cursor position after tab
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Calculate line numbers
  const lines = currentValue.split("\n");
  const lineCount = lines.length;

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
    <div id={id} className="v2-code-editor">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 rounded-t-xl border border-b-0 border-[var(--border)] bg-[var(--surface-2)]">
        <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase">
          {language}
        </span>
        <div className="flex items-center gap-2">
          {initial_code && !isGraded && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg
                hover:bg-[var(--surface-1)] transition-colors"
              title="Reset to initial code"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg
              hover:bg-[var(--surface-1)] transition-colors"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className={`relative rounded-b-xl border ${borderClass} overflow-hidden`}>
        <div className="flex">
          {/* Line numbers */}
          <div
            ref={lineNumbersRef}
            className="flex-shrink-0 p-3 bg-[var(--surface-2)] text-right select-none overflow-hidden"
            style={{ width: "3rem" }}
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div
                key={i + 1}
                className={`text-xs leading-6 font-mono ${
                  readonly_lines.includes(i + 1)
                    ? "text-amber-500"
                    : "text-[var(--muted-foreground)]"
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Code textarea */}
          <textarea
            ref={textareaRef}
            value={currentValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            disabled={disabled || isGraded}
            spellCheck={false}
            className={`
              flex-1 p-3 font-mono text-sm leading-6
              bg-[var(--surface-1)] text-[var(--foreground)]
              focus:outline-none
              disabled:opacity-50 disabled:cursor-not-allowed
              resize-none min-h-[200px]
              overflow-auto whitespace-pre
            `}
            style={{ tabSize: 2 }}
          />
        </div>
      </div>

      {/* Grade feedback */}
      {isGraded && grade?.feedback && (
        <div className={`mt-3 p-3 rounded-xl border ${
          grade.status === "correct" || grade.passed
            ? "border-emerald-500/30 bg-emerald-500/10"
            : "border-rose-500/30 bg-rose-500/10"
        }`}>
          <p className={`text-sm ${
            grade.status === "correct" || grade.passed
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}>
            {grade.feedback}
          </p>
        </div>
      )}
    </div>
  );
}
