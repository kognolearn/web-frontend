"use client";

import React, { useState, useCallback } from "react";
import { MathJax } from "better-react-mathjax";
import { Plus, Trash2, ArrowDown } from "lucide-react";

/**
 * StepwiseDerivation - Step-by-step math derivation
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {string[]} [props.value] - Array of derivation steps (LaTeX)
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {string[]} props.given - Starting premises/equations
 * @param {string} props.goal - What to derive
 * @param {number} props.max_steps - Maximum number of steps
 */
export default function StepwiseDerivation({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  given = [],
  goal = "",
  max_steps = 10,
}) {
  const [steps, setSteps] = useState(value || [""]);

  const currentSteps = value !== undefined ? value : steps;

  const handleStepChange = useCallback((index, newValue) => {
    if (disabled || isGraded) return;

    const newSteps = [...currentSteps];
    newSteps[index] = newValue;
    setSteps(newSteps);
    onChange?.(newSteps);
  }, [disabled, isGraded, currentSteps, onChange]);

  const addStep = () => {
    if (disabled || isGraded || currentSteps.length >= max_steps) return;
    const newSteps = [...currentSteps, ""];
    setSteps(newSteps);
    onChange?.(newSteps);
  };

  const removeStep = (index) => {
    if (disabled || isGraded || currentSteps.length <= 1) return;
    const newSteps = currentSteps.filter((_, i) => i !== index);
    setSteps(newSteps);
    onChange?.(newSteps);
  };

  // Get step status for grading
  const getStepStatus = (index) => {
    if (!isGraded || !grade?.stepResults) return null;
    const result = grade.stepResults[index];
    if (!result) return null;
    return result.valid ? "correct" : "incorrect";
  };

  return (
    <div id={id} className="v2-stepwise-derivation space-y-4">
      {/* Given premises */}
      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
        <h4 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
          Given
        </h4>
        <div className="space-y-2">
          {given.map((premise, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sm text-[var(--muted-foreground)]">
                ({index + 1})
              </span>
              <div className="text-[var(--foreground)]">
                <MathJax inline>{`\\(${premise}\\)`}</MathJax>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Derivation steps */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
          Your Derivation
        </h4>

        {currentSteps.map((step, index) => {
          const status = getStepStatus(index);

          return (
            <div key={index} className="flex items-start gap-2">
              {/* Step number */}
              <span className="text-sm text-[var(--muted-foreground)] mt-3 w-6">
                {given.length + index + 1}.
              </span>

              {/* Step input */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => handleStepChange(index, e.target.value)}
                    disabled={disabled || isGraded}
                    placeholder="Enter step (LaTeX)"
                    className={`
                      flex-1 px-4 py-2 rounded-xl border font-mono text-sm
                      ${
                        status === "correct"
                          ? "border-emerald-500 bg-emerald-500/10"
                          : status === "incorrect"
                          ? "border-rose-500 bg-rose-500/10"
                          : "border-[var(--border)] bg-[var(--surface-2)]"
                      }
                      text-[var(--foreground)]
                      focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  />
                  {!isGraded && currentSteps.length > 1 && (
                    <button
                      onClick={() => removeStep(index)}
                      className="p-2 rounded-lg hover:bg-rose-500/10 text-[var(--muted-foreground)] hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Live preview */}
                {step && (
                  <div className="mt-1 p-2 rounded-lg bg-[var(--surface-1)] text-sm">
                    <MathJax inline>{`\\(${step}\\)`}</MathJax>
                  </div>
                )}

                {/* Step feedback */}
                {isGraded && grade?.stepResults?.[index]?.feedback && (
                  <p className={`mt-1 text-xs ${
                    status === "correct"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}>
                    {grade.stepResults[index].feedback}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Add step button */}
        {!isGraded && currentSteps.length < max_steps && (
          <button
            onClick={addStep}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2 rounded-xl
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

      {/* Goal */}
      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
        <h4 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
          Goal: Derive
        </h4>
        <div className="text-[var(--foreground)]">
          <MathJax inline>{`\\(${goal}\\)`}</MathJax>
        </div>
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
