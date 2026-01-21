"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import { Check, X } from "lucide-react";

/**
 * SelectGroup - Single choice MCQ (radio buttons)
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {string} [props.value] - Selected option ID/value
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {string} [props.question] - Question text (supports markdown/LaTeX)
 * @param {string} [props.prompt] - Alternative question text prop (alias for question)
 * @param {Array<{id: string, text: string}|string>} props.options - Available options (can be strings or objects)
 * @param {false} [props.multi_select] - Must be false for single select
 */
export default function SelectGroup({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  question,
  prompt,
  options = [],
  multi_select = false,
}) {
  // Support both 'question' and 'prompt' prop names
  const questionText = question || prompt;
  const [localValue, setLocalValue] = useState(value || null);
  const [hoveredOption, setHoveredOption] = useState(null);

  const currentValue = value !== undefined ? value : localValue;

  // Normalize options to always have { id, label } format
  const normalizedOptions = useMemo(() => {
    return options.map((opt, idx) => {
      if (typeof opt === 'string') {
        return { id: opt, label: opt };
      }
      if (opt.text) {
        return { id: opt.id || opt.text, label: opt.text };
      }
      return { id: opt.id || String(idx), label: opt.label || opt.id || String(idx) };
    });
  }, [options]);

  const handleSelect = useCallback((optionId) => {
    if (disabled || isGraded) return;
    setLocalValue(optionId);
    onChange?.(optionId);
  }, [disabled, isGraded, onChange]);

  // Determine if an option is correct/incorrect based on grade
  const getOptionStatus = (optionId) => {
    if (!isGraded || !grade) return null;

    const isSelected = optionId === currentValue;
    const isCorrectAnswer = grade.expected === optionId;

    if (isSelected && grade.passed) return "correct";
    if (isSelected && !grade.passed) return "selected-incorrect";
    if (isCorrectAnswer && !grade.passed) return "correct-answer";
    return null;
  };

  return (
    <div id={id} className="v2-select-group">
      {/* Question */}
      {questionText && (
        <div className="mb-4">
          <MarkdownRenderer content={questionText} />
        </div>
      )}

      {/* Options - Compact grid for short options, stack for long */}
      <div className="space-y-2">
        {normalizedOptions.map((option, index) => {
          const isSelected = option.id === currentValue;
          const status = getOptionStatus(option.id);
          const isHovered = hoveredOption === option.id;

          // Determine styles based on status
          let containerClass = "";
          let radioClass = "";
          let textClass = "text-[var(--foreground)]";

          if (status === "correct") {
            containerClass = "border-emerald-500 bg-emerald-500/10";
            radioClass = "border-emerald-500 bg-emerald-500";
            textClass = "text-emerald-700 dark:text-emerald-300";
          } else if (status === "selected-incorrect") {
            containerClass = "border-rose-500 bg-rose-500/10";
            radioClass = "border-rose-500 bg-rose-500";
            textClass = "text-rose-700 dark:text-rose-300";
          } else if (status === "correct-answer") {
            containerClass = "border-emerald-500/50 bg-emerald-500/5";
            radioClass = "border-emerald-500";
            textClass = "text-emerald-700 dark:text-emerald-300";
          } else if (isSelected) {
            containerClass = "border-[var(--primary)] bg-[var(--primary)]/5";
            radioClass = "border-[var(--primary)] bg-[var(--primary)]";
          } else {
            containerClass = "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--primary)]/40 hover:bg-[var(--surface-2)]";
            radioClass = "border-[var(--border)] group-hover:border-[var(--primary)]/40";
          }

          return (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
              onClick={() => handleSelect(option.id)}
              onMouseEnter={() => setHoveredOption(option.id)}
              onMouseLeave={() => setHoveredOption(null)}
              disabled={disabled || isGraded}
              className={`
                group w-full flex items-center gap-3 px-4 py-3 rounded-xl border
                text-left transition-all duration-200
                ${containerClass}
                ${disabled || isGraded ? "cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              {/* Radio indicator */}
              <div
                className={`
                  relative flex-shrink-0 w-[18px] h-[18px] rounded-full border-2
                  flex items-center justify-center transition-all duration-200
                  ${radioClass}
                `}
              >
                {/* Inner dot for selected state */}
                {isSelected && !status && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 rounded-full bg-white"
                  />
                )}
                {/* Check mark for correct */}
                {status === "correct" && (
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                )}
                {/* X mark for incorrect */}
                {status === "selected-incorrect" && (
                  <X className="w-3 h-3 text-white" strokeWidth={3} />
                )}
                {/* Check mark for showing correct answer */}
                {status === "correct-answer" && (
                  <Check className="w-3 h-3 text-emerald-500" strokeWidth={3} />
                )}
              </div>

              {/* Label */}
              <div className={`flex-1 text-sm ${textClass}`}>
                <MarkdownRenderer content={option.label} />
              </div>

              {/* Status indicator on the right */}
              {status && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex-shrink-0"
                >
                  {status === "correct" && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                  {status === "selected-incorrect" && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                      <X className="w-4 h-4" />
                    </div>
                  )}
                  {status === "correct-answer" && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Correct
                    </span>
                  )}
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Grade feedback */}
      {isGraded && grade?.feedback && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 text-sm px-4 py-3 rounded-xl ${
            grade.passed
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          {grade.feedback}
        </motion.div>
      )}
    </div>
  );
}
