"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";

/**
 * MatchingPairs - Drag-and-drop or click-to-match
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
  const [selectedLeft, setSelectedLeft] = useState(null);

  // Shuffle items if needed (seeded for consistency)
  const shuffledRight = useMemo(() => {
    if (!shuffle) return right_items;
    const items = [...right_items];
    // Simple shuffle
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }, [right_items, shuffle]);

  const getMatchForLeft = (leftId) => {
    const pair = pairs.find(([l]) => l === leftId);
    return pair ? pair[1] : null;
  };

  const getMatchForRight = (rightId) => {
    const matchingPairs = pairs.filter(([, r]) => r === rightId);
    return matchingPairs.map(([l]) => l);
  };

  const handleLeftClick = useCallback((leftId) => {
    if (disabled || isGraded) return;

    // If already matched, unselect
    const existingMatch = getMatchForLeft(leftId);
    if (existingMatch) {
      const newPairs = pairs.filter(([l]) => l !== leftId);
      setPairs(newPairs);
      onChange?.(newPairs);
      return;
    }

    setSelectedLeft(leftId);
  }, [disabled, isGraded, pairs, onChange]);

  const handleRightClick = useCallback((rightId) => {
    if (disabled || isGraded || !selectedLeft) return;

    // Check if this right item is already matched (and not allow_many_to_one)
    if (!allow_many_to_one && getMatchForRight(rightId).length > 0) {
      return;
    }

    const newPairs = [...pairs.filter(([l]) => l !== selectedLeft), [selectedLeft, rightId]];
    setPairs(newPairs);
    onChange?.(newPairs);
    setSelectedLeft(null);
  }, [disabled, isGraded, selectedLeft, pairs, allow_many_to_one, onChange]);

  // Get grade status for a pair
  const getPairGrade = (leftId) => {
    if (!isGraded || !grade?.expected) return null;
    const userMatch = getMatchForLeft(leftId);
    const expectedMatch = grade.expected.find(([l]) => l === leftId)?.[1];

    if (!userMatch && !expectedMatch) return null;
    if (userMatch === expectedMatch) return "correct";
    return "incorrect";
  };

  return (
    <div id={id} className="v2-matching-pairs">
      <div className="grid grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
            Match from here
          </h4>
          {left_items.map((item) => {
            const match = getMatchForLeft(item.id);
            const pairGrade = getPairGrade(item.id);
            const isSelected = selectedLeft === item.id;

            let itemClass = "border-[var(--border)] bg-[var(--surface-2)]";
            if (pairGrade === "correct") {
              itemClass = "border-emerald-500 bg-emerald-500/10";
            } else if (pairGrade === "incorrect") {
              itemClass = "border-rose-500 bg-rose-500/10";
            } else if (isSelected) {
              itemClass = "border-[var(--primary)] bg-[var(--primary)]/10";
            } else if (match) {
              itemClass = "border-blue-500 bg-blue-500/10";
            }

            return (
              <button
                key={item.id}
                onClick={() => handleLeftClick(item.id)}
                disabled={disabled || isGraded}
                className={`
                  w-full p-3 rounded-xl border ${itemClass}
                  text-left text-sm text-[var(--foreground)]
                  transition-all
                  ${disabled || isGraded ? "cursor-not-allowed" : "cursor-pointer hover:border-[var(--primary)]/50"}
                `}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>{item.content}</span>
                  {match && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400">
                      Matched
                    </span>
                  )}
                  {pairGrade === "correct" && <Check className="w-4 h-4 text-emerald-500" />}
                  {pairGrade === "incorrect" && <X className="w-4 h-4 text-rose-500" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right column */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
            Match to here
          </h4>
          {shuffledRight.map((item) => {
            const matches = getMatchForRight(item.id);
            const isAvailable = allow_many_to_one || matches.length === 0;

            return (
              <button
                key={item.id}
                onClick={() => handleRightClick(item.id)}
                disabled={disabled || isGraded || !selectedLeft || !isAvailable}
                className={`
                  w-full p-3 rounded-xl border
                  ${
                    matches.length > 0
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-[var(--border)] bg-[var(--surface-2)]"
                  }
                  text-left text-sm text-[var(--foreground)]
                  transition-all
                  ${
                    disabled || isGraded || !selectedLeft || !isAvailable
                      ? "cursor-not-allowed opacity-75"
                      : "cursor-pointer hover:border-[var(--primary)]/50"
                  }
                `}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>{item.content}</span>
                  {matches.length > 0 && (
                    <span className="text-xs text-[var(--muted-foreground)]">
                      ({matches.length} match{matches.length !== 1 ? "es" : ""})
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      {!isGraded && !disabled && (
        <p className="mt-3 text-xs text-[var(--muted-foreground)]">
          {selectedLeft
            ? "Now click an item on the right to complete the match"
            : "Click an item on the left to select it, then click its match on the right"}
        </p>
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
