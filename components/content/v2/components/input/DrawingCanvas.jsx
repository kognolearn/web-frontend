"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const DEFAULT_TOOLS = ["pencil", "line", "eraser"];

const normalizeTools = (tools) => {
  if (!Array.isArray(tools) || tools.length === 0) return DEFAULT_TOOLS;
  return tools.filter(Boolean);
};

/**
 * DrawingCanvas - Freehand drawing with basic tools
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {string} [props.value] - Serialized drawing (data URL)
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {number} [props.width=600]
 * @param {number} [props.height=400]
 * @param {Array} [props.tools]
 * @param {string} [props.background_image]
 * @param {boolean} [props.snapToGrid]
 * @param {number} [props.gridSize]
 */
export default function DrawingCanvas({
  id,
  value,
  onChange,
  disabled = false,
  width = 600,
  height = 400,
  tools,
  background_image,
  snapToGrid = false,
  gridSize = 20,
}) {
  const [activeTool, setActiveTool] = useState(() => normalizeTools(tools)[0]);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const snapshotRef = useRef(null);
  const loadingRef = useRef(false);
  const backgroundRef = useRef(null);
  const safeWidth = clamp(Number(width) || 600, 200, 1200);
  const safeHeight = clamp(Number(height) || 400, 200, 800);
  const availableTools = useMemo(() => normalizeTools(tools), [tools]);

  useEffect(() => {
    if (!availableTools.includes(activeTool)) {
      setActiveTool(availableTools[0]);
    }
  }, [availableTools, activeTool]);

  const resolveColor = () => {
    if (typeof window === "undefined") return "#111111";
    const value = getComputedStyle(document.documentElement).getPropertyValue("--foreground");
    return value?.trim() || "#111111";
  };

  const setContextDefaults = useCallback((ctx, tool) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = tool === "eraser" ? 16 : 2;
    ctx.strokeStyle = resolveColor();
    ctx.fillStyle = resolveColor();
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
  }, []);

  const getCanvasPoint = useCallback((event) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    if (snapToGrid) {
      const size = Math.max(5, Number(gridSize) || 20);
      return {
        x: Math.round(x / size) * size,
        y: Math.round(y / size) * size,
      };
    }
    return { x, y };
  }, [snapToGrid, gridSize]);

  const drawBackground = useCallback(
    (ctx) => {
      ctx.clearRect(0, 0, safeWidth, safeHeight);
      if (backgroundRef.current) {
        ctx.drawImage(backgroundRef.current, 0, 0, safeWidth, safeHeight);
      }
    },
    [safeWidth, safeHeight]
  );

  const emitChange = useCallback(() => {
    if (!onChange || !canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/png");
    onChange(url);
  }, [onChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = safeWidth;
    canvas.height = safeHeight;
    const ctx = canvas.getContext("2d");
    ctxRef.current = ctx;
    if (!ctx) return;

    if (background_image) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        backgroundRef.current = img;
        drawBackground(ctx);
        if (value) {
          const overlay = new Image();
          overlay.onload = () => {
            ctx.drawImage(overlay, 0, 0, safeWidth, safeHeight);
          };
          overlay.src = value;
        }
      };
      img.src = background_image;
    } else {
      backgroundRef.current = null;
      drawBackground(ctx);
      if (value) {
        const overlay = new Image();
        overlay.onload = () => {
          ctx.drawImage(overlay, 0, 0, safeWidth, safeHeight);
        };
        overlay.src = value;
      }
    }
  }, [safeWidth, safeHeight, background_image, value, drawBackground]);

  useEffect(() => {
    if (!value || !canvasRef.current || loadingRef.current) return;
    const ctx = ctxRef.current;
    if (!ctx) return;

    loadingRef.current = true;
    const img = new Image();
    img.onload = () => {
      drawBackground(ctx);
      ctx.drawImage(img, 0, 0, safeWidth, safeHeight);
      loadingRef.current = false;
    };
    img.src = value;
  }, [value, drawBackground, safeWidth, safeHeight]);

  const handlePointerDown = (event) => {
    if (disabled || !ctxRef.current) return;
    const ctx = ctxRef.current;
    const point = getCanvasPoint(event);
    setContextDefaults(ctx, activeTool);

    if (activeTool === "text") {
      const text = window.prompt("Enter text");
      if (text) {
        ctx.font = "16px var(--font-nunito, sans-serif)";
        ctx.fillText(text, point.x, point.y);
        emitChange();
      }
      return;
    }

    isDrawingRef.current = true;
    startRef.current = point;

    if (activeTool === "pencil" || activeTool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    } else {
      snapshotRef.current = ctx.getImageData(0, 0, safeWidth, safeHeight);
    }
  };

  const handlePointerMove = (event) => {
    if (!isDrawingRef.current || disabled || !ctxRef.current) return;
    const ctx = ctxRef.current;
    const point = getCanvasPoint(event);

    if (activeTool === "pencil" || activeTool === "eraser") {
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      return;
    }

    if (snapshotRef.current) {
      ctx.putImageData(snapshotRef.current, 0, 0);
    }

    if (activeTool === "line") {
      ctx.beginPath();
      ctx.moveTo(startRef.current.x, startRef.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    } else if (activeTool === "rectangle") {
      const widthRect = point.x - startRef.current.x;
      const heightRect = point.y - startRef.current.y;
      ctx.strokeRect(startRef.current.x, startRef.current.y, widthRect, heightRect);
    } else if (activeTool === "circle") {
      const dx = point.x - startRef.current.x;
      const dy = point.y - startRef.current.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      ctx.beginPath();
      ctx.arc(startRef.current.x, startRef.current.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  const finishDrawing = () => {
    if (!isDrawingRef.current || !ctxRef.current) return;
    isDrawingRef.current = false;
    snapshotRef.current = null;
    emitChange();
  };

  const handlePointerUp = () => {
    finishDrawing();
  };

  const handlePointerLeave = () => {
    finishDrawing();
  };

  const handleClear = () => {
    if (!ctxRef.current) return;
    drawBackground(ctxRef.current);
    emitChange();
  };

  return (
    <div id={id} className="v2-drawing-canvas space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {availableTools.map((tool) => (
          <button
            key={tool}
            type="button"
            onClick={() => setActiveTool(tool)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              activeTool === tool
                ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10"
                : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/50"
            }`}
          >
            {tool}
          </button>
        ))}
        <button
          type="button"
          onClick={handleClear}
          className="ml-auto px-3 py-1 rounded-full text-xs font-medium border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--danger)] hover:border-[var(--danger)]/50"
        >
          Clear
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-2">
        <canvas
          ref={canvasRef}
          width={safeWidth}
          height={safeHeight}
          className="w-full h-full rounded-xl bg-transparent touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        />
      </div>
    </div>
  );
}
