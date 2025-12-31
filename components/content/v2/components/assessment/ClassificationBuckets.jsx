"use client";

import React, { useState, useCallback } from "react";
import { Plus, X, Check } from "lucide-react";

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
  // Initialize empty buckets
  const initBuckets = () => {
    const initial = {};
    buckets.forEach((b) => {
      initial[b.id] = [];
    });
    return initial;
  };

  const [classification, setClassification] = useState(value || initBuckets());
  const [selectedItem, setSelectedItem] = useState(null);

  const currentClassification = value !== undefined ? value : classification;

  // Get unclassified items
  const getUnclassifiedItems = () => {
    const classifiedIds = new Set(
      Object.values(currentClassification).flat()
    );
    return items.filter((item) => !classifiedIds.has(item.id));
  };

  const handleSelectItem = (itemId) => {
    if (disabled || isGraded) return;
    setSelectedItem(selectedItem === itemId ? null : itemId);
  };

  const handleAddToBucket = useCallback((bucketId) => {
    if (disabled || isGraded || !selectedItem) return;

    // Remove from current bucket if exists
    const newClassification = { ...currentClassification };
    Object.keys(newClassification).forEach((bId) => {
      newClassification[bId] = newClassification[bId].filter(
        (id) => id !== selectedItem
      );
    });

    // Add to new bucket
    newClassification[bucketId] = [...(newClassification[bucketId] || []), selectedItem];

    setClassification(newClassification);
    onChange?.(newClassification);
    setSelectedItem(null);
  }, [disabled, isGraded, selectedItem, currentClassification, onChange]);

  const handleRemoveFromBucket = useCallback((bucketId, itemId) => {
    if (disabled || isGraded) return;

    const newClassification = {
      ...currentClassification,
      [bucketId]: currentClassification[bucketId].filter((id) => id !== itemId),
    };

    setClassification(newClassification);
    onChange?.(newClassification);
  }, [disabled, isGraded, currentClassification, onChange]);

  // Get item by ID
  const getItem = (itemId) => items.find((item) => item.id === itemId);

  // Get grade status for an item in a bucket
  const getItemStatus = (bucketId, itemId) => {
    if (!isGraded || !grade?.expected) return null;
    const expectedBucket = grade.expected[bucketId] || [];
    return expectedBucket.includes(itemId) ? "correct" : "incorrect";
  };

  const unclassified = getUnclassifiedItems();

  return (
    <div id={id} className="v2-classification-buckets space-y-4">
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
              <button
                key={item.id}
                onClick={() => handleSelectItem(item.id)}
                disabled={disabled || isGraded}
                className={`
                  px-3 py-2 rounded-lg text-sm
                  border transition-all
                  ${
                    selectedItem === item.id
                      ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--foreground)] hover:border-[var(--primary)]/50"
                  }
                  ${disabled || isGraded ? "cursor-not-allowed opacity-75" : "cursor-pointer"}
                `}
              >
                {item.content}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Buckets */}
      <div className="grid gap-4 md:grid-cols-2">
        {buckets.map((bucket) => {
          const bucketItems = currentClassification[bucket.id] || [];

          return (
            <div
              key={bucket.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] overflow-hidden"
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

              {/* Bucket content */}
              <div className="p-3 min-h-[80px]">
                <div className="flex flex-wrap gap-2">
                  {bucketItems.map((itemId) => {
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
                        {!isGraded && (
                          <button
                            onClick={() => handleRemoveFromBucket(bucket.id, itemId)}
                            className="ml-1 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Add button */}
                  {selectedItem && !isGraded && (
                    <button
                      onClick={() => handleAddToBucket(bucket.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm
                        border border-dashed border-[var(--primary)] text-[var(--primary)]
                        hover:bg-[var(--primary)]/10 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add here
                    </button>
                  )}
                </div>

                {bucketItems.length === 0 && !selectedItem && (
                  <span className="text-sm text-[var(--muted-foreground)]">
                    No items yet
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
