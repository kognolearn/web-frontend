"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { Highlighter } from "lucide-react";

/**
 * AnnotationHighlighter - Personal highlighting with optional notes
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {Array<{start: number, end: number, color_id: string, note?: string}>} [props.value]
 * @param {Function} [props.onChange]
 * @param {boolean} [props.disabled]
 * @param {string} props.passage
 * @param {Array<{id: string, label: string, color: string}>} props.highlight_colors
 * @param {boolean} [props.allow_notes=true]
 */
export default function AnnotationHighlighter({
  id,
  value,
  onChange,
  disabled = false,
  passage = "",
  highlight_colors = [],
  allow_notes = true,
}) {
  const [highlights, setHighlights] = useState(value || []);
  const [selectedColor, setSelectedColor] = useState(
    highlight_colors[0]?.id || null
  );
  const textRef = useRef(null);

  const currentHighlights = value !== undefined ? value : highlights;

  const handleTextSelection = useCallback(() => {
    if (disabled || !selectedColor) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const container = textRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) return;

    const preSelectionRange = document.createRange();
    preSelectionRange.selectNodeContents(container);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;
    const end = start + selection.toString().length;

    const newHighlight = { start, end, color_id: selectedColor, note: "" };
    const newHighlights = [...currentHighlights, newHighlight];
    setHighlights(newHighlights);
    onChange?.(newHighlights);
    selection.removeAllRanges();
  }, [disabled, selectedColor, currentHighlights, onChange]);

  const updateHighlight = (index, updates) => {
    const next = currentHighlights.map((item, idx) =>
      idx === index ? { ...item, ...updates } : item
    );
    setHighlights(next);
    onChange?.(next);
  };

  const removeHighlight = (index) => {
    const next = currentHighlights.filter((_, idx) => idx !== index);
    setHighlights(next);
    onChange?.(next);
  };

  const renderedText = useMemo(() => {
    if (!passage) return null;
    const sorted = [...currentHighlights].sort((a, b) => a.start - b.start);
    const output = [];
    let lastIndex = 0;

    sorted.forEach((highlight, index) => {
      if (highlight.start > lastIndex) {
        output.push(
          <span key={`text-${index}`}>
            {passage.slice(lastIndex, highlight.start)}
          </span>
        );
      }

      const colorConfig = highlight_colors.find(
        (color) => color.id === highlight.color_id
      );
      const bgColor = colorConfig?.color || "#fff59d";

      output.push(
        <span
          key={`highlight-${index}`}
          className="relative group cursor-pointer"
          style={{ backgroundColor: bgColor, padding: "0 2px" }}
          onClick={(event) => {
            event.stopPropagation();
            if (!disabled) removeHighlight(index);
          }}
          title={disabled ? "" : "Click to remove highlight"}
        >
          {passage.slice(highlight.start, highlight.end)}
        </span>
      );

      lastIndex = highlight.end;
    });

    if (lastIndex < passage.length) {
      output.push(
        <span key="text-end">{passage.slice(lastIndex)}</span>
      );
    }

    return output;
  }, [passage, currentHighlights, highlight_colors, disabled]);

  if (!passage) {
    return (
      <div
        id={id}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-center"
      >
        <p className="text-sm text-[var(--muted-foreground)]">
          No passage provided
        </p>
      </div>
    );
  }

  return (
    <div id={id} className="v2-annotation-highlighter space-y-4">
      <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
        <Highlighter className="w-4 h-4 text-[var(--primary)]" />
        Highlight and annotate
      </div>

      {!disabled && highlight_colors.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <span>Select color:</span>
          {highlight_colors.map((color) => (
            <button
              key={color.id}
              type="button"
              onClick={() => setSelectedColor(color.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedColor === color.id
                  ? "ring-2 ring-offset-2 ring-[var(--primary)]"
                  : "hover:opacity-80"
              }`}
              style={{ backgroundColor: color.color }}
              title={color.label}
            >
              {color.label}
            </button>
          ))}
        </div>
      )}

      <div
        ref={textRef}
        onMouseUp={handleTextSelection}
        className={`rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 leading-relaxed ${
          disabled ? "select-none" : "select-text cursor-text"
        }`}
      >
        {renderedText}
      </div>

      {allow_notes && currentHighlights.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Notes
          </div>
          {currentHighlights.map((highlight, index) => {
            const colorConfig = highlight_colors.find(
              (color) => color.id === highlight.color_id
            );
            return (
              <div
                key={`note-${index}`}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3"
              >
                <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: colorConfig?.color || "#fff59d" }}
                  />
                  {colorConfig?.label || "Highlight"} (#{index + 1})
                </div>
                <textarea
                  value={highlight.note || ""}
                  onChange={(event) =>
                    updateHighlight(index, { note: event.target.value })
                  }
                  placeholder="Add a note..."
                  className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
                  rows={2}
                  disabled={disabled}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
