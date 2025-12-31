"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import { Eye, EyeOff } from "lucide-react";

/**
 * RevealBlock - Hidden content revealed on demand
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {string} props.trigger_label - Button label (e.g., "Show Hint", "View Solution")
 * @param {string} props.content - Hidden markdown content
 * @param {'click' | 'hover' | 'after_attempt'} props.reveal_type - How to reveal
 * @param {string} [props.penalty_warning] - Optional warning text
 * @param {boolean} [props.canReveal=true] - For after_attempt, whether user has attempted
 */
export default function RevealBlock({
  id,
  trigger_label = "Show",
  content,
  reveal_type = "click",
  penalty_warning,
  canReveal = true,
}) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const handleReveal = useCallback(() => {
    if (!canReveal && reveal_type === "after_attempt") {
      return; // Can't reveal until user has attempted
    }

    if (penalty_warning && !isRevealed && !showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsRevealed(true);
    setShowConfirm(false);
  }, [canReveal, reveal_type, penalty_warning, isRevealed, showConfirm]);

  const handleConfirmReveal = () => {
    setIsRevealed(true);
    setShowConfirm(false);
  };

  const handleCancelReveal = () => {
    setShowConfirm(false);
  };

  const handleHide = () => {
    setIsRevealed(false);
  };

  // For hover reveal type
  const handleMouseEnter = () => {
    if (reveal_type === "hover" && canReveal) {
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    if (reveal_type === "hover") {
      setIsHovering(false);
    }
  };

  const showContent = isRevealed || (reveal_type === "hover" && isHovering);
  const isDisabled = !canReveal && reveal_type === "after_attempt";

  return (
    <div
      id={id}
      className="v2-reveal-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10"
          >
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">
              {penalty_warning}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmReveal}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
              >
                Reveal Anyway
              </button>
              <button
                onClick={handleCancelReveal}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--surface-1)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger Button */}
      {!showContent && !showConfirm && (
        <button
          onClick={handleReveal}
          disabled={isDisabled}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
            border border-[var(--border)] bg-[var(--surface-2)]
            transition-all duration-200
            ${
              isDisabled
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-[var(--surface-1)] hover:border-[var(--primary)]/40 cursor-pointer"
            }
          `}
        >
          <Eye className="w-4 h-4" />
          {trigger_label}
          {isDisabled && (
            <span className="text-xs text-[var(--muted-foreground)]">
              (attempt first)
            </span>
          )}
        </button>
      )}

      {/* Revealed Content */}
      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50">
              {reveal_type !== "hover" && (
                <div className="flex justify-end mb-2">
                  <button
                    onClick={handleHide}
                    className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    <EyeOff className="w-3 h-3" />
                    Hide
                  </button>
                </div>
              )}
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <MarkdownRenderer content={content} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
