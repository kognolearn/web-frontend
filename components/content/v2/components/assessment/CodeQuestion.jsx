"use client";

import React, { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Copy, Check, RotateCcw, Play, CheckCircle2, XCircle, Circle, Maximize2, Minimize2 } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useCodeEditorSettings } from "@/components/editor/CodeEditorSettingsProvider";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-10 text-xs text-[var(--muted-foreground)]">
      Loading editor...
    </div>
  ),
});

const languageMap = {
  c: "c",
  cpp: "cpp",
  "c++": "cpp",
  "c/c++": "cpp",
  python: "python",
  py: "python",
  javascript: "javascript",
  js: "javascript",
  typescript: "typescript",
  ts: "typescript",
  java: "java",
  csharp: "csharp",
  "c#": "csharp",
  go: "go",
  rust: "rust",
  ruby: "ruby",
  php: "php",
  swift: "swift",
  kotlin: "kotlin",
  sql: "sql",
  html: "html",
  css: "css",
  json: "json",
  xml: "xml",
  yaml: "yaml",
  markdown: "markdown",
  shell: "shell",
  bash: "shell",
  html_css: "html",
  latex: "plaintext",
  tex: "plaintext",
  text: "plaintext",
  plaintext: "plaintext",
};

/**
 * TestCaseIndicator - Clickable test case result with expandable details
 */
