"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Trash2, Undo2 } from "lucide-react";

/**
 * GraphPlotter - Canvas for plotting points, lines, or functions
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {*} [props.value] - Current plot value
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {[number, number]} props.x_range - X axis range [min, max]
 * @param {[number, number]} props.y_range - Y axis range [min, max]
 * @param {boolean} props.grid - Show grid
 * @param {'point' | 'line' | 'freehand' | 'function'} props.mode - Plotting mode
 * @param {Array<{expression: string, color: string, label?: string}>} [props.background_functions] - Background functions
 * @param {number} props.max_points - Maximum number of points
 */
export default function GraphPlotter({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  x_range = [-10, 10],
  y_range = [-10, 10],
  grid = true,
  mode = "point",
  background_functions = [],
  max_points = 50,
}) {
  const canvasRef = useRef(null);
  const [points, setPoints] = useState(value?.points || []);
  const [functionExpr, setFunctionExpr] = useState(value?.expression || "");

  const width = 400;
  const height = 400;
  const padding = 40;

  // Transform coordinates
  const toCanvas = useCallback((x, y) => {
    const canvasX =
      padding +
      ((x - x_range[0]) / (x_range[1] - x_range[0])) * (width - 2 * padding);
    const canvasY =
      height -
      padding -
      ((y - y_range[0]) / (y_range[1] - y_range[0])) * (height - 2 * padding);
    return [canvasX, canvasY];
  }, [x_range, y_range]);

  const toGraph = useCallback((canvasX, canvasY) => {
    const x =
      x_range[0] +
      ((canvasX - padding) / (width - 2 * padding)) * (x_range[1] - x_range[0]);
    const y =
      y_range[0] +
      ((height - padding - canvasY) / (height - 2 * padding)) *
        (y_range[1] - y_range[0]);
    return [x, y];
  }, [x_range, y_range]);

  // Draw the graph
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Clear
    ctx.fillStyle = "var(--surface-2)";
    ctx.fillRect(0, 0, width, height);

    // Grid
    if (grid) {
      ctx.strokeStyle = "var(--border)";
      ctx.lineWidth = 1;

      // Vertical grid lines
      for (let x = Math.ceil(x_range[0]); x <= x_range[1]; x++) {
        const [cx] = toCanvas(x, 0);
        ctx.beginPath();
        ctx.moveTo(cx, padding);
        ctx.lineTo(cx, height - padding);
        ctx.stroke();
      }

      // Horizontal grid lines
      for (let y = Math.ceil(y_range[0]); y <= y_range[1]; y++) {
        const [, cy] = toCanvas(0, y);
        ctx.beginPath();
        ctx.moveTo(padding, cy);
        ctx.lineTo(width - padding, cy);
        ctx.stroke();
      }
    }

    // Axes
    ctx.strokeStyle = "var(--foreground)";
    ctx.lineWidth = 2;

    // X axis
    const [, axisY] = toCanvas(0, 0);
    if (axisY >= padding && axisY <= height - padding) {
      ctx.beginPath();
      ctx.moveTo(padding, axisY);
      ctx.lineTo(width - padding, axisY);
      ctx.stroke();
    }

    // Y axis
    const [axisX] = toCanvas(0, 0);
    if (axisX >= padding && axisX <= width - padding) {
      ctx.beginPath();
      ctx.moveTo(axisX, padding);
      ctx.lineTo(axisX, height - padding);
      ctx.stroke();
    }

    // Background functions
    background_functions.forEach((fn) => {
      ctx.strokeStyle = fn.color || "#888";
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;

      for (let px = padding; px <= width - padding; px++) {
        const [x] = toGraph(px, 0);
        try {
          // Simple expression evaluator (very basic)
          const y = eval(fn.expression.replace(/x/g, `(${x})`));
          const [cx, cy] = toCanvas(x, y);
          if (!started) {
            ctx.moveTo(cx, cy);
            started = true;
          } else {
            ctx.lineTo(cx, cy);
          }
        } catch {
          // Skip invalid expressions
        }
      }
      ctx.stroke();
    });

    // User points
    ctx.fillStyle = "var(--primary)";
    points.forEach(([x, y], index) => {
      const [cx, cy] = toCanvas(x, y);
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();

      // Draw lines between points in line mode
      if (mode === "line" && index > 0) {
        const [px, py] = points[index - 1];
        const [pcx, pcy] = toCanvas(px, py);
        ctx.strokeStyle = "var(--primary)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pcx, pcy);
        ctx.lineTo(cx, cy);
        ctx.stroke();
      }
    });

    // Axis labels
    ctx.fillStyle = "var(--foreground)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(x_range[0]), padding, height - padding + 20);
    ctx.fillText(String(x_range[1]), width - padding, height - padding + 20);
    ctx.textAlign = "right";
    ctx.fillText(String(y_range[0]), padding - 10, height - padding + 4);
    ctx.fillText(String(y_range[1]), padding - 10, padding + 4);
  }, [points, grid, mode, x_range, y_range, background_functions, toCanvas, toGraph]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleClick = useCallback((e) => {
    if (disabled || isGraded || mode === "function") return;
    if (points.length >= max_points) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    const [x, y] = toGraph(canvasX, canvasY);

    // Round to nearest 0.5
    const roundedX = Math.round(x * 2) / 2;
    const roundedY = Math.round(y * 2) / 2;

    // Check bounds
    if (
      roundedX < x_range[0] ||
      roundedX > x_range[1] ||
      roundedY < y_range[0] ||
      roundedY > y_range[1]
    ) {
      return;
    }

    const newPoints = [...points, [roundedX, roundedY]];
    setPoints(newPoints);
    onChange?.({ points: newPoints, expression: functionExpr });
  }, [disabled, isGraded, mode, points, max_points, toGraph, x_range, y_range, onChange, functionExpr]);

  const handleClear = () => {
    setPoints([]);
    onChange?.({ points: [], expression: functionExpr });
  };

  const handleUndo = () => {
    if (points.length === 0) return;
    const newPoints = points.slice(0, -1);
    setPoints(newPoints);
    onChange?.({ points: newPoints, expression: functionExpr });
  };

  const handleFunctionChange = (e) => {
    const expr = e.target.value;
    setFunctionExpr(expr);
    onChange?.({ points, expression: expr });
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
    <div id={id} className="v2-graph-plotter">
      {/* Controls */}
      {!isGraded && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[var(--muted-foreground)]">
            {mode === "function"
              ? "Enter a function"
              : `Click to plot (${points.length}/${max_points} points)`}
          </span>
          {mode !== "function" && (
            <div className="flex gap-2">
              <button
                onClick={handleUndo}
                disabled={disabled || points.length === 0}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg
                  border border-[var(--border)] bg-[var(--surface-2)]
                  hover:bg-[var(--surface-1)] disabled:opacity-50 transition-colors"
              >
                <Undo2 className="w-3 h-3" />
                Undo
              </button>
              <button
                onClick={handleClear}
                disabled={disabled || points.length === 0}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg
                  border border-[var(--border)] bg-[var(--surface-2)]
                  hover:bg-[var(--surface-1)] disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Function input */}
      {mode === "function" && (
        <input
          type="text"
          value={functionExpr}
          onChange={handleFunctionChange}
          disabled={disabled || isGraded}
          placeholder="e.g., x*x + 2*x - 1"
          className={`
            w-full mb-2 px-4 py-2 rounded-xl border ${borderClass}
            bg-[var(--surface-2)] text-[var(--foreground)] font-mono
            focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
            disabled:opacity-50
          `}
        />
      )}

      {/* Canvas */}
      <div className={`rounded-xl border ${borderClass} overflow-hidden inline-block`}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onClick={handleClick}
          className={`${
            disabled || isGraded || mode === "function"
              ? "cursor-not-allowed"
              : "cursor-crosshair"
          }`}
          style={{
            background: "var(--surface-2)",
          }}
        />
      </div>

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
