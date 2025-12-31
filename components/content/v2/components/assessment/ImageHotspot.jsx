"use client";

import React, { useState, useRef, useCallback } from "react";
import { Target, Check, X } from "lucide-react";

/**
 * ImageHotspot - Click on image regions
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {{x: number, y: number}} [props.value] - Clicked position (percentage)
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {string} props.image_url - Image URL
 * @param {string} props.prompt - Instructions for what to click
 */
export default function ImageHotspot({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  image_url,
  prompt = "Click on the correct location",
}) {
  const [clickPosition, setClickPosition] = useState(value || null);
  const containerRef = useRef(null);

  const handleClick = useCallback((e) => {
    if (disabled || isGraded) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const position = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    setClickPosition(position);
    onChange?.(position);
  }, [disabled, isGraded, onChange]);

  const currentPosition = value !== undefined ? value : clickPosition;

  // Determine marker status
  let markerClass = "bg-[var(--primary)] border-white";
  if (isGraded && grade) {
    if (grade.passed) {
      markerClass = "bg-emerald-500 border-white";
    } else {
      markerClass = "bg-rose-500 border-white";
    }
  }

  return (
    <div id={id} className="v2-image-hotspot">
      {/* Prompt */}
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-[var(--primary)]" />
        <span className="text-sm text-[var(--foreground)]">{prompt}</span>
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        className={`
          relative rounded-xl overflow-hidden border
          ${
            isGraded
              ? grade?.passed
                ? "border-emerald-500"
                : "border-rose-500"
              : "border-[var(--border)]"
          }
          ${disabled || isGraded ? "cursor-not-allowed" : "cursor-crosshair"}
        `}
        onClick={handleClick}
      >
        {image_url ? (
          <img
            src={image_url}
            alt="Click to select a region"
            className="w-full h-auto"
            draggable={false}
          />
        ) : (
          <div className="aspect-video bg-[var(--surface-2)] flex items-center justify-center">
            <span className="text-sm text-[var(--muted-foreground)]">
              No image provided
            </span>
          </div>
        )}

        {/* Click marker */}
        {currentPosition && (
          <div
            className={`
              absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 ${markerClass}
              flex items-center justify-center shadow-lg
              transform transition-transform
            `}
            style={{
              left: `${currentPosition.x}%`,
              top: `${currentPosition.y}%`,
            }}
          >
            {isGraded && grade?.passed && (
              <Check className="w-3 h-3 text-white" />
            )}
            {isGraded && !grade?.passed && (
              <X className="w-3 h-3 text-white" />
            )}
          </div>
        )}

        {/* Show correct position if wrong */}
        {isGraded && !grade?.passed && grade?.expected && (
          <div
            className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-emerald-500 border-dashed"
            style={{
              left: `${grade.expected.x}%`,
              top: `${grade.expected.y}%`,
            }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-emerald-500 text-white text-xs whitespace-nowrap">
              Correct
            </div>
          </div>
        )}
      </div>

      {/* Coordinates display */}
      {currentPosition && !isGraded && (
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
          Selected: ({currentPosition.x.toFixed(1)}%, {currentPosition.y.toFixed(1)}%)
        </p>
      )}

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
