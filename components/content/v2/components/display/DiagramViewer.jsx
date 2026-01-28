"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, ZoomOut, Code, X, AlertCircle } from "lucide-react";

/**
 * DiagramViewer - SVG-only diagram display
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {'svg'} props.diagram_type - Type of diagram
 * @param {string} props.content - SVG markup
 * @param {Array<{id: string, text: string, x?: number, y?: number}>} [props.labels] - Labels to overlay
 * @param {boolean} props.zoomable - Allow zoom
 */
export default function DiagramViewer({
  id,
  diagram_type = "svg",
  content,
  labels = [],
  zoomable = true,
}) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [scale, setScale] = useState(1);

  if (!content) {
    return (
      <div
        id={id}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-center"
      >
        <p className="text-sm text-[var(--muted-foreground)]">No diagram content provided</p>
      </div>
    );
  }

  if (diagram_type !== "svg") {
    return (
      <div
        id={id}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-center"
      >
        <div className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <AlertCircle className="h-4 w-4" />
          Mermaid diagrams are no longer supported. Use an image or SVG instead.
        </div>
      </div>
    );
  }

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setScale(1);

  return (
    <div id={id} className="v2-diagram-viewer">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-sm font-medium text-[var(--foreground)]">Diagram</div>
        <div className="flex items-center gap-2">
          {zoomable && (
            <>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={handleZoomOut}
                title="Zoom out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={handleZoomIn}
                title="Zoom in"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={resetZoom}
                title="Reset zoom"
              >
                100%
              </button>
            </>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setShowSource((prev) => !prev)}
            title={showSource ? "Hide SVG source" : "Show SVG source"}
          >
            <Code className="h-3.5 w-3.5" />
          </button>
          {zoomable && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setIsZoomed(true)}
              title="Open full-screen"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div
        className={`relative rounded-xl border border-[var(--border)] bg-[var(--surface-2)] overflow-auto p-4 min-h-[200px] ${
          zoomable ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        onClick={() => zoomable && setIsZoomed(true)}
      >
        <div
          className="flex justify-center"
          style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
        {labels.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {labels.map((label) => (
              <span
                key={label.id}
                className="absolute text-xs bg-black/70 text-white px-1.5 py-0.5 rounded"
                style={{ left: label.x ?? 0, top: label.y ?? 0 }}
              >
                {label.text}
              </span>
            ))}
          </div>
        )}
      </div>

      {showSource && (
        <pre className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3 text-xs overflow-auto">
          {content}
        </pre>
      )}

      <AnimatePresence>
        {isZoomed && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-5xl max-h-[90vh] bg-[var(--surface-1)] rounded-2xl p-6 overflow-auto"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <button
                type="button"
                className="btn btn-ghost btn-sm absolute top-4 right-4"
                onClick={() => setIsZoomed(false)}
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: content }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
