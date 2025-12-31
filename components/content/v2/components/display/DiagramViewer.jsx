"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, ZoomOut, Code, X } from "lucide-react";
import MermaidDiagram from "@/components/content/MermaidDiagram";

/**
 * DiagramViewer - Mermaid or SVG diagram display
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {'mermaid' | 'svg'} props.diagram_type - Type of diagram
 * @param {string} props.content - Mermaid syntax or SVG markup
 * @param {Array<{id: string, text: string, x?: number, y?: number}>} [props.labels] - Labels to overlay
 * @param {boolean} props.zoomable - Allow zoom
 */
export default function DiagramViewer({
  id,
  diagram_type = "mermaid",
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
        <p className="text-sm text-[var(--muted-foreground)]">
          No diagram content provided
        </p>
      </div>
    );
  }

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const renderDiagram = () => {
    if (diagram_type === "mermaid") {
      return <MermaidDiagram chart={content} />;
    }

    // SVG rendering
    return (
      <div
        className="relative"
        dangerouslySetInnerHTML={{ __html: content }}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center",
          transition: "transform 0.2s ease",
        }}
      />
    );
  };

  return (
    <div id={id} className="v2-diagram-viewer">
      {/* Controls */}
      <div className="flex items-center justify-end gap-2 mb-2">
        {diagram_type === "mermaid" && (
          <button
            onClick={() => setShowSource(!showSource)}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg
              border border-[var(--border)] bg-[var(--surface-2)]
              hover:bg-[var(--surface-1)] transition-colors"
          >
            <Code className="w-3 h-3" />
            {showSource ? "Hide" : "Source"}
          </button>
        )}
        {zoomable && (
          <>
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]
                hover:bg-[var(--surface-1)] transition-colors"
              disabled={scale <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-[var(--muted-foreground)] min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]
                hover:bg-[var(--surface-1)] transition-colors"
              disabled={scale >= 3}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Diagram Container */}
      <div
        className={`
          relative rounded-xl border border-[var(--border)] bg-[var(--surface-2)]
          overflow-auto p-4 min-h-[200px]
          ${zoomable ? "cursor-grab active:cursor-grabbing" : ""}
        `}
        onClick={() => zoomable && setIsZoomed(true)}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            transition: "transform 0.2s ease",
          }}
        >
          {renderDiagram()}

          {/* Labels overlay */}
          {labels.length > 0 &&
            labels.map((label) => (
              <div
                key={label.id}
                className="absolute px-2 py-1 text-xs rounded bg-[var(--primary)] text-white shadow-lg"
                style={{
                  left: label.x ? `${label.x}%` : "auto",
                  top: label.y ? `${label.y}%` : "auto",
                }}
              >
                {label.text}
              </div>
            ))}
        </div>
      </div>

      {/* Source Code */}
      <AnimatePresence>
        {showSource && diagram_type === "mermaid" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 overflow-hidden"
          >
            <pre className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] overflow-x-auto text-xs">
              <code>{content}</code>
            </pre>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Zoom Modal */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setIsZoomed(false)}
          >
            <button
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              onClick={() => setIsZoomed(false)}
            >
              <X className="w-6 h-6" />
            </button>
            <div
              className="bg-white dark:bg-[var(--surface-1)] rounded-xl p-8 max-w-[90vw] max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {renderDiagram()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
