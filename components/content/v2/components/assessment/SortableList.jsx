"use client";

import React, { useState, useCallback } from "react";
import { GripVertical, ArrowUp, ArrowDown, Check, X } from "lucide-react";

/**
 * SortableList - Drag-and-drop or button-based ordering
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {string[]} [props.value] - Ordered array of item IDs
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {Array<{id: string, content: string}>} props.items - Items to sort
 */
export default function SortableList({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  items = [],
}) {
  // Initialize with items in original order if no value
  const [order, setOrder] = useState(
    value || items.map((item) => item.id)
  );

  const currentOrder = value !== undefined ? value : order;

  const moveItem = useCallback((index, direction) => {
    if (disabled || isGraded) return;

    const newOrder = [...currentOrder];
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= newOrder.length) return;

    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];

    setOrder(newOrder);
    onChange?.(newOrder);
  }, [disabled, isGraded, currentOrder, onChange]);

  // Get position status for grading
  const getPositionStatus = (itemId, index) => {
    if (!isGraded || !grade?.expected) return null;
    const expectedIndex = grade.expected.indexOf(itemId);
    return expectedIndex === index ? "correct" : "incorrect";
  };

  // Get item by ID
  const getItem = (itemId) => items.find((item) => item.id === itemId);

  return (
    <div id={id} className="v2-sortable-list space-y-2">
      {currentOrder.map((itemId, index) => {
        const item = getItem(itemId);
        if (!item) return null;

        const status = getPositionStatus(itemId, index);

        return (
          <div
            key={itemId}
            className={`
              flex items-center gap-3 p-3 rounded-xl border
              ${
                status === "correct"
                  ? "border-emerald-500 bg-emerald-500/10"
                  : status === "incorrect"
                  ? "border-rose-500 bg-rose-500/10"
                  : "border-[var(--border)] bg-[var(--surface-2)]"
              }
            `}
          >
            {/* Drag handle / position indicator */}
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--surface-1)] flex items-center justify-center">
              {disabled || isGraded ? (
                <span className="text-sm font-medium text-[var(--muted-foreground)]">
                  {index + 1}
                </span>
              ) : (
                <GripVertical className="w-4 h-4 text-[var(--muted-foreground)]" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 text-sm text-[var(--foreground)]">
              {item.content}
            </div>

            {/* Status icon */}
            {status === "correct" && (
              <Check className="w-5 h-5 text-emerald-500" />
            )}
            {status === "incorrect" && (
              <X className="w-5 h-5 text-rose-500" />
            )}

            {/* Move buttons */}
            {!disabled && !isGraded && (
              <div className="flex gap-1">
                <button
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-1)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowUp className="w-4 h-4 text-[var(--muted-foreground)]" />
                </button>
                <button
                  onClick={() => moveItem(index, 1)}
                  disabled={index === currentOrder.length - 1}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-1)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowDown className="w-4 h-4 text-[var(--muted-foreground)]" />
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Show correct order if wrong */}
      {isGraded && !grade?.passed && grade?.expected && (
        <div className="mt-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
            Correct order:
          </p>
          <ol className="text-sm text-[var(--foreground)] space-y-1 list-decimal list-inside">
            {grade.expected.map((itemId) => (
              <li key={itemId}>{getItem(itemId)?.content}</li>
            ))}
          </ol>
        </div>
      )}

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
