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
import { CheckCircle2, Circle, GripVertical, MapPin } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

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

  return (
    <div className="space-y-2">
      {label ? (
        <div className="text-sm font-medium text-[var(--foreground)]">
          {label}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
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
  );
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

export const ComponentRegistry = {
  MarkdownBlock,
  CodeEditor,
  MathInput,
  RichTextArea,
  SelectGroup,
  SortableList,
  TableInput,
  ImageHotspot,
};

function buildInitialAnswers(layout) {
  if (!Array.isArray(layout)) return {};
  return layout.reduce((acc, item) => {
    if (!item?.id) return acc;
    const props = item?.props || {};
    switch (item?.type) {
      case "CodeEditor":
        acc[item.id] = props.initial_code ?? "";
        break;
      case "MathInput":
        acc[item.id] = props.initial_value ?? "";
        break;
      case "RichTextArea":
        acc[item.id] = props.initial_value ?? "";
        break;
      case "SelectGroup":
        acc[item.id] = props.multi_select ? [] : "";
        break;
      case "SortableList":
        acc[item.id] = Array.isArray(props.items) ? props.items : [];
        break;
      case "TableInput": {
        const rowCount = Math.max(0, Number(props.rows) || 0);
        const colCount = Array.isArray(props.columns) ? props.columns.length : 0;
        acc[item.id] = Array.from({ length: rowCount }, () =>
          Array.from({ length: colCount }, () => ""),
        );
        break;
      }
      case "ImageHotspot":
        acc[item.id] = null;
        break;
      default:
        acc[item.id] = null;
        break;
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

export default function TaskRenderer({ taskData, onSubmit }) {
  const layout = Array.isArray(taskData?.layout) ? taskData.layout : [];
  const initialAnswers = useMemo(() => buildInitialAnswers(layout), [layout]);
  const [answers, setAnswers] = useState(initialAnswers);

  useEffect(() => {
    setAnswers(initialAnswers);
  }, [initialAnswers]);

  const handleAnswerChange = useCallback((id, value) => {
    setAnswers((prev) => ({
      ...prev,
      [id]: value,
    }));
  }, []);

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
          const Component = ComponentRegistry[block.type];
          if (!Component) {
            return (
              <NotSupported key={block.id} type={block.type || "Unknown"} />
            );
          }
          return (
            <div key={block.id} className="space-y-2">
              <Component
                {...(block.props || {})}
                value={answers[block.id]}
                onChange={(nextValue) =>
                  handleAnswerChange(block.id, nextValue)
                }
              />
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onSubmit?.(answers)}
        className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary-contrast)] shadow-lg shadow-[var(--primary)]/25 transition hover:translate-y-[-1px] hover:shadow-xl"
      >
        Submit Task
      </button>
    </div>
  );
}
