"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Trash2, Undo2 } from "lucide-react";

/**
 * GraphSketchAnswer - Draw function on graph
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {*} [props.value] - Current sketch data
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {[number, number]} props.x_range - X axis range
 * @param {[number, number]} props.y_range - Y axis range
 * @param {boolean} props.grid - Show grid
 * @param {string} [props.constraints_hint] - Hint about constraints
 */
export default function GraphSketchAnswer({
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
  constraints_hint,
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState(value?.points || []);
  const [currentStroke, setCurrentStroke] = useState([]);

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
    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--surface-2")
      .trim() || "#f5f3ef";
    ctx.fillRect(0, 0, width, height);

    // Grid
    if (grid) {
      ctx.strokeStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--border")
        .trim() || "#e5e5e5";
      ctx.lineWidth = 1;

      for (let x = Math.ceil(x_range[0]); x <= x_range[1]; x++) {
        const [cx] = toCanvas(x, 0);
        ctx.beginPath();
        ctx.moveTo(cx, padding);
        ctx.lineTo(cx, height - padding);
        ctx.stroke();
      }

      for (let y = Math.ceil(y_range[0]); y <= y_range[1]; y++) {
        const [, cy] = toCanvas(0, y);
        ctx.beginPath();
        ctx.moveTo(padding, cy);
        ctx.lineTo(width - padding, cy);
        ctx.stroke();
      }
    }

    // Axes
    ctx.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--foreground")
      .trim() || "#1e1e1e";
    ctx.lineWidth = 2;

    const [, axisY] = toCanvas(0, 0);
    if (axisY >= padding && axisY <= height - padding) {
      ctx.beginPath();
      ctx.moveTo(padding, axisY);
      ctx.lineTo(width - padding, axisY);
      ctx.stroke();
    }

    const [axisX] = toCanvas(0, 0);
    if (axisX >= padding && axisX <= width - padding) {
      ctx.beginPath();
      ctx.moveTo(axisX, padding);
      ctx.lineTo(axisX, height - padding);
      ctx.stroke();
    }

    // User strokes
    const strokeColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--primary")
      .trim() || "#5a8a59";

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Draw saved strokes
    points.forEach((stroke) => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      const [firstX, firstY] = toCanvas(stroke[0][0], stroke[0][1]);
      ctx.moveTo(firstX, firstY);
      for (let i = 1; i < stroke.length; i++) {
        const [px, py] = toCanvas(stroke[i][0], stroke[i][1]);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    });

    // Draw current stroke
    if (currentStroke.length >= 2) {
      ctx.beginPath();
      const [firstX, firstY] = toCanvas(currentStroke[0][0], currentStroke[0][1]);
      ctx.moveTo(firstX, firstY);
      for (let i = 1; i < currentStroke.length; i++) {
        const [px, py] = toCanvas(currentStroke[i][0], currentStroke[i][1]);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Axis labels
    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--foreground")
      .trim() || "#1e1e1e";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(x_range[0]), padding, height - padding + 20);
    ctx.fillText(String(x_range[1]), width - padding, height - padding + 20);
    ctx.textAlign = "right";
    ctx.fillText(String(y_range[0]), padding - 10, height - padding + 4);
    ctx.fillText(String(y_range[1]), padding - 10, padding + 4);
  }, [points, currentStroke, grid, x_range, y_range, toCanvas]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };

  const handleMouseDown = useCallback((e) => {
    if (disabled || isGraded) return;
    setIsDrawing(true);
    const [canvasX, canvasY] = getCanvasCoords(e);
    const [x, y] = toGraph(canvasX, canvasY);
    setCurrentStroke([[x, y]]);
  }, [disabled, isGraded, toGraph]);

  const handleMouseMove = useCallback((e) => {
    if (!isDrawing || disabled || isGraded) return;
    const [canvasX, canvasY] = getCanvasCoords(e);
    const [x, y] = toGraph(canvasX, canvasY);
    setCurrentStroke((prev) => [...prev, [x, y]]);
  }, [isDrawing, disabled, isGraded, toGraph]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length >= 2) {
      const newPoints = [...points, currentStroke];
      setPoints(newPoints);
      onChange?.({ points: newPoints });
    }
    setCurrentStroke([]);
  }, [isDrawing, currentStroke, points, onChange]);

  const handleClear = () => {
    if (disabled || isGraded) return;
    setPoints([]);
    onChange?.({ points: [] });
  };

  const handleUndo = () => {
    if (disabled || isGraded || points.length === 0) return;
    const newPoints = points.slice(0, -1);
    setPoints(newPoints);
    onChange?.({ points: newPoints });
  };

  // Determine border color
  let borderClass = "border-[var(--border)]";
  if (isGraded && grade) {
    if (grade.passed) {
      borderClass = "border-emerald-500";
    } else {
      borderClass = "border-rose-500";
    }
  }

  return (
    <div id={id} className="v2-graph-sketch-answer">
      {/* Hint */}
      {constraints_hint && (
        <p className="mb-3 text-sm text-[var(--foreground)]">
          {constraints_hint}
        </p>
      )}

      {/* Controls */}
      {!isGraded && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[var(--muted-foreground)]">
            Draw on the graph
          </span>
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
        </div>
      )}

      {/* Canvas */}
      <div className={`rounded-xl border ${borderClass} overflow-hidden inline-block`}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`${
            disabled || isGraded ? "cursor-not-allowed" : "cursor-crosshair"
          }`}
        />
      </div>

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