function TestCaseIndicator({ index, testCase, testResult, isGraded, isExpanded, onToggle }) {
  const [isHovered, setIsHovered] = useState(false);

  const getStatus = () => {
    if (!isGraded || !testResult) return "pending";
    return testResult.passed ? "passed" : "failed";
  };

  const status = getStatus();

  const statusStyles = {
    pending: "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted-foreground)]",
    passed: "bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400",
    failed: "bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-400",
  };

  const StatusIcon = status === "passed" ? CheckCircle2 : status === "failed" ? XCircle : Circle;

  // Show tooltip on hover (for non-graded) or when expanded (for graded)
  const showDetails = isExpanded || (!isGraded && isHovered);

  return (
    <div className="relative">
      <button
        type="button"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => isGraded && onToggle?.()}
        className={`
          w-8 h-8 rounded-lg border flex items-center justify-center
          transition-all ${isGraded ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
          ${statusStyles[status]}
          ${isExpanded ? 'ring-2 ring-offset-2 ring-[var(--primary)]' : ''}
        `}
      >
        <StatusIcon className="w-4 h-4" />
      </button>

      {/* Tooltip/Details */}
      {showDetails && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 max-w-[90vw]">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-xl p-3 space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--foreground)]">
                {testResult?.description || `Test ${index + 1}`}
              </span>
              {isGraded && testResult && (
                <span className={`text-xs font-medium ${
                  testResult.passed ? "text-emerald-500" : "text-rose-500"
                }`}>
                  {testResult.passed ? "Passed" : "Failed"}
                </span>
              )}
            </div>

            {/* Input */}
            {testCase?.input && (
              <div>
                <span className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">Input</span>
                <pre className="mt-1 p-2 rounded-lg bg-[var(--surface-2)] font-mono text-xs overflow-x-auto max-h-16 overflow-y-auto">
                  {testCase.input}
                </pre>
              </div>
            )}

            {/* Expected */}
            <div>
              <span className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">Expected</span>
              <pre className="mt-1 p-2 rounded-lg bg-[var(--surface-2)] font-mono text-xs overflow-x-auto max-h-16 overflow-y-auto">
                {testCase?.expected_output || "(empty)"}
              </pre>
            </div>

            {/* Actual output - show for both passed and failed when graded */}
            {isGraded && testResult && (
              <div>
                <span className={`text-[10px] uppercase tracking-wide ${
                  testResult.passed ? "text-emerald-500" : "text-rose-500"
                }`}>Your Output</span>
                <pre className={`mt-1 p-2 rounded-lg font-mono text-xs overflow-x-auto max-h-16 overflow-y-auto ${
                  testResult.passed ? "bg-emerald-500/10" : "bg-rose-500/10"
                }`}>
                  {testResult.actual_output || "(no output)"}
                </pre>
              </div>
            )}

            {/* Error */}
            {isGraded && testResult?.stderr && (
              <div>
                <span className="text-[10px] uppercase tracking-wide text-rose-500">Error</span>
                <pre className="mt-1 p-2 rounded-lg bg-rose-500/10 font-mono text-xs text-rose-600 dark:text-rose-400 overflow-x-auto max-h-20 overflow-y-auto whitespace-pre-wrap">
                  {testResult.stderr}
                </pre>
              </div>
            )}
          </div>
          {/* Arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-[var(--surface-1)] border-r border-b border-[var(--border)] rotate-45" />
        </div>
      )}
    </div>
  );
}

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedTestIndex, setExpandedTestIndex] = useState(null);
  const { theme: appTheme } = useTheme();
  const { getMonacoOptions, settings: editorSettings } = useCodeEditorSettings();

  const currentValue = value !== undefined ? value : localValue;
  const rawLanguage = language && language.trim() ? language.trim().toLowerCase() : "plaintext";
  const resolvedLanguage = languageMap[rawLanguage] || rawLanguage;
  const editorTheme =
    editorSettings.theme || (appTheme === "dark" ? "vs-dark" : "vs-light");

  const monacoOptions = useMemo(() => {
    const userOptions = getMonacoOptions();
    return {
      ...userOptions,
      readOnly: disabled || isGraded,
      domReadOnly: disabled || isGraded,
    };
  }, [getMonacoOptions, disabled, isGraded]);

  const handleChange = useCallback((nextValue) => {
    if (disabled || isGraded) return;
    const newValue = nextValue ?? "";
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
            {rawLanguage}
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
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg
                hover:bg-[var(--surface-1)] transition-colors"
              title={isExpanded ? "Collapse editor" : "Expand editor"}
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="w-3 h-3" />
                  Collapse
                </>
              ) : (
                <>
                  <Maximize2 className="w-3 h-3" />
                  Expand
                </>
              )}
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className={`rounded-b-xl border ${borderClass} overflow-hidden bg-[var(--surface-1)]`}>
          <MonacoEditor
            value={currentValue}
            onChange={handleChange}
            language={resolvedLanguage}
            height={isExpanded ? 560 : 280}
            theme={editorTheme}
            options={monacoOptions}
          />
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

      {/* Test cases - compact view with hoverable indicators */}
      {(visibleTestCases.length > 0 || (isGraded && grade?.testResults?.length > 0)) && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-3">
          {/* Header with count */}
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
              Test Cases
            </h4>
            {isGraded && grade?.testResults && (
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${
                  grade.passed ? "text-emerald-500" : "text-rose-500"
                }`}>
                  {grade.passedCount ?? 0}/{grade.totalCount ?? grade.testResults.length}
                </span>
                <span className="text-xs text-[var(--muted-foreground)]">passed</span>
              </div>
            )}
          </div>

          {/* Test case indicators */}
          <div className="flex flex-wrap gap-2">
            {(grade?.testResults || visibleTestCases).map((item, index) => {
              const testCase = visibleTestCases[index] || {};
              const testResult = isGraded ? grade?.testResults?.[index] : null;

              return (
                <TestCaseIndicator
                  key={index}
                  index={index}
                  testCase={testCase}
                  testResult={testResult}
                  isGraded={isGraded}
                  isExpanded={expandedTestIndex === index}
                  onToggle={() => setExpandedTestIndex(expandedTestIndex === index ? null : index)}
                />
              );
            })}
          </div>

          {/* Hidden test cases note */}
          {test_cases.length > visibleTestCases.length && (
            <p className="text-xs text-[var(--muted-foreground)]">
              + {test_cases.length - visibleTestCases.length} hidden test case{test_cases.length - visibleTestCases.length > 1 ? 's' : ''}
            </p>
          )}

          {/* Interaction hint */}
          {visibleTestCases.length > 0 && (
            <p className="text-xs text-[var(--muted-foreground)] italic">
              {isGraded ? "Click on a test to see details" : "Hover over each test to see details"}
            </p>
          )}
        </div>
      )}

      {/* Grade feedback */}
      {isGraded && grade?.feedback && (
        <div className={`rounded-xl border p-4 ${
          grade.passed
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-rose-500/30 bg-rose-500/5"
        }`}>
          <span className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">
            Feedback
          </span>
          <pre className={`mt-2 text-sm whitespace-pre-wrap font-sans ${
            grade.passed
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}>
            {grade.feedback}
          </pre>
        </div>
      )}
    </div>
  );
}
