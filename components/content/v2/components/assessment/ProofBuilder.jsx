"use client";

import React, { useState, useCallback } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";

/**
 * ProofBuilder - Two-column or paragraph proof builder
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {*} [props.value] - Proof value (format depends on proof_format)
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {string[]} props.given - Starting premises
 * @param {string} props.goal - What to prove
 * @param {Array<{id: string, name: string, description: string}>} [props.available_rules] - Rules to choose from
 * @param {number} props.max_steps - Maximum number of steps
 * @param {'two_column' | 'paragraph' | 'tree'} props.proof_format - Proof format
 */
export default function ProofBuilder({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  given = [],
  goal = "",
  available_rules = [],
  max_steps = 15,
  proof_format = "two_column",
}) {
  // Initialize based on format
  const initValue = () => {
    if (proof_format === "paragraph") {
      return "";
    }
    return [{ statement: "", rule: "" }];
  };

  const [localValue, setLocalValue] = useState(value || initValue());

  const currentValue = value !== undefined ? value : localValue;

  // Two-column format handlers
  const handleStepChange = useCallback((index, field, newValue) => {
    if (disabled || isGraded || proof_format === "paragraph") return;

    const newSteps = [...currentValue];
    newSteps[index] = { ...newSteps[index], [field]: newValue };
    setLocalValue(newSteps);
    onChange?.(newSteps);
  }, [disabled, isGraded, proof_format, currentValue, onChange]);

  const addStep = () => {
    if (disabled || isGraded || proof_format === "paragraph") return;
    if (currentValue.length >= max_steps) return;

    const newSteps = [...currentValue, { statement: "", rule: "" }];
    setLocalValue(newSteps);
    onChange?.(newSteps);
  };

  const removeStep = (index) => {
    if (disabled || isGraded || proof_format === "paragraph") return;
    if (currentValue.length <= 1) return;

    const newSteps = currentValue.filter((_, i) => i !== index);
    setLocalValue(newSteps);
    onChange?.(newSteps);
  };

  // Paragraph format handler
  const handleParagraphChange = useCallback((text) => {
    if (disabled || isGraded) return;
    setLocalValue(text);
    onChange?.(text);
  }, [disabled, isGraded, onChange]);

  // Get step status for grading
  const getStepStatus = (index) => {
    if (!isGraded || !grade?.stepResults) return null;
    return grade.stepResults[index]?.valid ? "correct" : "incorrect";
  };

  return (
    <div id={id} className="v2-proof-builder space-y-4">
      {/* Given premises */}
      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
        <h4 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
          Given
        </h4>
        <ul className="space-y-1 text-sm text-[var(--foreground)]">
          {given.map((premise, index) => (
            <li key={index}>• {premise}</li>
          ))}
        </ul>
      </div>

      {/* Goal */}
      <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
        <h4 className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
          Prove
        </h4>
        <p className="text-sm text-[var(--foreground)]">{goal}</p>
      </div>

      {/* Proof area */}
      {proof_format === "paragraph" ? (
        // Paragraph proof
        <div>
          <h4 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
            Proof
          </h4>
          <textarea
            value={currentValue}
            onChange={(e) => handleParagraphChange(e.target.value)}
            disabled={disabled || isGraded}
            placeholder="Write your proof here..."
            rows={8}
            className={`
              w-full px-4 py-3 rounded-xl border
              ${
                isGraded
                  ? grade?.passed
                    ? "border-emerald-500 bg-emerald-500/5"
                    : "border-rose-500 bg-rose-500/5"
                  : "border-[var(--border)] bg-[var(--surface-2)]"
              }
              text-[var(--foreground)] text-sm
              focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
              disabled:opacity-50 disabled:cursor-not-allowed
              resize-y
            `}
          />
        </div>
      ) : (
        // Two-column proof
        <div>
          <h4 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
            Proof Steps
          </h4>

          <div className="rounded-xl border border-[var(--border)] overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-2 bg-[var(--surface-2)] border-b border-[var(--border)]">
              <div className="px-4 py-2 text-xs font-medium text-[var(--muted-foreground)] uppercase">
                Statement
              </div>
              <div className="px-4 py-2 text-xs font-medium text-[var(--muted-foreground)] uppercase border-l border-[var(--border)]">
                Reason
              </div>
            </div>

            {/* Steps */}
            {currentValue.map((step, index) => {
              const status = getStepStatus(index);

              return (
                <div
                  key={index}
                  className={`
                    grid grid-cols-2 border-b border-[var(--border)] last:border-b-0
                    ${
                      status === "correct"
                        ? "bg-emerald-500/5"
                        : status === "incorrect"
                        ? "bg-rose-500/5"
                        : ""
                    }
                  `}
                >
                  {/* Statement */}
                  <div className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {given.length + index + 1}.
                      </span>
                      <input
                        type="text"
                        value={step.statement}
                        onChange={(e) =>
                          handleStepChange(index, "statement", e.target.value)
                        }
                        disabled={disabled || isGraded}
                        placeholder="Statement"
                        className="flex-1 px-2 py-1 text-sm rounded-lg border border-[var(--border)]
                          bg-[var(--surface-1)] text-[var(--foreground)]
                          focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
                          disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="px-2 py-2 border-l border-[var(--border)] flex items-center gap-2">
                    {available_rules.length > 0 ? (
                      <select
                        value={step.rule}
                        onChange={(e) =>
                          handleStepChange(index, "rule", e.target.value)
                        }
                        disabled={disabled || isGraded}
                        className="flex-1 px-2 py-1 text-sm rounded-lg border border-[var(--border)]
                          bg-[var(--surface-1)] text-[var(--foreground)]
                          focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
                          disabled:opacity-50"
                      >
                        <option value="">Select reason...</option>
                        {available_rules.map((rule) => (
                          <option key={rule.id} value={rule.id}>
                            {rule.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={step.rule}
                        onChange={(e) =>
                          handleStepChange(index, "rule", e.target.value)
                        }
                        disabled={disabled || isGraded}
                        placeholder="Reason"
                        className="flex-1 px-2 py-1 text-sm rounded-lg border border-[var(--border)]
                          bg-[var(--surface-1)] text-[var(--foreground)]
                          focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
                          disabled:opacity-50"
                      />
                    )}

                    {!isGraded && currentValue.length > 1 && (
                      <button
                        onClick={() => removeStep(index)}
                        className="p-1 rounded hover:bg-rose-500/10 text-[var(--muted-foreground)] hover:text-rose-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add step button */}
          {!isGraded && currentValue.length < max_steps && (
            <button
              onClick={addStep}
              disabled={disabled}
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl
                border border-dashed border-[var(--border)]
                text-sm text-[var(--muted-foreground)]
                hover:border-[var(--primary)] hover:text-[var(--primary)]
                disabled:opacity-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add step
            </button>
          )}
        </div>
      )}

      {/* Available rules reference */}
      {available_rules.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-[var(--primary)] hover:underline flex items-center gap-1">
            <ChevronDown className="w-4 h-4" />
            Available Rules Reference
          </summary>
          <div className="mt-2 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
            <ul className="space-y-2">
              {available_rules.map((rule) => (
                <li key={rule.id}>
                  <span className="font-medium text-[var(--foreground)]">
                    {rule.name}
                  </span>
                  {rule.description && (
                    <span className="text-[var(--muted-foreground)]">
                      {" "}
                      — {rule.description}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </details>
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
