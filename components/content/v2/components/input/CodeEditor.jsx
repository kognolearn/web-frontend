"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Copy, Check, RotateCcw, ExternalLink, Maximize2, Minimize2 } from "lucide-react";
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
 * CodeEditor - Code input with Monaco editor
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
  const [isExpanded, setIsExpanded] = useState(false);
  const { theme: appTheme } = useTheme();
  const { getMonacoOptions, settings: editorSettings } = useCodeEditorSettings();
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);

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
    const newValue = nextValue ?? "";
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

  const applyReadonlyDecorations = useCallback(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    const maxLine = model.getLineCount();
    const decorationLines = (readonly_lines || [])
      .map((line) => Number(line))
      .filter((line) => Number.isInteger(line) && line > 0 && line <= maxLine);

    const decorations = decorationLines.map((line) => ({
      range: new monacoRef.current.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        className: "monaco-readonly-line",
        linesDecorationsClassName: "monaco-readonly-line-margin",
      },
    }));

    decorationsRef.current = editorRef.current.deltaDecorations(
      decorationsRef.current,
      decorations,
    );
  }, [readonly_lines]);

  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    applyReadonlyDecorations();
  }, [applyReadonlyDecorations]);

  useEffect(() => {
    applyReadonlyDecorations();
  }, [applyReadonlyDecorations, currentValue]);

  // Determine border color based on grade
  let borderClass = "border-[var(--border)]";
  if (isGraded && grade) {
    if (grade.status === "correct" || grade.passed) {
      borderClass = "border-success";
    } else if (grade.status === "incorrect" || grade.passed === false) {
      borderClass = "border-danger";
    }
  }

  // Check if this is a text/math-friendly language
  const isLatexFriendly = ["markdown", "latex", "tex", "text", "plaintext"].includes(
    rawLanguage
  );

  return (
    <div id={id} className="v2-code-editor">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 rounded-t-xl border border-b-0 border-[var(--border)] bg-[var(--surface-2)]">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase">
            {rawLanguage}
          </span>
          {isLatexFriendly && (
            <a
              href="/help/latex"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
            >
              Supports LaTeX math notation
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
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
                <Check className="w-3 h-3 text-success" />
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
      <div className={`relative rounded-b-xl border ${borderClass} overflow-hidden bg-[var(--surface-1)]`}>
        <MonacoEditor
          value={currentValue}
          onChange={handleChange}
          language={resolvedLanguage}
          height={isExpanded ? 560 : 280}
          theme={editorTheme}
          options={monacoOptions}
          onMount={handleEditorDidMount}
        />
      </div>

      {/* Execution error display */}
      {isGraded && (grade?.stderr || grade?.error) && (
        <div className="mt-3 rounded-xl border border-danger bg-danger/5 p-4 space-y-2">
          <span className="text-xs font-medium text-danger uppercase tracking-wide">
            {grade.error ? "Error" : "Execution Error"}
          </span>
          <pre className="p-3 rounded-lg bg-danger/10 font-mono text-xs text-danger overflow-x-auto whitespace-pre-wrap">
            {grade.error || grade.stderr}
          </pre>
        </div>
      )}

      {/* Grade feedback */}
      {isGraded && grade?.feedback && (
        <div className={`mt-3 p-3 rounded-xl border ${
          grade.status === "correct" || grade.passed
            ? "border-success/50 bg-success/10"
            : "border-danger/50 bg-danger/10"
        }`}>
          <p className={`text-sm ${
            grade.status === "correct" || grade.passed
              ? "text-success"
              : "text-danger"
          }`}>
            {grade.feedback}
          </p>
        </div>
      )}
    </div>
  );
}
