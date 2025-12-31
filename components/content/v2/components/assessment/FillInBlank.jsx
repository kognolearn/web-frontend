"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import { Check, X, Lightbulb } from "lucide-react";

/**
 * FillInBlank - Template with {{blank}} inputs or simple question with answer input
 *
 * Supports two formats:
 * 1. Template format: "The answer is {{blank1}} and {{blank2}}" with blanks: [{id: "blank1"}, {id: "blank2"}]
 * 2. Simple format: "What is 2+2?" with blanks: [{answer: "4"}] (no placeholders, shows input below)
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {string|Object.<string, string|number>} [props.value] - Answer(s)
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {string} props.template - Template text (may contain {{blankId}} placeholders)
 * @param {Array<{id?: string, answer?: string, hint?: string, input_type?: string, case_sensitive?: boolean}>} props.blanks
 * @param {boolean} [props.case_sensitive] - Whether matching is case sensitive (default)
 */
export default function FillInBlank({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  template = "",
  blanks = [],
  case_sensitive = false,
}) {
  // Check if template has placeholders (needed before normalizing value)
  const hasPlaceholders = useMemo(() => /\{\{(\w+)\}\}/.test(template), [template]);

  // Normalize blanks to always have id field
  const normalizedBlanks = useMemo(() => {
    return blanks.map((blank, idx) => ({
      ...blank,
      id: blank.id || `blank_${idx}`,
      input_type: blank.input_type || 'text',
      case_sensitive: blank.case_sensitive ?? case_sensitive,
    }));
  }, [blanks, case_sensitive]);

  // Normalize value to always be an object with the correct blank ID key
  const normalizeValue = useCallback((val) => {
    if (typeof val === 'string') {
      const blankId = normalizedBlanks[0]?.id || 'blank_0';
      return { [blankId]: val };
    }
    return val || {};
  }, [normalizedBlanks]);

  const [localValue, setLocalValue] = useState(() => normalizeValue(value));
  const [focusedInput, setFocusedInput] = useState(null);
  const currentValue = value !== undefined ? normalizeValue(value) : localValue;

  const handleChange = useCallback((blankId, newValue) => {
    if (disabled || isGraded) return;

    if (!hasPlaceholders && normalizedBlanks.length === 1) {
      setLocalValue({ [blankId]: newValue });
      onChange?.(newValue);
    } else {
      const updated = {
        ...currentValue,
        [blankId]: newValue,
      };
      setLocalValue(updated);
      onChange?.(updated);
    }
  }, [disabled, isGraded, currentValue, onChange, hasPlaceholders, normalizedBlanks.length]);

  // Get grade status for a specific blank
  const getBlankGrade = (blankId) => {
    if (!isGraded || !grade) return null;

    if (grade.passed !== undefined) {
      return grade.passed ? "correct" : "incorrect";
    }

    const expected = grade.expected?.[blankId];
    const actual = currentValue[blankId];

    if (!actual) return "incorrect";

    const blankConfig = normalizedBlanks.find(b => b.id === blankId);
    const isCaseSensitive = blankConfig?.case_sensitive ?? case_sensitive;

    const isMatch = isCaseSensitive
      ? String(actual) === String(expected)
      : String(actual).toLowerCase() === String(expected).toLowerCase();

    return isMatch ? "correct" : "incorrect";
  };

  // Parse template and replace {{blankId}} with inputs
  const parsedContent = useMemo(() => {
    if (!hasPlaceholders) return null;

    const parts = [];
    const regex = /\{\{(\w+)\}\}/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(template)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: template.slice(lastIndex, match.index),
        });
      }

      const blankId = match[1];
      const blank = normalizedBlanks.find((b) => b.id === blankId) || { id: blankId, input_type: "text" };
      parts.push({
        type: "blank",
        blank,
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < template.length) {
      parts.push({
        type: "text",
        content: template.slice(lastIndex),
      });
    }

    return parts;
  }, [template, normalizedBlanks, hasPlaceholders]);

  // Get input styling based on grade status
  const getInputStyles = (blankGrade, isFocused) => {
    let borderClass = "border-[var(--border)]";
    let bgClass = "bg-[var(--surface-1)]";
    let ringClass = "";

    if (blankGrade === "correct") {
      borderClass = "border-emerald-500";
      bgClass = "bg-emerald-500/5";
    } else if (blankGrade === "incorrect") {
      borderClass = "border-rose-500";
      bgClass = "bg-rose-500/5";
    } else if (isFocused) {
      borderClass = "border-[var(--primary)]";
      ringClass = "ring-2 ring-[var(--primary)]/20";
    }

    return `${borderClass} ${bgClass} ${ringClass}`;
  };

  // Render inline input
  const renderInput = (blank, index, isInline = false) => {
    const blankGrade = getBlankGrade(blank.id);
    const isFocused = focusedInput === blank.id;
    const inputStyles = getInputStyles(blankGrade, isFocused);
    const hasValue = Boolean(currentValue[blank.id]);

    if (blank.input_type === "dropdown") {
      return (
        <div key={index} className="relative inline-block">
          <select
            value={currentValue[blank.id] || ""}
            onChange={(e) => handleChange(blank.id, e.target.value)}
            onFocus={() => setFocusedInput(blank.id)}
            onBlur={() => setFocusedInput(null)}
            disabled={disabled || isGraded}
            className={`
              px-3 py-2 rounded-lg border ${inputStyles}
              text-[var(--foreground)] text-sm
              focus:outline-none transition-all duration-200
              disabled:opacity-60 disabled:cursor-not-allowed
              appearance-none pr-8 cursor-pointer
            `}
          >
            <option value="">Select...</option>
            {(blank.options || []).map((option, optIndex) => (
              <option key={optIndex} value={option}>
                {option}
              </option>
            ))}
          </select>
          {/* Custom dropdown arrow */}
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted-foreground)]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      );
    }

    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={isInline ? "inline-flex items-center" : "relative"}
      >
        <input
          type={blank.input_type === "number" ? "number" : "text"}
          value={currentValue[blank.id] || ""}
          onChange={(e) => handleChange(blank.id, e.target.value)}
          onFocus={() => setFocusedInput(blank.id)}
          onBlur={() => setFocusedInput(null)}
          disabled={disabled || isGraded}
          placeholder={blank.hint || "Your answer..."}
          className={`
            ${isInline ? "w-28" : "w-full"} px-3 py-2 rounded-lg border ${inputStyles}
            text-[var(--foreground)] text-sm
            focus:outline-none transition-all duration-200
            disabled:opacity-60 disabled:cursor-not-allowed
            placeholder:text-[var(--muted-foreground)]/60
            ${isInline ? "text-center" : ""}
          `}
        />
        {/* Status icon inside input for non-inline */}
        {!isInline && isGraded && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {blankGrade === "correct" && (
              <Check className="w-4 h-4 text-emerald-500" />
            )}
            {blankGrade === "incorrect" && (
              <X className="w-4 h-4 text-rose-500" />
            )}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div id={id} className="v2-fill-in-blank">
      {/* Simple format: Question above, input below */}
      {!hasPlaceholders && (
        <>
          {/* Question/template as markdown */}
          {template && (
            <div className="mb-4">
              <MarkdownRenderer content={template} />
            </div>
          )}

          {/* Input fields for each blank */}
          <div className="space-y-3">
            {normalizedBlanks.map((blank, index) => (
              <div key={blank.id}>
                {renderInput(blank, index, false)}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Template format with inline placeholders */}
      {hasPlaceholders && parsedContent && (
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
          <div className="flex flex-wrap items-baseline gap-x-1 gap-y-2 leading-relaxed text-[var(--foreground)]">
            {parsedContent.map((part, index) => {
              if (part.type === "text") {
                return (
                  <span key={index}>
                    {part.content}
                  </span>
                );
              }

              const { blank } = part;
              const blankGrade = getBlankGrade(blank.id);
              const isFocused = focusedInput === blank.id;
              const inputStyles = getInputStyles(blankGrade, isFocused);

              return (
                <span key={index} className="inline-flex items-center mx-1">
                  <input
                    type={blank.input_type === "number" ? "number" : "text"}
                    value={currentValue[blank.id] || ""}
                    onChange={(e) => handleChange(blank.id, e.target.value)}
                    onFocus={() => setFocusedInput(blank.id)}
                    onBlur={() => setFocusedInput(null)}
                    disabled={disabled || isGraded}
                    placeholder={blank.hint || "..."}
                    className={`
                      w-28 px-3 py-1.5 rounded-lg border ${inputStyles}
                      text-[var(--foreground)] text-sm text-center
                      focus:outline-none transition-all duration-200
                      disabled:opacity-60 disabled:cursor-not-allowed
                      placeholder:text-[var(--muted-foreground)]/60
                    `}
                  />
                  {/* Inline status icon */}
                  {isGraded && (
                    <span className="ml-1">
                      {blankGrade === "correct" && (
                        <Check className="w-4 h-4 text-emerald-500" />
                      )}
                      {blankGrade === "incorrect" && (
                        <X className="w-4 h-4 text-rose-500" />
                      )}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Show correct answers if wrong - Improved styling */}
      {isGraded && grade?.expected && !grade.passed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">
                Correct answer
              </p>
              <div className="text-sm text-[var(--foreground)]">
                {typeof grade.expected === 'string' ? (
                  <span className="font-medium bg-amber-500/10 px-2 py-0.5 rounded">
                    {grade.expected}
                  </span>
                ) : (
                  <div className="space-y-1">
                    {Object.entries(grade.expected).map(([blankId, expected]) => (
                      <div key={blankId} className="flex items-center gap-2">
                        {Object.keys(grade.expected).length > 1 && (
                          <span className="text-[var(--muted-foreground)] text-xs">
                            {blankId}:
                          </span>
                        )}
                        <span className="font-medium bg-amber-500/10 px-2 py-0.5 rounded">
                          {String(expected)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

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
