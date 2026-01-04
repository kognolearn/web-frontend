"use client";

import React, { useState, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, ZoomOut, Code, X, AlertCircle } from "lucide-react";

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
  const [mermaidSvg, setMermaidSvg] = useState("");
  const [mermaidError, setMermaidError] = useState(null); // null = no error, string = error message
  const [isLoading, setIsLoading] = useState(diagram_type === "mermaid");
  const uniqueId = useId();

  // Render Mermaid diagram
  useEffect(() => {
    if (diagram_type !== "mermaid" || !content) {
      setIsLoading(false);
      return;
    }

    // Quick validation - skip if chart is too short or appears empty
    const trimmedContent = content.trim();
    if (trimmedContent.length < 3) {
      setIsLoading(false);
      setMermaidError("Diagram content too short");
      return;
    }

    let isMounted = true;

    const renderMermaid = async () => {
      try {
        setIsLoading(true);
        setMermaidError(null);

        const mermaid = (await import("mermaid")).default;

        // Comprehensive mermaid configuration matching MermaidDiagram.jsx
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          suppressErrorRendering: true,
          themeVariables: {
            primaryColor: "#6366f1",
            primaryTextColor: "#f8fafc",
            primaryBorderColor: "#818cf8",
            lineColor: "#94a3b8",
            secondaryColor: "#1e293b",
            tertiaryColor: "#0f172a",
            background: "#0f172a",
            mainBkg: "#1e293b",
            secondBkg: "#334155",
            border1: "#475569",
            border2: "#64748b",
            arrowheadColor: "#94a3b8",
            fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
            fontSize: "14px",
            // Sequence diagram specific
            actorBkg: "#1e293b",
            actorBorder: "#6366f1",
            actorTextColor: "#f8fafc",
            actorLineColor: "#64748b",
            signalColor: "#f8fafc",
            signalTextColor: "#f8fafc",
            labelBoxBkgColor: "#1e293b",
            labelBoxBorderColor: "#475569",
            labelTextColor: "#f8fafc",
            loopTextColor: "#f8fafc",
            noteBorderColor: "#6366f1",
            noteBkgColor: "#312e81",
            noteTextColor: "#f8fafc",
            activationBorderColor: "#6366f1",
            activationBkgColor: "#4338ca",
            // State diagram specific
            labelColor: "#f8fafc",
            altBackground: "#1e293b",
            // Class diagram specific
            classText: "#f8fafc",
          },
          flowchart: {
            curve: "basis",
            padding: 15,
            nodeSpacing: 50,
            rankSpacing: 50,
            htmlLabels: true,
            useMaxWidth: true,
          },
          sequence: {
            diagramMarginX: 15,
            diagramMarginY: 15,
            actorMargin: 50,
            width: 150,
            height: 65,
            boxMargin: 10,
            boxTextMargin: 5,
            noteMargin: 10,
            messageMargin: 35,
            mirrorActors: true,
            useMaxWidth: true,
          },
          securityLevel: "loose",
          logLevel: 5, // Silent
        });

        // Clean content - decode HTML entities but preserve Unicode
        let cleanedChart = content
          .trim()
          .replace(/&gt;/g, ">")
          .replace(/&lt;/g, "<")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
          .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));

        // Check if the diagram has a valid type declaration
        const diagramTypes = [
          'flowchart',
          'graph',
          'sequenceDiagram',
          'classDiagram',
          'stateDiagram',
          'stateDiagram-v2',
          'erDiagram',
          'journey',
          'gantt',
          'pie',
          'quadrantChart',
          'requirementDiagram',
          'gitGraph',
          'mindmap',
          'timeline',
          'zenuml',
          'sankey',
          'xychart',
          'block',
        ];

        const firstLine = cleanedChart.split('\n')[0].trim().toLowerCase();
        const hasValidType = diagramTypes.some(type =>
          firstLine.startsWith(type.toLowerCase())
        );

        // If no valid diagram type is detected, prepend a default flowchart type
        if (!hasValidType) {
          cleanedChart = `flowchart TD\n${cleanedChart}`;
        }

        // Generate unique ID without special characters
        const diagramId = `mermaid-v2-${uniqueId.replace(/[^a-zA-Z0-9]/g, "")}-${Date.now()}`;

        const { svg } = await mermaid.render(diagramId, cleanedChart);

        // Check if the rendered SVG contains an error message
        if (svg && (
          svg.includes('Syntax error') ||
          svg.includes('Parse error') ||
          svg.includes('Error:') ||
          svg.includes('error in text')
        )) {
          throw new Error('Mermaid syntax error detected in rendered output');
        }

        if (isMounted && svg) {
          setMermaidSvg(svg);
          setMermaidError(null);
        }
      } catch (err) {
        console.error("[DiagramViewer] Mermaid render error:", err);
        if (isMounted) {
          setMermaidError(err?.message || "Failed to render diagram");
          setMermaidSvg("");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    renderMermaid();

    return () => {
      isMounted = false;
    };
  }, [content, diagram_type, uniqueId]);

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
      // Loading state
      if (isLoading) {
        return (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-[var(--muted-foreground)]">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-sm">Rendering diagram...</span>
            </div>
          </div>
        );
      }

      // Error state - show source code as fallback
      if (mermaidError || !mermaidSvg) {
        return (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-amber-500">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p>Diagram could not be rendered.</p>
                {typeof mermaidError === 'string' && mermaidError !== 'true' && (
                  <p className="text-xs text-amber-400/70 mt-1">{mermaidError}</p>
                )}
              </div>
            </div>
            <pre className="p-4 rounded-lg bg-[var(--surface-1)] overflow-x-auto text-xs font-mono whitespace-pre-wrap">
              {content}
            </pre>
          </div>
        );
      }

      // Success - render SVG
      return (
        <div
          className="mermaid-container flex justify-center"
          dangerouslySetInnerHTML={{ __html: mermaidSvg }}
        />
      );
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
        {diagram_type === "mermaid" && !mermaidError && mermaidSvg && (
          <button
            onClick={() => setShowSource(!showSource)}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-1)] transition-colors"
          >
            <Code className="w-3 h-3" />
            {showSource ? "Hide" : "Source"}
          </button>
        )}
        {zoomable && !mermaidError && (
          <>
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-1)] transition-colors"
              disabled={scale <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-[var(--muted-foreground)] min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-1)] transition-colors"
              disabled={scale >= 3}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Diagram Container */}
      <div
        className={`relative rounded-xl border border-[var(--border)] bg-[var(--surface-2)] overflow-auto p-4 min-h-[200px] ${zoomable && !mermaidError ? "cursor-grab active:cursor-grabbing" : ""}`}
        onClick={() => zoomable && !mermaidError && mermaidSvg && setIsZoomed(true)}
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
          {!mermaidError && labels.length > 0 &&
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
        {showSource && diagram_type === "mermaid" && !mermaidError && (
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
        {isZoomed && mermaidSvg && !mermaidError && (
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
              <div
                className="mermaid-container"
                dangerouslySetInnerHTML={{ __html: mermaidSvg }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global styles for mermaid */}
      <style jsx global>{`
        .v2-diagram-viewer .mermaid-container svg {
          max-width: 100%;
          height: auto;
        }

        .v2-diagram-viewer .mermaid-container .node text {
          paint-order: stroke;
          stroke: rgba(15, 23, 42, 0.65);
          stroke-linejoin: round;
          stroke-width: 2px;
        }

        .v2-diagram-viewer .mermaid-container .node .label {
          text-shadow: 0 1px 2px rgba(15, 23, 42, 0.6);
        }
      `}</style>
    </div>
  );
}
