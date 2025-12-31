"use client";

import React, { useState, useCallback } from "react";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import { Check, X, HelpCircle } from "lucide-react";

/**
 * TrueFalseStatement - True/False/Unsure for each statement
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {Object.<string, boolean|'unsure'>} [props.value] - Answers { statementId: true/false/'unsure' }
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {Array<{id: string, text: string}>} props.statements - Statements to evaluate
 * @param {boolean} [props.include_unsure] - Include "Not enough info" option
 */
export default function TrueFalseStatement({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  statements = [],
  include_unsure = false,
}) {
  const [localValue, setLocalValue] = useState(value || {});

  const currentValue = value !== undefined ? value : localValue;

  const handleSelect = useCallback((statementId, answer) => {
    if (disabled || isGraded) return;

    const newValue = {
      ...currentValue,
      [statementId]: answer,
    };
    setLocalValue(newValue);
    onChange?.(newValue);
  }, [disabled, isGraded, currentValue, onChange]);

  const getStatementGrade = (statementId) => {
    if (!isGraded || !grade?.expected) return null;
    const expected = grade.expected[statementId];
    const actual = currentValue[statementId];
    return actual === expected ? "correct" : "incorrect";
  };

  return (
    <div id={id} className="v2-true-false-statement space-y-4">
      {statements.map((statement) => {
        const answer = currentValue[statement.id];
        const statementGrade = getStatementGrade(statement.id);

        return (
          <div
            key={statement.id}
            className={`
              p-4 rounded-xl border
              ${
                statementGrade === "correct"
                  ? "border-emerald-500 bg-emerald-500/5"
                  : statementGrade === "incorrect"
                  ? "border-rose-500 bg-rose-500/5"
                  : "border-[var(--border)] bg-[var(--surface-2)]"
              }
            `}
          >
            {/* Statement text */}
            <div className="mb-3 text-sm text-[var(--foreground)]">
              <MarkdownRenderer content={statement.text} />
            </div>

            {/* Answer buttons */}
            <div className="flex gap-2">
              {/* True button */}
              <button
                onClick={() => handleSelect(statement.id, true)}
                disabled={disabled || isGraded}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                  transition-all
                  ${
                    answer === true
                      ? statementGrade === "correct"
                        ? "bg-emerald-500 text-white"
                        : statementGrade === "incorrect"
                        ? "bg-rose-500 text-white"
                        : "bg-[var(--primary)] text-white"
                      : "border border-[var(--border)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)]"
                  }
                  ${disabled || isGraded ? "cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                <Check className="w-4 h-4" />
                True
              </button>

              {/* False button */}
              <button
                onClick={() => handleSelect(statement.id, false)}
                disabled={disabled || isGraded}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                  transition-all
                  ${
                    answer === false
                      ? statementGrade === "correct"
                        ? "bg-emerald-500 text-white"
                        : statementGrade === "incorrect"
                        ? "bg-rose-500 text-white"
                        : "bg-[var(--primary)] text-white"
                      : "border border-[var(--border)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)]"
                  }
                  ${disabled || isGraded ? "cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                <X className="w-4 h-4" />
                False
              </button>

              {/* Unsure button */}
              {include_unsure && (
                <button
                  onClick={() => handleSelect(statement.id, "unsure")}
                  disabled={disabled || isGraded}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    transition-all
                    ${
                      answer === "unsure"
                        ? statementGrade === "correct"
                          ? "bg-emerald-500 text-white"
                          : statementGrade === "incorrect"
                          ? "bg-rose-500 text-white"
                          : "bg-[var(--primary)] text-white"
                        : "border border-[var(--border)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)]"
                    }
                    ${disabled || isGraded ? "cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  <HelpCircle className="w-4 h-4" />
                  Not Sure
                </button>
              )}
            </div>

            {/* Show correct answer if wrong */}
            {statementGrade === "incorrect" && grade?.expected && (
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                Correct answer:{" "}
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {grade.expected[statement.id] === true
                    ? "True"
                    : grade.expected[statement.id] === false
                    ? "False"
                    : "Not Sure"}
                </span>
              </p>
            )}
          </div>
        );
      })}

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
