"use client";

import React, { useState, useCallback } from "react";
import { Copy, Check, RotateCcw, Play } from "lucide-react";

/**
 * CodeQuestion - Code editor with test case display
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
 * @param {Array<{input: string, expected_output: string, visible: boolean}>} [props.test_cases] - Test cases
 */
export default function CodeQuestion({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  language = "python",
  initial_code = "",
  test_cases = [],
}) {
  const [localValue, setLocalValue] = useState(value || initial_code);
  const [copied, setCopied] = useState(false);

  const currentValue = value !== undefined ? value : localValue;

  const handleChange = useCallback((e) => {
    if (disabled || isGraded) return;
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange?.(newValue);
  }, [disabled, isGraded, onChange]);

  const handleReset = () => {
    if (disabled || isGraded) return;
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

  // Handle tab key
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
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Visible test cases
  const visibleTestCases = test_cases.filter((tc) => tc.visible);

  // Determine border color
  let borderClass = "border-[var(--border)]";
  if (isGraded && grade) {
    if (grade.passed) {
      borderClass = "border-emerald-500";
    } else {
      borderClass = "border-rose-500";
    }
  }

  return (
    <div id={id} className="v2-code-question space-y-4">
      {/* Code editor */}
      <div>
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
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg
                hover:bg-[var(--surface-1)] transition-colors"
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
        <div className={`rounded-b-xl border ${borderClass} overflow-hidden`}>
          <div className="flex">
            {/* Line numbers */}
            <div className="flex-shrink-0 p-3 bg-[var(--surface-2)] text-right select-none min-w-[3rem]">
              {currentValue.split("\n").map((_, i) => (
                <div
                  key={i}
                  className="text-xs leading-6 font-mono text-[var(--muted-foreground)]"
                >
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Code textarea */}
            <textarea
              value={currentValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              disabled={disabled || isGraded}
              spellCheck={false}
              className="flex-1 p-3 font-mono text-sm leading-6
                bg-[var(--surface-1)] text-[var(--foreground)]
                focus:outline-none
                disabled:opacity-50 disabled:cursor-not-allowed
                resize-none min-h-[200px] overflow-auto whitespace-pre"
              style={{ tabSize: 2 }}
            />
          </div>
        </div>
      </div>

      {/* Execution error display */}
      {isGraded && grade?.stderr && (
        <div className="rounded-xl border border-rose-500 bg-rose-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wide">
              Execution Error
            </span>
          </div>
          <pre className="p-3 rounded-lg bg-rose-500/10 font-mono text-xs text-rose-700 dark:text-rose-300 overflow-x-auto whitespace-pre-wrap">
            {grade.stderr}
          </pre>
        </div>
      )}

      {/* Test cases */}
      {visibleTestCases.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
              Test Cases
            </h4>
            {isGraded && grade?.testResults && (
              <span className="text-xs text-[var(--muted-foreground)]">
                {grade.passedCount ?? 0}/{grade.totalCount ?? grade.testResults.length} passed
              </span>
            )}
          </div>
          <div className="space-y-2">
            {visibleTestCases.map((testCase, index) => {
              const testResult = isGraded ? grade?.testResults?.[index] : null;

              return (
                <div
                  key={index}
                  className={`
                    p-3 rounded-xl border
                    ${
                      testResult?.passed
                        ? "border-emerald-500 bg-emerald-500/5"
                        : testResult?.passed === false
                        ? "border-rose-500 bg-rose-500/5"
                        : "border-[var(--border)] bg-[var(--surface-2)]"
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[var(--muted-foreground)]">
                      {testResult?.description || `Test Case ${index + 1}`}
                    </span>
                    {testResult && (
                      <span
                        className={`text-xs font-medium ${
                          testResult.passed
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {testResult.passed ? "Passed" : "Failed"}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        Input:
                      </span>
                      <pre className="mt-1 p-2 rounded-lg bg-[var(--surface-1)] font-mono text-xs overflow-x-auto">
                        {testCase.input || "(no input)"}
                      </pre>
                    </div>
                    <div>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        Expected Output:
                      </span>
                      <pre className="mt-1 p-2 rounded-lg bg-[var(--surface-1)] font-mono text-xs overflow-x-auto">
                        {testCase.expected_output}
                      </pre>
                    </div>
                  </div>

                  {/* Actual output if failed */}
                  {testResult && !testResult.passed && (
                    <div className="mt-3 space-y-2">
                      {testResult.actual_output !== undefined && (
                        <div>
                          <span className="text-xs text-[var(--muted-foreground)]">
                            Your Output:
                          </span>
                          <pre className="mt-1 p-2 rounded-lg bg-rose-500/10 font-mono text-xs overflow-x-auto">
                            {testResult.actual_output || "(no output)"}
                          </pre>
                        </div>
                      )}
                      {testResult.stderr && (
                        <div>
                          <span className="text-xs text-rose-600 dark:text-rose-400">
                            Error:
                          </span>
                          <pre className="mt-1 p-2 rounded-lg bg-rose-500/10 font-mono text-xs text-rose-700 dark:text-rose-300 overflow-x-auto whitespace-pre-wrap">
                            {testResult.stderr}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {test_cases.length > visibleTestCases.length && (
            <p className="text-xs text-[var(--muted-foreground)]">
              + {test_cases.length - visibleTestCases.length} hidden test cases
            </p>
          )}
        </div>
      )}

      {/* Grade feedback */}
      {isGraded && grade?.feedback && (
        <p className={`text-sm ${
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
