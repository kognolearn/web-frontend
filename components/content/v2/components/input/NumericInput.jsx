"use client";

import React, { useState, useCallback } from "react";

/**
 * NumericInput - Number input with unit, validation, and formatting
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {number} [props.value] - Current value
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {string} props.placeholder - Placeholder text
 * @param {string} [props.unit] - Unit label (e.g., "kg", "m/s")
 * @param {number} [props.decimal_places] - Max decimal places
 * @param {number} [props.min] - Minimum value
 * @param {number} [props.max] - Maximum value
 * @param {boolean} [props.scientific_notation] - Allow scientific notation
 */
export default function NumericInput({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  placeholder = "Enter a number",
  unit,
  decimal_places,
  min,
  max,
  scientific_notation = false,
}) {
  const [inputValue, setInputValue] = useState(value !== undefined ? String(value) : "");
  const [error, setError] = useState(null);

  const validateAndUpdate = useCallback((strValue) => {
    setInputValue(strValue);
    setError(null);

    if (strValue === "") {
      onChange?.(undefined);
      return;
    }

    // Parse the number
    let numValue;
    if (scientific_notation) {
      numValue = parseFloat(strValue);
    } else {
      // Reject scientific notation if not allowed
      if (/[eE]/.test(strValue)) {
        setError("Scientific notation not allowed");
        return;
      }
      numValue = parseFloat(strValue);
    }

    if (isNaN(numValue)) {
      setError("Invalid number");
      return;
    }

    // Check min/max
    if (min !== undefined && numValue < min) {
      setError(`Minimum value is ${min}`);
      return;
    }
    if (max !== undefined && numValue > max) {
      setError(`Maximum value is ${max}`);
      return;
    }

    // Check decimal places
    if (decimal_places !== undefined) {
      const parts = strValue.split(".");
      if (parts[1] && parts[1].length > decimal_places) {
        setError(`Maximum ${decimal_places} decimal places`);
        return;
      }
    }

    onChange?.(numValue);
  }, [onChange, min, max, decimal_places, scientific_notation]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    // Allow empty, numbers, decimal point, minus sign, and optionally e/E for scientific
    const pattern = scientific_notation
      ? /^-?\d*\.?\d*([eE][+-]?\d*)?$/
      : /^-?\d*\.?\d*$/;

    if (pattern.test(newValue) || newValue === "") {
      validateAndUpdate(newValue);
    }
  };

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
    <div id={id} className="v2-numeric-input">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            inputMode="decimal"
            value={inputValue}
            onChange={handleChange}
            disabled={disabled || isGraded}
            placeholder={placeholder}
            className={`
              w-full px-4 py-3 rounded-xl border ${borderClass}
              bg-[var(--surface-2)] text-[var(--foreground)]
              focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
              disabled:opacity-50 disabled:cursor-not-allowed
              placeholder:text-[var(--muted-foreground)]
              transition-colors
              ${unit ? "pr-16" : ""}
            `}
          />
          {unit && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--muted-foreground)]">
              {unit}
            </span>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-rose-500">{error}</p>
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
