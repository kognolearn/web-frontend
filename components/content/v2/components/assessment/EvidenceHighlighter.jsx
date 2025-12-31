"use client";

import React, { useState, useCallback, useRef } from "react";
import { Highlighter } from "lucide-react";

/**
 * EvidenceHighlighter - Text selection with colors
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {Array<{start: number, end: number, color_id: string}>} [props.value] - Highlighted ranges
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {string} props.passage - Text passage to highlight
 * @param {Array<{id: string, label: string, color: string}>} props.highlight_colors - Available colors
 * @param {string} props.instruction - Instructions
 * @param {number} [props.min_highlights] - Minimum highlights required
 * @param {number} [props.max_highlights] - Maximum highlights allowed
 */
export default function EvidenceHighlighter({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  passage = "",
  highlight_colors = [],
  instruction = "Select and highlight relevant text",
  min_highlights,
  max_highlights,
}) {
  const [highlights, setHighlights] = useState(value || []);
  const [selectedColor, setSelectedColor] = useState(
    highlight_colors[0]?.id || null
  );
  const textRef = useRef(null);

  const currentHighlights = value !== undefined ? value : highlights;

  const handleTextSelection = useCallback(() => {
    if (disabled || isGraded || !selectedColor) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const container = textRef.current;
    if (!container) return;

    // Check if selection is within our container
    if (!container.contains(range.commonAncestorContainer)) return;

    // Get the text content up to the selection
    const fullText = container.textContent || "";
    const selectionText = selection.toString();

    // Find the start position in the original text
    const preSelectionRange = document.createRange();
    preSelectionRange.selectNodeContents(container);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;
    const end = start + selectionText.length;

    // Check max highlights
    if (max_highlights && currentHighlights.length >= max_highlights) {
      selection.removeAllRanges();
      return;
    }

    // Add new highlight (merge with existing if overlapping)
    const newHighlight = { start, end, color_id: selectedColor };
    const newHighlights = [...currentHighlights, newHighlight];

    setHighlights(newHighlights);
    onChange?.(newHighlights);
    selection.removeAllRanges();
  }, [disabled, isGraded, selectedColor, currentHighlights, max_highlights, onChange]);

  const removeHighlight = (index) => {
    if (disabled || isGraded) return;
    const newHighlights = currentHighlights.filter((_, i) => i !== index);
    setHighlights(newHighlights);
    onChange?.(newHighlights);
  };

  // Render text with highlights
  const renderHighlightedText = () => {
    if (!passage) return null;

    // Sort highlights by start position
    const sortedHighlights = [...currentHighlights].sort(
      (a, b) => a.start - b.start
    );

    const elements = [];
    let lastIndex = 0;

    sortedHighlights.forEach((highlight, index) => {
      // Add text before highlight
      if (highlight.start > lastIndex) {
        elements.push(
          <span key={`text-${index}`}>
            {passage.slice(lastIndex, highlight.start)}
          </span>
        );
      }

      // Get color
      const colorConfig = highlight_colors.find(
        (c) => c.id === highlight.color_id
      );
      const bgColor = colorConfig?.color || "#ffff00";

      // Add highlighted text
      elements.push(
        <span
          key={`highlight-${index}`}
          className="relative group cursor-pointer"
          style={{ backgroundColor: bgColor, padding: "0 2px" }}
        >
          {passage.slice(highlight.start, highlight.end)}
          {!isGraded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeHighlight(index);
              }}
              className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded
                bg-black/80 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Remove
            </button>
          )}
        </span>
      );

      lastIndex = highlight.end;
    });

    // Add remaining text
    if (lastIndex < passage.length) {
      elements.push(
        <span key="text-end">{passage.slice(lastIndex)}</span>
      );
    }

    return elements;
  };

  return (
    <div id={id} className="v2-evidence-highlighter">
      {/* Instruction */}
      <div className="flex items-center gap-2 mb-3">
        <Highlighter className="w-4 h-4 text-[var(--primary)]" />
        <span className="text-sm text-[var(--foreground)]">{instruction}</span>
      </div>

      {/* Color selector */}
      {!isGraded && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-[var(--muted-foreground)]">
            Select color:
          </span>
          <div className="flex gap-1">
            {highlight_colors.map((color) => (
              <button
                key={color.id}
                onClick={() => setSelectedColor(color.id)}
                disabled={disabled}
                className={`
                  px-3 py-1 rounded-lg text-xs font-medium transition-all
                  ${
                    selectedColor === color.id
                      ? "ring-2 ring-offset-2 ring-[var(--primary)]"
                      : "hover:opacity-80"
                  }
                `}
                style={{ backgroundColor: color.color }}
                title={color.label}
              >
                {color.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Text passage */}
      <div
        ref={textRef}
        onMouseUp={handleTextSelection}
        className={`
          p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]
          text-[var(--foreground)] leading-relaxed
          ${disabled || isGraded ? "select-none" : "select-text cursor-text"}
        `}
      >
        {renderHighlightedText()}
      </div>

      {/* Stats */}
      <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
        <span>
          {currentHighlights.length} highlight{currentHighlights.length !== 1 ? "s" : ""}
          {min_highlights && ` (min: ${min_highlights})`}
          {max_highlights && ` (max: ${max_highlights})`}
        </span>
        {!isGraded && currentHighlights.length > 0 && (
          <button
            onClick={() => {
              setHighlights([]);
              onChange?.([]);
            }}
            className="text-rose-500 hover:underline"
          >
            Clear all
          </button>
        )}
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
