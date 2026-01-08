"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import Latex from "react-latex-next";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, Circle, GripVertical, MapPin, ExternalLink } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getComponent } from "@/components/content/v2/ComponentRegistry";
import { authFetch } from "@/lib/api";
import { resolveAsyncJobResponse } from "@/utils/asyncJobs";

const TEXT_FIELD_TYPES = new Set([
  "code_editor",
  "code_question",
  "math_input",
  "rich_text_area",
  "table_input",
  "short_answer",
  "long_form_response",
]);

function normalizeType(type) {
  if (!type) return "";
  if (type.includes("_") || type === type.toLowerCase()) {
    return type;
  }
  return type.replace(/([A-Z])/g, (match, letter, index) =>
    index === 0 ? letter.toLowerCase() : `_${letter.toLowerCase()}`
  );
}

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

const markdownComponents = {
  h1: ({ children, ...props }) => (
    <h1
      className="text-2xl font-semibold text-[var(--foreground)]"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="text-xl font-semibold text-[var(--foreground)]"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="text-lg font-semibold text-[var(--foreground)]"
      {...props}
    >
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <div className="leading-relaxed text-[var(--foreground)] mb-3" {...props}>
      {children}
    </div>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-[var(--primary)] underline decoration-[var(--primary)]/40 underline-offset-4"
      {...props}
    >
      {children}
    </a>
  ),
  ul: ({ children, ...props }) => (
    <ul className="list-disc space-y-2 pl-6" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal space-y-2 pl-6" {...props}>
      {children}
    </ol>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--foreground)]"
      {...props}
    >
      {children}
    </blockquote>
  ),
  code: ({ inline, children, ...props }) => {
    if (inline) {
      return (
        <code
          className="rounded-lg bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-sm text-[var(--foreground)]"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <pre className="overflow-x-auto rounded-xl bg-[var(--surface-2)] p-4">
        <code className="font-mono text-sm text-[var(--foreground)]" {...props}>
          {children}
        </code>
      </pre>
    );
  },
};

