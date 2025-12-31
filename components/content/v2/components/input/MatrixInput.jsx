"use client";

import React, { useState, useCallback } from "react";

/**
 * MatrixInput - 2D grid input for matrices
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {(string|number)[][]} [props.value] - Current matrix value
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {number} props.rows - Number of rows
 * @param {number} props.cols - Number of columns
 * @param {(string|number)[][]} [props.initial_values] - Initial values
 * @param {[number, number][]} [props.readonly_cells] - Cells that cannot be edited
 * @param {boolean} [props.allow_fractions] - Allow fraction input
 */
export default function MatrixInput({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  rows = 3,
  cols = 3,
  initial_values,
  readonly_cells = [],
  allow_fractions = true,
}) {
  // Initialize matrix with initial values or empty strings
  const initMatrix = () => {
    const matrix = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        row.push(initial_values?.[r]?.[c] ?? "");
      }
      matrix.push(row);
    }
    return matrix;
  };

  const [localValue, setLocalValue] = useState(() => value || initMatrix());

  const currentValue = value || localValue;

  const isReadonly = useCallback((row, col) => {
    return readonly_cells.some(([r, c]) => r === row && c === col);
  }, [readonly_cells]);

  const handleCellChange = useCallback((row, col, cellValue) => {
    const newMatrix = currentValue.map((r, ri) =>
      r.map((c, ci) => (ri === row && ci === col ? cellValue : c))
    );
    setLocalValue(newMatrix);
    onChange?.(newMatrix);
  }, [currentValue, onChange]);

  // Determine border color based on grade
  let borderClass = "border-[var(--border)]";
  if (isGraded && grade) {
    if (grade.status === "correct" || grade.passed) {
      borderClass = "border-emerald-500";
    } else if (grade.status === "incorrect" || grade.passed === false) {
      borderClass = "border-rose-500";
    }
  }

  return (
    <div id={id} className="v2-matrix-input">
      <div className="inline-flex items-center">
        {/* Left bracket */}
        <div className="text-4xl font-light text-[var(--foreground)] mr-1">[</div>

        {/* Matrix grid */}
        <div
          className={`grid gap-1 p-2 rounded-xl border ${borderClass} bg-[var(--surface-2)]`}
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(50px, 1fr))`,
          }}
        >
          {currentValue.map((row, ri) =>
            row.map((cell, ci) => {
              const cellReadonly = isReadonly(ri, ci);
              return (
                <input
                  key={`${ri}-${ci}`}
                  type="text"
                  value={cell}
                  onChange={(e) => handleCellChange(ri, ci, e.target.value)}
                  disabled={disabled || isGraded || cellReadonly}
                  placeholder={allow_fractions ? "0 or 1/2" : "0"}
                  className={`
                    w-full min-w-[50px] px-2 py-1.5 text-center text-sm
                    rounded-lg border border-[var(--border)]
                    bg-[var(--surface-1)] text-[var(--foreground)]
                    focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
                    disabled:opacity-50 disabled:cursor-not-allowed
                    placeholder:text-[var(--muted-foreground)]/50
                    ${cellReadonly ? "bg-[var(--surface-2)] text-[var(--muted-foreground)]" : ""}
                  `}
                />
              );
            })
          )}
        </div>

        {/* Right bracket */}
        <div className="text-4xl font-light text-[var(--foreground)] ml-1">]</div>
      </div>

      {/* Help text */}
      {allow_fractions && !isGraded && (
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
          Enter numbers or fractions (e.g., 1/2, -3/4)
        </p>
      )}

      {/* Grade feedback */}
      {isGraded && grade?.feedback && (
        <p className={`mt-2 text-sm ${
          grade.status === "correct" || grade.passed
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400"
        }`}>
          {grade.feedback}
        </p>
      )}
    </div>
  );
}
