"use client";

import React, { useState, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";

/**
 * ArgumentBuilder - Claim + evidence + reasoning
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {{claim: string, evidence: string[], reasoning?: string}} [props.value] - Argument value
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {string} props.claim_prompt - Prompt for claim
 * @param {number} props.evidence_slots - Number of evidence pieces required
 * @param {boolean} [props.reasoning_required] - Whether reasoning is required
 */
export default function ArgumentBuilder({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  claim_prompt = "State your claim",
  evidence_slots = 2,
  reasoning_required = true,
}) {
  const initValue = () => ({
    claim: "",
    evidence: Array(evidence_slots).fill(""),
    reasoning: "",
  });

  const [localValue, setLocalValue] = useState(value || initValue());

  const currentValue = value !== undefined ? value : localValue;

  const handleClaimChange = useCallback((newClaim) => {
    const updated = { ...currentValue, claim: newClaim };
    setLocalValue(updated);
    onChange?.(updated);
  }, [currentValue, onChange]);

  const handleEvidenceChange = useCallback((index, newEvidence) => {
    const newEvidenceArr = [...currentValue.evidence];
    newEvidenceArr[index] = newEvidence;
    const updated = { ...currentValue, evidence: newEvidenceArr };
    setLocalValue(updated);
    onChange?.(updated);
  }, [currentValue, onChange]);

  const addEvidence = () => {
    if (disabled || isGraded) return;
    const updated = {
      ...currentValue,
      evidence: [...currentValue.evidence, ""],
    };
    setLocalValue(updated);
    onChange?.(updated);
  };

  const removeEvidence = (index) => {
    if (disabled || isGraded) return;
    if (currentValue.evidence.length <= 1) return;
    const newEvidence = currentValue.evidence.filter((_, i) => i !== index);
    const updated = { ...currentValue, evidence: newEvidence };
    setLocalValue(updated);
    onChange?.(updated);
  };

  const handleReasoningChange = useCallback((newReasoning) => {
    const updated = { ...currentValue, reasoning: newReasoning };
    setLocalValue(updated);
    onChange?.(updated);
  }, [currentValue, onChange]);

  // Get section status for grading
  const getClaimStatus = () => {
    if (!isGraded || !grade?.claimScore) return null;
    return grade.claimScore.passed ? "correct" : "incorrect";
  };

  const getEvidenceStatus = (index) => {
    if (!isGraded || !grade?.evidenceScores) return null;
    const score = grade.evidenceScores[index];
    if (!score) return null;
    return score.passed ? "correct" : "incorrect";
  };

  const getReasoningStatus = () => {
    if (!isGraded || !grade?.reasoningScore) return null;
    return grade.reasoningScore.passed ? "correct" : "incorrect";
  };

  return (
    <div id={id} className="v2-argument-builder space-y-4">
      {/* Claim */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Claim
        </label>
        <p className="text-xs text-[var(--muted-foreground)] mb-2">
          {claim_prompt}
        </p>
        <textarea
          value={currentValue.claim}
          onChange={(e) => handleClaimChange(e.target.value)}
          disabled={disabled || isGraded}
          placeholder="State your claim..."
          rows={3}
          className={`
            w-full px-4 py-3 rounded-xl border
            ${
              getClaimStatus() === "correct"
                ? "border-emerald-500 bg-emerald-500/5"
                : getClaimStatus() === "incorrect"
                ? "border-rose-500 bg-rose-500/5"
                : "border-[var(--border)] bg-[var(--surface-2)]"
            }
            text-[var(--foreground)]
            focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
            disabled:opacity-50 disabled:cursor-not-allowed
            resize-none
          `}
        />
        {isGraded && grade?.claimScore?.feedback && (
          <p className={`mt-1 text-xs ${
            getClaimStatus() === "correct"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}>
            {grade.claimScore.feedback}
          </p>
        )}
      </div>

      {/* Evidence */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Evidence ({currentValue.evidence.length}/{evidence_slots} minimum)
        </label>
        <div className="space-y-2">
          {currentValue.evidence.map((evidence, index) => {
            const status = getEvidenceStatus(index);

            return (
              <div key={index} className="flex gap-2">
                <div className="flex-shrink-0 w-6 h-10 flex items-center justify-center text-sm text-[var(--muted-foreground)]">
                  {index + 1}.
                </div>
                <textarea
                  value={evidence}
                  onChange={(e) => handleEvidenceChange(index, e.target.value)}
                  disabled={disabled || isGraded}
                  placeholder={`Evidence ${index + 1}...`}
                  rows={2}
                  className={`
                    flex-1 px-4 py-2 rounded-xl border
                    ${
                      status === "correct"
                        ? "border-emerald-500 bg-emerald-500/5"
                        : status === "incorrect"
                        ? "border-rose-500 bg-rose-500/5"
                        : "border-[var(--border)] bg-[var(--surface-2)]"
                    }
                    text-[var(--foreground)] text-sm
                    focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
                    disabled:opacity-50 disabled:cursor-not-allowed
                    resize-none
                  `}
                />
                {!isGraded && currentValue.evidence.length > 1 && (
                  <button
                    onClick={() => removeEvidence(index)}
                    className="flex-shrink-0 p-2 rounded-lg hover:bg-rose-500/10 text-[var(--muted-foreground)] hover:text-rose-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {!isGraded && (
          <button
            onClick={addEvidence}
            disabled={disabled}
            className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl
              border border-dashed border-[var(--border)]
              text-sm text-[var(--muted-foreground)]
              hover:border-[var(--primary)] hover:text-[var(--primary)]
              disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add more evidence
          </button>
        )}
      </div>

      {/* Reasoning */}
      {reasoning_required && (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Reasoning
          </label>
          <p className="text-xs text-[var(--muted-foreground)] mb-2">
            Explain how your evidence supports your claim
          </p>
          <textarea
            value={currentValue.reasoning}
            onChange={(e) => handleReasoningChange(e.target.value)}
            disabled={disabled || isGraded}
            placeholder="Explain your reasoning..."
            rows={4}
            className={`
              w-full px-4 py-3 rounded-xl border
              ${
                getReasoningStatus() === "correct"
                  ? "border-emerald-500 bg-emerald-500/5"
                  : getReasoningStatus() === "incorrect"
                  ? "border-rose-500 bg-rose-500/5"
                  : "border-[var(--border)] bg-[var(--surface-2)]"
              }
              text-[var(--foreground)]
              focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
              disabled:opacity-50 disabled:cursor-not-allowed
              resize-y
            `}
          />
          {isGraded && grade?.reasoningScore?.feedback && (
            <p className={`mt-1 text-xs ${
              getReasoningStatus() === "correct"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}>
              {grade.reasoningScore.feedback}
            </p>
          )}
        </div>
      )}

      {/* Overall grade feedback */}
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
