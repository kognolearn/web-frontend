"use client";

import React, { useState, useCallback } from "react";
import { GripVertical, Check, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * Individual sortable item component
 */
function SortableItem({ id, item, index, status, disabled, isGraded }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: disabled || isGraded });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-3 p-3 rounded-xl border
        ${
          status === "correct"
            ? "border-emerald-500 bg-emerald-500/10"
            : status === "incorrect"
            ? "border-rose-500 bg-rose-500/10"
            : "border-[var(--border)] bg-[var(--surface-2)]"
        }
        ${isDragging ? "shadow-lg z-10" : ""}
      `}
    >
      {/* Drag handle / position indicator */}
      <div
        {...attributes}
        {...listeners}
        className={`
          flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--surface-1)] flex items-center justify-center
          ${disabled || isGraded ? "" : "cursor-grab active:cursor-grabbing"}
        `}
      >
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
    </div>
  );
}

/**
 * Drag overlay item (shown while dragging)
 */
function DragOverlayItem({ item }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--primary)] bg-[var(--surface-2)] shadow-xl">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--surface-1)] flex items-center justify-center cursor-grabbing">
        <GripVertical className="w-4 h-4 text-[var(--muted-foreground)]" />
      </div>
      <div className="flex-1 text-sm text-[var(--foreground)]">
        {item.content}
      </div>
    </div>
  );
}

/**
 * SortableList - Drag-and-drop ordering
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
  // Normalize items to always be objects with {id, content}
  const normalizedItems = items.map((item, index) =>
    typeof item === "string"
      ? { id: item, content: item }
      : { id: item.id ?? `item-${index}`, content: item.content ?? item.label ?? String(item) }
  );

  // Initialize with items in original order if no value
  const [order, setOrder] = useState(
    value || normalizedItems.map((item) => item.id)
  );
  const [activeId, setActiveId] = useState(null);

  const currentOrder = value !== undefined ? value : order;

  // Configure sensors for mouse/touch and keyboard
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance before activation
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveId(null);

    if (active.id !== over?.id) {
      const oldIndex = currentOrder.indexOf(active.id);
      const newIndex = currentOrder.indexOf(over.id);
      const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
      setOrder(newOrder);
      onChange?.(newOrder);
    }
  }, [currentOrder, onChange]);

  // Get position status for grading
  const getPositionStatus = (itemId, index) => {
    if (!isGraded || !grade?.expected) return null;
    const expectedIndex = grade.expected.indexOf(itemId);
    return expectedIndex === index ? "correct" : "incorrect";
  };

  // Get item by ID
  const getItem = (itemId) => normalizedItems.find((item) => item.id === itemId);
  const activeItem = activeId ? getItem(activeId) : null;

  return (
    <div id={id} className="v2-sortable-list space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={currentOrder}
          strategy={verticalListSortingStrategy}
        >
          {currentOrder.map((itemId, index) => {
            const item = getItem(itemId);
            if (!item) return null;

            return (
              <SortableItem
                key={itemId}
                id={itemId}
                item={item}
                index={index}
                status={getPositionStatus(itemId, index)}
                disabled={disabled}
                isGraded={isGraded}
              />
            );
          })}
        </SortableContext>

        <DragOverlay>
          {activeItem ? <DragOverlayItem item={activeItem} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Instructions */}
      {!isGraded && !disabled && (
        <p className="text-xs text-[var(--muted-foreground)] mt-2">
          Drag items to reorder them
        </p>
      )}

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