function MarkdownBlock({ content = "" }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
        className="space-y-3"
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CodeEditor({
  value = "",
  onChange,
  language = "",
  height = 280,
  options = {},
  theme: propTheme,
  label,
}) {
  const { theme: appTheme } = useTheme();
  const resolvedLanguage = language && language.trim() ? language : "plaintext";
  const editorTheme = propTheme || (appTheme === "dark" ? "vs-dark" : "light");
  const isMarkdown = resolvedLanguage === "markdown";
  const previewContent = useMemo(
    () => (isMarkdown ? autoWrapMarkdownMath(value) : ""),
    [isMarkdown, value],
  );

  const isLatexFriendly = ["markdown", "latex", "tex", "text", "plaintext"].includes(
    resolvedLanguage.toLowerCase()
  );

  return (
    <div className="space-y-2">
      {label ? (
        <div className="text-sm font-medium text-[var(--foreground)]">
          {label}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--surface-2)]">
          <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase">
            {resolvedLanguage}
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
        <div className="bg-[var(--surface-1)]">
          <MonacoEditor
            value={value}
            onChange={(nextValue) => onChange?.(nextValue ?? "")}
            language={resolvedLanguage}
            height={height}
            theme={editorTheme}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              scrollBeyondLastLine: false,
              ...options,
            }}
          />
        </div>
      </div>
      {isMarkdown ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
          {previewContent.trim() ? (
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={markdownComponents}
              className="space-y-3"
            >
              {previewContent}
            </ReactMarkdown>
          ) : (
            <span className="text-sm text-[var(--muted-foreground)]">
              Markdown preview will appear here.
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

const MATH_DELIMITER_REGEX = /\\\(|\\\[|\$+/;
const MATH_HINT_REGEX =
  /\\(forall|exists|land|lor|neg|to|rightarrow|leftrightarrow|iff|implies|in|notin|subseteq|supseteq|subset|supset|cup|cap|times|cdot|pm|leq|geq|neq|approx)\b/;

function autoWrapMarkdownMath(content) {
  if (!content) return "";
  const lines = String(content).split("\n");
  let inCodeBlock = false;

  const wrappedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      return line;
    }
    if (inCodeBlock || !trimmed) return line;
    if (MATH_DELIMITER_REGEX.test(line)) return line;
    if (!MATH_HINT_REGEX.test(line)) return line;

    const match = line.match(
      /^(\s*(?:[-*+]|\d+\.\s|\d+\)\s|[a-zA-Z]\.\s))(.+)$/,
    );
    if (match) {
      const prefix = match[1];
      const rest = match[2].trim();
      if (!rest) return line;
      return `${prefix}$${rest}$`;
    }
    return `$${trimmed}$`;
  });

  return wrappedLines.join("\n");
}

function formatLatexPreview(value) {
  const trimmed = `${value ?? ""}`.trim();
  if (!trimmed) return "";
  const hasDelimiters = /\\\(|\\\[|\$/.test(trimmed);
  return hasDelimiters ? trimmed : `$${trimmed}$`;
}

function MathInput({ value = "", onChange, placeholder = "Enter LaTeX", label }) {
  const preview = useMemo(() => formatLatexPreview(value), [value]);
  return (
    <div className="space-y-2">
      {label ? (
        <div className="text-sm font-medium text-[var(--foreground)]">
          {label}
        </div>
      ) : null}
      <input
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none"
        type="text"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
      />
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--foreground)]">
        {preview ? (
          <Latex>{preview}</Latex>
        ) : (
          <span className="text-[var(--muted-foreground)]">
            LaTeX preview will appear here.
          </span>
        )}
      </div>
    </div>
  );
}

function RichTextArea({
  value = "",
  onChange,
  placeholder = "Write your response...",
  rows = 5,
  label,
}) {
  const wordCount = useMemo(() => {
    const words = `${value ?? ""}`.trim().split(/\s+/).filter(Boolean);
    return words.length;
  }, [value]);

  return (
    <div className="space-y-2">
      {label ? (
        <div className="text-sm font-medium text-[var(--foreground)]">
          {label}
        </div>
      ) : null}
      <textarea
        className="min-h-[140px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none"
        rows={rows}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
      />
      <div className="text-xs text-[var(--muted-foreground)]">
        {wordCount} words
      </div>
    </div>
  );
}

function SelectGroup({
  options = [],
  multi_select = false,
  value,
  onChange,
  label,
}) {
  const selectedValues = multi_select
    ? Array.isArray(value)
      ? value
      : []
    : typeof value === "string"
      ? value
      : "";

  const handleToggle = useCallback(
    (optionId) => {
      if (multi_select) {
        const current = Array.isArray(selectedValues) ? selectedValues : [];
        const next = current.includes(optionId)
          ? current.filter((item) => item !== optionId)
          : [...current, optionId];
        onChange?.(next);
      } else {
        onChange?.(optionId);
      }
    },
    [multi_select, onChange, selectedValues],
  );

  return (
    <div className="space-y-3">
      {label ? (
        <div className="text-sm font-medium text-[var(--foreground)]">
          {label}
        </div>
      ) : null}
      <div className="space-y-2">
        {options.map((option) => {
          const isSelected = multi_select
            ? selectedValues.includes(option.id)
            : selectedValues === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleToggle(option.id)}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                isSelected
                  ? "border-[var(--primary)] bg-[var(--primary)]/10"
                  : "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--primary)]/40"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center">
                {isSelected ? (
                  <CheckCircle2 className="h-4 w-4 text-[var(--primary)]" />
                ) : (
                  <Circle className="h-4 w-4 text-[var(--muted-foreground)]" />
                )}
              </span>
              <span className="text-sm text-[var(--foreground)]">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SortableItem({ id, label }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm text-[var(--foreground)] shadow-sm transition ${
        isDragging
          ? "border-[var(--primary)] bg-[var(--primary)]/10"
          : "border-[var(--border)] bg-[var(--surface-1)]"
      }`}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4 text-[var(--muted-foreground)]" />
      <span className="flex-1">{label}</span>
    </div>
  );
}

function SortableList({ value = [], onChange, label }) {
  const items = Array.isArray(value) ? value : [];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = items.indexOf(active.id);
      const newIndex = items.indexOf(over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      onChange?.(arrayMove(items, oldIndex, newIndex));
    },
    [items, onChange],
  );

  return (
    <div className="space-y-3">
      {label ? (
        <div className="text-sm font-medium text-[var(--foreground)]">
          {label}
        </div>
      ) : null}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item) => (
              <SortableItem key={item} id={item} label={item} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function TableInput({ value = [], onChange, rows = 0, columns = [], label }) {
  const rowCount = Math.max(0, Number(rows) || 0);
  const columnHeaders = Array.isArray(columns) ? columns : [];

  const tableData = useMemo(() => {
    return Array.from({ length: rowCount }, (_, rowIndex) =>
      Array.from({ length: columnHeaders.length }, (_, colIndex) => {
        return value?.[rowIndex]?.[colIndex] ?? "";
      }),
    );
  }, [columnHeaders.length, rowCount, value]);

  const handleCellChange = useCallback(
    (rowIndex, colIndex, nextValue) => {
      const nextTable = Array.from({ length: rowCount }, (_, rIndex) =>
        Array.from({ length: columnHeaders.length }, (_, cIndex) => {
          return tableData?.[rIndex]?.[cIndex] ?? "";
        }),
      );
      nextTable[rowIndex][colIndex] = nextValue;
      onChange?.(nextTable);
    },
    [columnHeaders.length, onChange, rowCount, tableData],
  );

  return (
    <div className="space-y-3">
      {label ? (
        <div className="text-sm font-medium text-[var(--foreground)]">
          {label}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="min-w-full border-collapse text-left text-sm text-[var(--foreground)]">
          {columnHeaders.length ? (
            <thead className="bg-[var(--surface-2)]">
              <tr>
                {columnHeaders.map((header, index) => (
                  <th
                    key={`${header}-${index}`}
                    className="border-b border-[var(--border)] px-3 py-2 font-medium"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`} className="odd:bg-[var(--surface-1)]">
                {row.map((cell, colIndex) => (
                  <td
                    key={`cell-${rowIndex}-${colIndex}`}
                    className="border-b border-[var(--border)] px-3 py-2"
                  >
                    <input
                      className="w-full rounded-lg border border-[var(--border)] bg-transparent px-2 py-1 text-sm focus:border-[var(--primary)] focus:outline-none"
                      type="text"
                      value={cell}
                      onChange={(event) =>
                        handleCellChange(rowIndex, colIndex, event.target.value)
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImageHotspot({
  src,
  image_url,
  imageUrl,
  alt = "Hotspot image",
  value,
  onChange,
  label,
}) {
  const containerRef = useRef(null);
  const resolvedSrc = src || image_url || imageUrl;
  const hasValue = Array.isArray(value) && value.length === 2;
  const [x, y] = hasValue ? value : [];

  const handleClick = useCallback(
    (event) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const nextX = ((event.clientX - rect.left) / rect.width) * 100;
      const nextY = ((event.clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.min(100, Math.max(0, nextX));
      const clampedY = Math.min(100, Math.max(0, nextY));
      onChange?.([
        Number(clampedX.toFixed(2)),
        Number(clampedY.toFixed(2)),
      ]);
    },
    [onChange],
  );

  return (
    <div className="space-y-2">
      {label ? (
        <div className="text-sm font-medium text-[var(--foreground)]">
          {label}
        </div>
      ) : null}
      <div
        ref={containerRef}
        onClick={handleClick}
        className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]"
      >
        {resolvedSrc ? (
          <img
            src={resolvedSrc}
            alt={alt}
            className="block h-auto w-full select-none object-contain"
          />
        ) : (
          <div className="flex h-48 items-center justify-center text-sm text-[var(--muted-foreground)]">
            No image provided.
          </div>
        )}
        {hasValue ? (
          <MapPin
            className="absolute h-6 w-6 -translate-x-1/2 -translate-y-full text-[var(--primary)] drop-shadow"
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        ) : null}
      </div>
      {hasValue ? (
        <div className="text-xs text-[var(--muted-foreground)]">
          Selected: {x}%, {y}%
        </div>
      ) : (
        <div className="text-xs text-[var(--muted-foreground)]">
          Click on the image to place a pin.
        </div>
      )}
    </div>
  );
}

function buildInitialAnswers(layout) {
  if (!Array.isArray(layout)) return {};
  return layout.reduce((acc, item) => {
    if (!item?.id) return acc;
    const props = item?.props || {};
    const normalizedType = normalizeType(item?.type);
    let value;

    switch (normalizedType) {
      case "code_editor":
      case "code_question":
        value = props.initial_code ?? "";
        break;
      case "math_input":
      case "rich_text_area":
        value = props.initial_value ?? "";
        break;
      case "short_answer":
      case "long_form_response":
        value = "";
        break;
      case "select_group":
        value = props.multi_select ? [] : "";
        break;
      case "multi_select_group":
        value = [];
        break;
      case "sortable_list":
        value = Array.isArray(props.items)
          ? props.items.map((entry, index) =>
              typeof entry === "string"
                ? entry
                : entry?.id ??
                  entry?.content ??
                  entry?.label ??
                  `item-${index + 1}`
            )
          : [];
        break;
      case "table_input": {
        const rowCount = Math.max(0, Number(props.rows) || 0);
        const colCount = Array.isArray(props.columns) ? props.columns.length : 0;
        value = Array.from({ length: rowCount }, (_, rowIndex) =>
          Array.from(
            { length: colCount },
            (_, colIndex) => props.initial_values?.[rowIndex]?.[colIndex] ?? ""
          )
        );
        break;
      }
      case "matrix_input": {
        const rowCount = Math.max(0, Number(props.rows) || 0);
        const colCount = Math.max(0, Number(props.cols) || 0);
        value = Array.from({ length: rowCount }, (_, rowIndex) =>
          Array.from(
            { length: colCount },
            (_, colIndex) => props.initial_values?.[rowIndex]?.[colIndex] ?? ""
          )
        );
        break;
      }
      case "image_hotspot":
        value = null;
        break;
      default:
        value = undefined;
        break;
    }

    if (value !== undefined) {
      acc[item.id] = value;
    }
    return acc;
  }, {});
}

function NotSupported({ type }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
      Not Supported: {type}
    </div>
  );
}

export default function TaskRenderer({ taskData, onSubmit, courseId, nodeId, isPreview = false }) {
  const layout = Array.isArray(taskData?.layout) ? taskData.layout : [];
  const initialAnswers = useMemo(() => buildInitialAnswers(layout), [layout]);
  const [answers, setAnswers] = useState(initialAnswers);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [gradePayload, setGradePayload] = useState(null);
  const submitAbortRef = useRef(null);
  const taskKey = useMemo(() => {
    const fallback = taskData?.title || "task";
    return taskData?.id || taskData?.task_id || taskData?.slug || fallback;
  }, [taskData?.id, taskData?.task_id, taskData?.slug, taskData?.title]);
  const storageKey = useMemo(() => {
    const parts = ["interactive_task_answers"];
    if (courseId) parts.push(String(courseId));
    if (nodeId) parts.push(String(nodeId));
    if (taskKey) parts.push(String(taskKey));
    return parts.join(":");
  }, [courseId, nodeId, taskKey]);
  const textFieldIds = useMemo(() => {
    if (!Array.isArray(layout)) return [];
    return layout
      .filter(
        (item) =>
          item?.id && TEXT_FIELD_TYPES.has(normalizeType(item.type))
      )
      .map((item) => item.id);
  }, [layout]);

  useEffect(() => {
    setSubmitError(null);
    setGradePayload(null);

    if (!storageKey) {
      setAnswers(initialAnswers);
      return;
    }

    let mergedAnswers = initialAnswers;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const cachedAnswers = parsed?.answers;
        if (cachedAnswers && typeof cachedAnswers === "object") {
          mergedAnswers = { ...initialAnswers };
          for (const id of textFieldIds) {
            if (Object.prototype.hasOwnProperty.call(cachedAnswers, id)) {
              mergedAnswers[id] = cachedAnswers[id];
            }
          }
        }
      }
    } catch (error) {
      console.warn("[TaskRenderer] Failed to read cached answers:", error);
    }

    setAnswers(mergedAnswers);
  }, [initialAnswers, storageKey, textFieldIds]);

  useEffect(() => {
    if (!storageKey || !textFieldIds.length) return;
    const snapshot = {};
    for (const id of textFieldIds) {
      if (Object.prototype.hasOwnProperty.call(answers, id)) {
        snapshot[id] = answers[id];
      }
    }
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          version: 1,
          updatedAt: Date.now(),
          answers: snapshot,
        })
      );
    } catch (error) {
      console.warn("[TaskRenderer] Failed to cache answers:", error);
    }
  }, [answers, storageKey, textFieldIds]);

  const handleAnswerChange = useCallback((id, value) => {
    setAnswers((prev) => ({
      ...prev,
      [id]: value,
    }));
    setSubmitError(null);
    setGradePayload(null);
  }, []);

  useEffect(() => {
    return () => {
      if (submitAbortRef.current) {
        submitAbortRef.current.abort();
      }
    };
  }, []);

  const submitAnswers = useCallback(async (answersToSubmit, signal) => {
    if (isPreview) {
      throw new Error("Task grading is disabled in preview mode.");
    }

    if (onSubmit) {
      return onSubmit(answersToSubmit, { signal });
    }

    if (!courseId || !nodeId) {
      throw new Error("Missing course or lesson ID for grading.");
    }

    const response = await authFetch(
      `/api/courses/${courseId}/nodes/${nodeId}/grade`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: answersToSubmit,
          sync: false,
        }),
        signal,
      },
    );

    return resolveAsyncJobResponse(response, {
      signal,
      errorLabel: "grade task",
    });
  }, [courseId, nodeId, onSubmit, isPreview]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    if (submitAbortRef.current) {
      submitAbortRef.current.abort();
    }
    const abortController = new AbortController();
    submitAbortRef.current = abortController;

    setIsSubmitting(true);
    setSubmitError(null);
    setGradePayload(null);

    try {
      const submission = await submitAnswers(answers, abortController.signal);
      let payload = null;
      let job = null;
      let result = null;

      if (
        submission &&
        typeof submission === "object" &&
        ("payload" in submission || "job" in submission || "result" in submission)
      ) {
        payload = submission.payload ?? null;
        job = submission.job ?? null;
        result = submission.result ?? null;
      } else {
        result = submission;
      }

      if (!result && !payload) {
        throw new Error("Grading completed but no result was returned.");
      }

      const grade = result?.grade ?? payload?.grade ?? result ?? null;
      setGradePayload({
        payload,
        job,
        result,
        grade,
      });
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("[TaskRenderer] Grading failed:", error);
      setSubmitError(error?.message || "Grading failed.");
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, isSubmitting, submitAnswers]);

  const gradeSummary = useMemo(() => {
    const grade = gradePayload?.grade;
    if (!grade || typeof grade !== "object") return null;

    const passed = grade.passed;
    const score =
      Number.isFinite(grade.score) || typeof grade.score === "number"
        ? grade.score
        : null;
    const earnedPoints = grade.earned_points ?? grade.earnedPoints;
    const totalPoints = grade.total_points ?? grade.totalPoints;
    const feedback =
      typeof grade.feedback === "string" ? grade.feedback : null;
    let resultCount = null;

    if (Array.isArray(grade.results)) {
      resultCount = grade.results.length;
    } else if (grade.results && typeof grade.results === "object") {
      resultCount = Object.keys(grade.results).length;
    }

    return {
      passed,
      score,
      earnedPoints,
      totalPoints,
      feedback,
      resultCount,
    };
  }, [gradePayload]);

  const gradeDetails = useMemo(() => {
    if (!gradePayload) return null;

    const grade = gradePayload.grade ?? null;

    let resultsList = [];
    const rawResults = grade?.results;
    if (Array.isArray(rawResults)) {
      resultsList = rawResults.map((entry, index) => ({
        key: entry.component_id || `result-${index + 1}`,
        ...entry,
      }));
    } else if (rawResults && typeof rawResults === "object") {
      resultsList = Object.entries(rawResults).map(([componentId, value], index) => ({
        key: componentId || `result-${index + 1}`,
        component_id: componentId,
        ...(value || {}),
      }));
    }

    return {
      grade,
      resultsList,
    };
  }, [gradePayload]);

  return (
    <div className="space-y-6">
      {taskData?.title ? (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            Interactive Task
          </p>
          <h2 className="text-2xl font-semibold text-[var(--foreground)]">
            {taskData.title}
          </h2>
        </div>
      ) : null}
      <div className="space-y-6">
        {layout.map((block) => {
          const Component = getComponent(block.type);
          if (!Component) {
            return (
              <NotSupported key={block.id} type={block.type || "Unknown"} />
            );
          }
          return (
            <div key={block.id} className="space-y-2">
              <Component
                {...(block.props || {})}
                id={block.id}
                value={answers[block.id]}
                onChange={(nextValue) =>
                  handleAnswerChange(block.id, nextValue)
                }
              />
            </div>
          );
        })}
      </div>
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className={`w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary-contrast)] shadow-lg shadow-[var(--primary)]/25 transition ${
            isSubmitting
              ? "cursor-not-allowed opacity-70"
              : "hover:translate-y-[-1px] hover:shadow-xl"
          }`}
        >
          {isSubmitting
            ? "Grading..."
            : gradePayload?.grade
              ? "Re-submit Task"
              : "Submit Task"}
        </button>
        {submitError ? (
          <div className="rounded-xl border border-[var(--danger)]/20 bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--danger)]">
            {submitError}
          </div>
        ) : null}
        {gradeSummary ? (
          <div
            className={`rounded-xl border px-4 py-4 ${
              gradeSummary.passed === true
                ? "border-[var(--success)]/30 bg-[var(--success)]/5"
                : gradeSummary.passed === false
                  ? "border-[var(--danger)]/30 bg-[var(--danger)]/5"
                  : "border-[var(--border)] bg-[var(--surface-1)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    gradeSummary.passed === true
                      ? "bg-[var(--success)]/20 text-[var(--success)]"
                      : gradeSummary.passed === false
                        ? "bg-[var(--danger)]/20 text-[var(--danger)]"
                        : "bg-[var(--muted-foreground)]/20 text-[var(--muted-foreground)]"
                  }`}
                >
                  {gradeSummary.passed === true ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </span>
                <div>
                  <div
                    className={`text-base font-semibold ${
                      gradeSummary.passed === true
                        ? "text-[var(--success)]"
                        : gradeSummary.passed === false
                          ? "text-[var(--danger)]"
                          : "text-[var(--foreground)]"
                    }`}
                  >
                    {gradeSummary.passed === true
                      ? "Great job!"
                      : gradeSummary.passed === false
                        ? "Keep trying"
                        : "Submitted"}
                  </div>
                  {Number.isFinite(gradeSummary.earnedPoints) &&
                  Number.isFinite(gradeSummary.totalPoints) ? (
                    <div className="text-sm text-[var(--muted-foreground)]">
                      {gradeSummary.earnedPoints}/{gradeSummary.totalPoints} points
                    </div>
                  ) : null}
                </div>
              </div>
              {(Number.isFinite(gradeSummary.score) ||
                typeof gradeSummary.score === "number") &&
              gradeSummary.score !== gradeSummary.earnedPoints ? (
                <div className="text-right">
                  <div className="text-2xl font-bold text-[var(--foreground)]">
                    {Math.round(gradeSummary.score * 100)}%
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        {gradeDetails?.resultsList?.length ? (
          <div className="space-y-4">
            {gradeDetails.resultsList.map((resultItem, index) => {
              const details =
                resultItem?.details && typeof resultItem.details === "object"
                  ? resultItem.details
                  : null;
              const rawDetails =
                details?.raw && typeof details.raw === "object"
                  ? details.raw
                  : null;
              const feedback =
                resultItem?.feedback ??
                details?.feedback ??
                rawDetails?.feedback ??
                null;
              const checkpointResults =
                details?.checkpoint_results ??
                rawDetails?.checkpoint_results;
              const passed =
                resultItem?.passed ??
                details?.passed ??
                rawDetails?.passed;

              // Filter checkpoints to only show unique ones with meaningful descriptions
              const uniqueCheckpoints = Array.isArray(checkpointResults)
                ? checkpointResults.reduce((acc, checkpoint) => {
                    const desc = checkpoint.description || "";
                    // Skip generic/repetitive checkpoints
                    if (!desc || acc.some((c) => c.description === desc)) {
                      return acc;
                    }
                    return [...acc, checkpoint];
                  }, [])
                : [];

              const metCount = uniqueCheckpoints.filter((c) => c.met).length;
              const totalCount = uniqueCheckpoints.length;

              return (
                <div
                  key={resultItem.key || `result-${index + 1}`}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden"
                >
                  {/* Feedback Section */}
                  {feedback ? (
                    <div className="px-4 py-4 border-b border-[var(--border)]">
                      <div className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                        Feedback
                      </div>
                      <pre className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap font-sans">
                        {feedback}
                      </pre>
                    </div>
                  ) : null}

                  {/* Test Case Results for code_runner */}
                  {resultItem.evaluator === "code_runner" && Array.isArray(details?.results) && details.results.length > 0 ? (
                    <div className="px-4 py-4 border-b border-[var(--border)]">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                          Test Results
                        </span>
                        <span className={`text-sm font-semibold ${
                          resultItem.passed ? "text-[var(--success)]" : "text-[var(--danger)]"
                        }`}>
                          {details.passed_count ?? 0}/{details.total_count ?? details.results.length} passed
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {details.results.map((testResult, testIdx) => (
                          <div key={testIdx} className="group relative">
                            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center cursor-default ${
                              testResult.passed
                                ? "bg-[var(--success)]/20 border-[var(--success)] text-[var(--success)]"
                                : "bg-[var(--danger)]/20 border-[var(--danger)] text-[var(--danger)]"
                            }`}>
                              {testResult.passed ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </div>
                            {/* Tooltip on hover */}
                            <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 max-w-[90vw] hidden group-hover:block">
                              <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-xl p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-[var(--foreground)]">
                                    {testResult.description || `Test ${testIdx + 1}`}
                                  </span>
                                  <span className={`text-xs font-medium ${
                                    testResult.passed ? "text-[var(--success)]" : "text-[var(--danger)]"
                                  }`}>
                                    {testResult.passed ? "Passed" : "Failed"}
                                  </span>
                                </div>
                                {testResult.input && (
                                  <div>
                                    <span className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">Input</span>
                                    <pre className="mt-1 p-2 rounded-lg bg-[var(--surface-2)] font-mono text-xs overflow-x-auto max-h-16 overflow-y-auto">
                                      {testResult.input}
                                    </pre>
                                  </div>
                                )}
                                <div>
                                  <span className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">Expected</span>
                                  <pre className="mt-1 p-2 rounded-lg bg-[var(--surface-2)] font-mono text-xs overflow-x-auto max-h-16 overflow-y-auto">
                                    {testResult.expected_output || "(empty)"}
                                  </pre>
                                </div>
                                {!testResult.passed && (
                                  <div>
                                    <span className="text-[10px] uppercase tracking-wide text-[var(--danger)]">Your Output</span>
                                    <pre className="mt-1 p-2 rounded-lg bg-[var(--danger)]/10 font-mono text-xs overflow-x-auto max-h-16 overflow-y-auto">
                                      {testResult.actual_output || "(no output)"}
                                    </pre>
                                  </div>
                                )}
                                {testResult.stderr && (
                                  <div>
                                    <span className="text-[10px] uppercase tracking-wide text-[var(--danger)]">Error</span>
                                    <pre className="mt-1 p-2 rounded-lg bg-[var(--danger)]/10 font-mono text-xs text-[var(--danger)] overflow-x-auto max-h-20 overflow-y-auto whitespace-pre-wrap">
                                      {testResult.stderr}
                                    </pre>
                                  </div>
                                )}
                              </div>
                              <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-[var(--surface-1)] border-r border-b border-[var(--border)] rotate-45" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Checkpoints Section - Simplified */}
                  {uniqueCheckpoints.length > 0 ? (
                    <div className="px-4 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                          Requirements
                        </span>
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {metCount}/{totalCount} met
                        </span>
                      </div>
                      <div className="space-y-2">
                        {uniqueCheckpoints.map((checkpoint, idx) => (
                          <div
                            key={`${checkpoint.description || "checkpoint"}-${idx}`}
                            className="flex items-start gap-3"
                          >
                            <span
                              className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                                checkpoint.met
                                  ? "bg-[var(--success)]/20 text-[var(--success)]"
                                  : "bg-[var(--danger)]/20 text-[var(--danger)]"
                              }`}
                            >
                              {checkpoint.met ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <Circle className="w-3 h-3" />
                              )}
                            </span>
                            <span className="text-sm text-[var(--foreground)]">
                              {checkpoint.description || `Requirement ${idx + 1}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
