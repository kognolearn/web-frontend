"use client";

import React, { useState, useCallback, useMemo } from "react";

/**
 * NumberSlider - Range slider with marks
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {number} [props.value] - Current value
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {number} props.min - Minimum value
 * @param {number} props.max - Maximum value
 * @param {number} props.step - Step increment
 * @param {number} [props.initial_value] - Initial value
 * @param {string} [props.unit] - Unit label
 * @param {Array<{value: number, label: string}>} [props.marks] - Slider marks
 */
export default function NumberSlider({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  min = 0,
  max = 100,
  step = 1,
  initial_value,
  unit,
  marks = [],
}) {
  const [localValue, setLocalValue] = useState(
    value !== undefined ? value : (initial_value ?? min)
  );

  const currentValue = value !== undefined ? value : localValue;

  const handleChange = useCallback((e) => {
    const newValue = parseFloat(e.target.value);
    setLocalValue(newValue);
    onChange?.(newValue);
  }, [onChange]);

  // Calculate percentage for styling
  const percentage = useMemo(() => {
    return ((currentValue - min) / (max - min)) * 100;
  }, [currentValue, min, max]);

  // Determine track color based on grade
  let trackColor = "var(--primary)";
  if (isGraded && grade) {
    if (grade.status === "correct" || grade.passed) {
      trackColor = "rgb(16, 185, 129)"; // emerald-500
    } else if (grade.status === "incorrect" || grade.passed === false) {
      trackColor = "rgb(244, 63, 94)"; // rose-500
    }
  }

  return (
    <div id={id} className="v2-number-slider">
      {/* Value Display */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-[var(--muted-foreground)]">
          {min}{unit && ` ${unit}`}
        </span>
        <span className="text-lg font-semibold text-[var(--foreground)]">
          {currentValue}{unit && ` ${unit}`}
        </span>
        <span className="text-sm text-[var(--muted-foreground)]">
          {max}{unit && ` ${unit}`}
        </span>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onChange={handleChange}
          disabled={disabled || isGraded}
          className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, ${trackColor} ${percentage}%, var(--border) ${percentage}%)`,
          }}
        />

        {/* Marks */}
        {marks.length > 0 && (
          <div className="relative mt-2">
            {marks.map((mark, index) => {
              const markPercent = ((mark.value - min) / (max - min)) * 100;
              return (
                <div
                  key={index}
                  className="absolute transform -translate-x-1/2"
                  style={{ left: `${markPercent}%` }}
                >
                  <div className="w-1 h-2 bg-[var(--border)] rounded-full mb-1" />
                  <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                    {mark.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grade feedback */}
      {isGraded && grade?.feedback && (
        <p className={`mt-3 text-sm ${
          grade.status === "correct" || grade.passed
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400"
        }`}>
          {grade.feedback}
        </p>
      )}

      {/* Custom slider thumb styles */}
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        input[type="range"]:disabled::-webkit-slider-thumb {
          cursor: not-allowed;
        }

        input[type="range"]:disabled::-moz-range-thumb {
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
