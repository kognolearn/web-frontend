"use client";

import React, { useState, useCallback, useMemo } from "react";
import { GripVertical, X, Check, Link2 } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";

/**
 * Draggable left item
 */
function DraggableLeftItem({ id, content, isMatched, pairGrade, disabled }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: disabled || isMatched,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  let itemClass = "border-[var(--border)] bg-[var(--surface-2)]";
  if (pairGrade === "correct") {
    itemClass = "border-emerald-500 bg-emerald-500/10";
  } else if (pairGrade === "incorrect") {
    itemClass = "border-rose-500 bg-rose-500/10";
  } else if (isMatched) {
    itemClass = "border-blue-500 bg-blue-500/10";
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(disabled || isMatched ? {} : { ...listeners, ...attributes })}
      className={`
        w-full p-3 rounded-xl border ${itemClass}
        text-left text-sm text-[var(--foreground)]
        transition-all
        ${isDragging ? "opacity-50 shadow-lg" : ""}
        ${disabled || isMatched ? "cursor-default" : "cursor-grab active:cursor-grabbing hover:border-[var(--primary)]/50"}
      `}
    >
      <div className="flex items-center gap-2">
        {!disabled && !isMatched && (
          <GripVertical className="w-4 h-4 text-[var(--muted-foreground)] flex-shrink-0" />
        )}
        <span className="flex-1">{content}</span>
        {isMatched && !pairGrade && (
          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400 flex-shrink-0">
            Matched
          </span>
        )}
        {pairGrade === "correct" && <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
        {pairGrade === "incorrect" && <X className="w-4 h-4 text-rose-500 flex-shrink-0" />}
      </div>
    </div>
  );
}

/**
 * Droppable right item
 */
