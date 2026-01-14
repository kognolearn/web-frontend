"use client";

import React, { useState, useCallback, useId } from "react";
import { GripVertical, X, Check } from "lucide-react";
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
 * Draggable item component
 */
function DraggableItem({ id, content, disabled }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm
        border border-[var(--border)] bg-[var(--surface-1)] text-[var(--foreground)]
        ${disabled ? "cursor-not-allowed opacity-75" : "cursor-grab active:cursor-grabbing hover:border-[var(--primary)]/50"}
        ${isDragging ? "opacity-50" : ""}
      `}
    >
      {!disabled && <GripVertical className="w-3 h-3 text-[var(--muted-foreground)]" />}
      <span>{content}</span>
    </div>
  );
}

/**
 * Droppable bucket component
 */
function DroppableBucket({ bucket, items, getItem, getItemStatus, onRemove, disabled, isGraded, isOver }) {
  const { setNodeRef } = useDroppable({
    id: bucket.id,
  });

  return (
    <div
      className={`
        rounded-xl border overflow-hidden transition-colors
        ${isOver ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20" : "border-[var(--border)]"}
        bg-[var(--surface-2)]
      `}
    >
      {/* Bucket header */}
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-1)]">
        <h5 className="font-medium text-[var(--foreground)]">
          {bucket.label}
        </h5>
        {bucket.description && (
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {bucket.description}
          </p>
        )}
      </div>

      {/* Bucket content - droppable area */}
      <div
        ref={setNodeRef}
        className={`
          p-3 min-h-[100px] transition-colors
          ${isOver ? "bg-[var(--primary)]/5" : ""}
        `}
      >
        <div className="flex flex-wrap gap-2">
          {items.map((itemId) => {
            const item = getItem(itemId);
            const status = getItemStatus(bucket.id, itemId);

            return (
              <div
                key={itemId}
                className={`
                  flex items-center gap-1 px-2 py-1 rounded-lg text-sm
                  ${
                    status === "correct"
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      : status === "incorrect"
                      ? "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                      : "bg-[var(--surface-1)] text-[var(--foreground)]"
                  }
                `}
              >
                <span>{item?.content}</span>
                {status === "correct" && <Check className="w-3 h-3" />}
                {status === "incorrect" && <X className="w-3 h-3" />}
                {!isGraded && !disabled && (
                  <button
                    onClick={() => onRemove(bucket.id, itemId)}
                    className="ml-1 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {items.length === 0 && (
            <span className="text-sm text-[var(--muted-foreground)]">
              {isOver ? "Drop here" : "Drag items here"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Drag overlay item
 */
function DragOverlayItem({ content }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-[var(--primary)] bg-[var(--surface-1)] text-[var(--foreground)] shadow-xl cursor-grabbing">
      <GripVertical className="w-3 h-3 text-[var(--muted-foreground)]" />
      <span>{content}</span>
    </div>
  );
}

/**
 * ClassificationBuckets - Drag items into category buckets
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {Object.<string, string[]>} [props.value] - Items in each bucket { bucketId: [itemIds] }
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {Array<{id: string, content: string}>} props.items - Items to classify
 * @param {Array<{id: string, label: string, description?: string}>} props.buckets - Category buckets
 * @param {boolean} [props.shuffle_items] - Shuffle items
 */
export default function ClassificationBuckets({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  items = [],
  buckets = [],
  shuffle_items = true,
}) {
  const unclassifiedId = useId();

  // Initialize empty buckets
  const initBuckets = () => {
    const initial = {};
    buckets.forEach((b) => {
      initial[b.id] = [];
    });
    return initial;
  };

  const [classification, setClassification] = useState(value || initBuckets());
  const [activeId, setActiveId] = useState(null);
  const [overId, setOverId] = useState(null);

  const currentClassification = value !== undefined ? value : classification;

  // Configure sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Get unclassified items
  const getUnclassifiedItems = () => {
    const classifiedIds = new Set(
      Object.values(currentClassification).flat()
    );
    return items.filter((item) => !classifiedIds.has(item.id));
  };

  // Get item by ID
  const getItem = (itemId) => items.find((item) => item.id === itemId);

  // Get grade status for an item in a bucket
  const getItemStatus = (bucketId, itemId) => {
    if (!isGraded || !grade?.expected) return null;
    const expectedBucket = grade.expected[bucketId] || [];
    return expectedBucket.includes(itemId) ? "correct" : "incorrect";
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

    const itemId = active.id;
    const targetBucketId = over.id;

    // Check if dropping on a valid bucket
    const isValidBucket = buckets.some((b) => b.id === targetBucketId);
    if (!isValidBucket) return;

    // Remove from current bucket if exists
    const newClassification = { ...currentClassification };
    Object.keys(newClassification).forEach((bId) => {
      newClassification[bId] = newClassification[bId].filter(
        (id) => id !== itemId
      );
    });

    // Add to new bucket
    newClassification[targetBucketId] = [
      ...(newClassification[targetBucketId] || []),
      itemId,
    ];

    setClassification(newClassification);
    onChange?.(newClassification);
  }, [buckets, currentClassification, onChange]);

  const handleRemoveFromBucket = useCallback((bucketId, itemId) => {
    if (disabled || isGraded) return;

    const newClassification = {
      ...currentClassification,
      [bucketId]: currentClassification[bucketId].filter((id) => id !== itemId),
    };

    setClassification(newClassification);
    onChange?.(newClassification);
  }, [disabled, isGraded, currentClassification, onChange]);

  const unclassified = getUnclassifiedItems();
  const activeItem = activeId ? getItem(activeId) : null;

  return (
    <div id={id} className="v2-classification-buckets space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Unclassified items */}
        <div>
          <h4 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
            Items to classify ({unclassified.length} remaining)
          </h4>
          <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)]/50 min-h-[60px]">
            {unclassified.length === 0 ? (
              <span className="text-sm text-[var(--muted-foreground)]">
                All items classified
              </span>
            ) : (
              unclassified.map((item) => (
                <DraggableItem
                  key={item.id}
                  id={item.id}
                  content={item.content}
                  disabled={disabled || isGraded}
                />
              ))
            )}
          </div>
        </div>

        {/* Buckets */}
        <div className="grid gap-4 md:grid-cols-2">
          {buckets.map((bucket) => (
            <DroppableBucket
              key={bucket.id}
              bucket={bucket}
              items={currentClassification[bucket.id] || []}
              getItem={getItem}
              getItemStatus={getItemStatus}
              onRemove={handleRemoveFromBucket}
              disabled={disabled}
              isGraded={isGraded}
              isOver={overId === bucket.id}
            />
          ))}
        </div>

        <DragOverlay>
          {activeItem ? <DragOverlayItem content={activeItem.content} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Instructions */}
      {!isGraded && !disabled && (
        <p className="text-xs text-[var(--muted-foreground)]">
          Drag items into the appropriate categories
        </p>
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