function DroppableRightItem({ id, content, matchCount, isAvailable, isOver, disabled }) {
  const { setNodeRef } = useDroppable({
    id,
    disabled: disabled || !isAvailable,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        w-full p-3 rounded-xl border transition-all
        ${
          isOver
            ? "border-[var(--primary)] bg-[var(--primary)]/10 ring-2 ring-[var(--primary)]/20"
            : matchCount > 0
            ? "border-blue-500 bg-blue-500/10"
            : "border-[var(--border)] bg-[var(--surface-2)]"
        }
        text-left text-sm text-[var(--foreground)]
        ${!isAvailable && !isOver ? "opacity-75" : ""}
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex-1">{content}</span>
        {matchCount > 0 && (
          <span className="text-xs text-[var(--muted-foreground)] flex-shrink-0">
            ({matchCount} match{matchCount !== 1 ? "es" : ""})
          </span>
        )}
        {isOver && isAvailable && (
          <Link2 className="w-4 h-4 text-[var(--primary)] animate-pulse flex-shrink-0" />
        )}
      </div>
    </div>
  );
}

/**
 * Drag overlay
 */
function DragOverlayItem({ content }) {
  return (
    <div className="p-3 rounded-xl border border-[var(--primary)] bg-[var(--surface-2)] shadow-xl cursor-grabbing">
      <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
        <GripVertical className="w-4 h-4 text-[var(--muted-foreground)]" />
        <span>{content}</span>
      </div>
    </div>
  );
}

/**
 * MatchingPairs - Drag-and-drop matching
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {Array<[string, string]>} [props.value] - Matched pairs [[leftId, rightId], ...]
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {Array<{id: string, content: string}>} props.left_items - Left column items
 * @param {Array<{id: string, content: string}>} props.right_items - Right column items
 * @param {boolean} [props.allow_many_to_one] - Allow multiple left items to match one right
 * @param {boolean} [props.shuffle] - Shuffle items
 */
export default function MatchingPairs({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  left_items = [],
  right_items = [],
  allow_many_to_one = false,
  shuffle = true,
}) {
  const [pairs, setPairs] = useState(value || []);
  const [activeId, setActiveId] = useState(null);
  const [overId, setOverId] = useState(null);

  const currentPairs = value !== undefined ? value : pairs;

  // Configure sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Shuffle items if needed (seeded for consistency)
  const shuffledRight = useMemo(() => {
    if (!shuffle) return right_items;
    const items = [...right_items];
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }, [right_items, shuffle]);

  const getMatchForLeft = (leftId) => {
    const pair = currentPairs.find(([l]) => l === leftId);
    return pair ? pair[1] : null;
  };

  const getMatchesForRight = (rightId) => {
    return currentPairs.filter(([, r]) => r === rightId).map(([l]) => l);
  };

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragOver = useCallback((event) => {
    setOverId(event.over?.id || null);
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const leftId = active.id;
    const rightId = over.id;

    // Check if this is a valid right item
    const isValidRight = right_items.some((item) => item.id === rightId);
    if (!isValidRight) return;

    // Check if right item is already matched (and not allow_many_to_one)
    if (!allow_many_to_one && getMatchesForRight(rightId).length > 0) {
      return;
    }

    // Remove existing match for this left item
    const newPairs = [...currentPairs.filter(([l]) => l !== leftId), [leftId, rightId]];
    setPairs(newPairs);
    onChange?.(newPairs);
  }, [currentPairs, right_items, allow_many_to_one, onChange]);

  const handleRemoveMatch = useCallback((leftId) => {
    if (disabled || isGraded) return;
    const newPairs = currentPairs.filter(([l]) => l !== leftId);
    setPairs(newPairs);
    onChange?.(newPairs);
  }, [disabled, isGraded, currentPairs, onChange]);

  // Get grade status for a pair
  const getPairGrade = (leftId) => {
    if (!isGraded || !grade?.expected) return null;
    const userMatch = getMatchForLeft(leftId);
    const expectedMatch = grade.expected.find(([l]) => l === leftId)?.[1];

    if (!userMatch && !expectedMatch) return null;
    if (userMatch === expectedMatch) return "correct";
    return "incorrect";
  };

  const activeItem = activeId ? left_items.find((item) => item.id === activeId) : null;

  return (
    <div id={id} className="v2-matching-pairs">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-2 gap-4">
          {/* Left column - draggable items */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
              Drag from here
            </h4>
            {left_items.map((item) => {
              const match = getMatchForLeft(item.id);
              const pairGrade = getPairGrade(item.id);
              const isMatched = !!match;

              return (
                <div key={item.id} className="relative">
                  <DraggableLeftItem
                    id={item.id}
                    content={item.content}
                    isMatched={isMatched}
                    pairGrade={pairGrade}
                    disabled={disabled || isGraded}
                  />
                  {/* Remove match button */}
                  {isMatched && !isGraded && !disabled && (
                    <button
                      onClick={() => handleRemoveMatch(item.id)}
                      className="absolute -right-2 -top-2 p-1 rounded-full bg-[var(--surface-1)] border border-[var(--border)] hover:bg-rose-500/10 hover:border-rose-500/50 transition-colors"
                      title="Remove match"
                    >
                      <X className="w-3 h-3 text-[var(--muted-foreground)]" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right column - droppable items */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
              Drop to match
            </h4>
            {shuffledRight.map((item) => {
              const matches = getMatchesForRight(item.id);
              const isAvailable = allow_many_to_one || matches.length === 0;

              return (
                <DroppableRightItem
                  key={item.id}
                  id={item.id}
                  content={item.content}
                  matchCount={matches.length}
                  isAvailable={isAvailable}
                  isOver={overId === item.id && activeId}
                  disabled={disabled || isGraded}
                />
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {activeItem ? <DragOverlayItem content={activeItem.content} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Instructions */}
      {!isGraded && !disabled && (
        <p className="mt-3 text-xs text-[var(--muted-foreground)]">
          Drag items from the left and drop them on their matches on the right
        </p>
      )}

      {/* Match lines visualization */}
      {currentPairs.length > 0 && !isGraded && (
        <div className="mt-3 p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
          <p className="text-xs font-medium text-[var(--muted-foreground)] mb-2">Current matches:</p>
          <div className="space-y-1">
            {currentPairs.map(([leftId, rightId]) => {
              const leftItem = left_items.find((i) => i.id === leftId);
              const rightItem = right_items.find((i) => i.id === rightId);
              return (
                <div key={leftId} className="flex items-center gap-2 text-xs text-[var(--foreground)]">
                  <span className="truncate max-w-[40%]">{leftItem?.content}</span>
                  <Link2 className="w-3 h-3 text-blue-500 flex-shrink-0" />
                  <span className="truncate max-w-[40%]">{rightItem?.content}</span>
                </div>
              );
            })}
          </div>
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
