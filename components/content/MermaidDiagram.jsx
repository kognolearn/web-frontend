"use client";

import React, { useEffect, useRef, useState, useId } from "react";

/**
 * MermaidDiagram - Renders Mermaid diagrams from text definitions
 * 
 * Supports all major Mermaid diagram types:
 * - sequenceDiagram: Protocol flows, API calls, algorithms
 * - classDiagram: OOP relationships, data models
 * - stateDiagram-v2: State machines, UI flows
 * - erDiagram: Entity-relationship diagrams for databases
 * - gantt: Project timelines
 * - journey: User journey maps
 * - pie: Pie charts for distributions
 * - mindmap: Concept maps
 * - quadrantChart: 2x2 decision frameworks
 * - flowchart: General flowcharts (TB, LR, etc.)
 * 
 * Props:
 * - chart: string - The Mermaid diagram definition
 * - className?: string - Additional CSS classes for the container
 */
export default function MermaidDiagram({ chart, className = "" }) {
  const containerRef = useRef(null);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRawCode, setShowRawCode] = useState(false);
  const uniqueId = useId();

  useEffect(() => {
    if (!chart || typeof window === "undefined") {
      setIsLoading(false);
      return;
    }
    
    // Quick validation - skip if chart is too short or appears empty
    const trimmedChart = chart.trim();
    if (trimmedChart.length < 3) {
      setIsLoading(false);
      setError(true);
      return;
    }

    let isMounted = true;

    const renderDiagram = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Dynamically import mermaid to avoid SSR issues
        const mermaid = (await import("mermaid")).default;

        // Initialize mermaid with configuration
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          suppressErrorRendering: true, // Suppress error messages from being rendered
          themeVariables: {
            // Use CSS variables for theme consistency
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
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
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
            // ER diagram specific
            attributeBackgroundColorOdd: "#1e293b",
            attributeBackgroundColorEven: "#0f172a",
            // Pie chart specific
            pie1: "#6366f1",
            pie2: "#8b5cf6",
            pie3: "#a855f7",
            pie4: "#d946ef",
            pie5: "#ec4899",
            pie6: "#f43f5e",
            pie7: "#ef4444",
            pie8: "#f97316",
            pieTextColor: "#f8fafc",
            pieLegendTextSize: "14px",
            pieLegendTextColor: "#f8fafc",
            pieStrokeColor: "#0f172a",
            pieStrokeWidth: "2px",
            // Git graph specific
            git0: "#6366f1",
            git1: "#8b5cf6",
            git2: "#a855f7",
            git3: "#d946ef",
            gitBranchLabel0: "#f8fafc",
            gitBranchLabel1: "#f8fafc",
            gitBranchLabel2: "#f8fafc",
            gitBranchLabel3: "#f8fafc",
          },
          flowchart: {
            curve: "basis",
            padding: 15,
            nodeSpacing: 50,
            rankSpacing: 50,
            htmlLabels: true,
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
            bottomMarginAdj: 1,
            useMaxWidth: true,
          },
          gantt: {
            titleTopMargin: 25,
            barHeight: 20,
            barGap: 4,
            topPadding: 50,
            leftPadding: 75,
            gridLineStartPadding: 35,
            fontSize: 11,
            sectionFontSize: 14,
            numberSectionStyles: 4,
            axisFormat: "%Y-%m-%d",
          },
          pie: {
            textPosition: 0.75,
            useMaxWidth: true,
          },
          mindmap: {
            padding: 10,
            maxNodeWidth: 200,
          },
          securityLevel: "loose",
          logLevel: 5, // 5 = silent, suppress all console logs
        });

        // Clean the chart input - remove any potential HTML encoding issues
        let cleanedChart = chart
          .trim()
          .replace(/&gt;/g, ">")
          .replace(/&lt;/g, "<")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"');
        
        // Check if the diagram has a valid type declaration
        // Mermaid requires a diagram type at the beginning (e.g., flowchart, graph, sequenceDiagram, etc.)
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

        // Generate a safe ID for the diagram
        const diagramId = `mermaid-${uniqueId.replace(/:/g, "-")}-${Date.now()}`;

        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(diagramId, cleanedChart);
        
        // Check if the rendered SVG contains an error message
        // Mermaid sometimes renders error content instead of throwing
        if (renderedSvg && (
          renderedSvg.includes('Syntax error') ||
          renderedSvg.includes('Parse error') ||
          renderedSvg.includes('Error:') ||
          renderedSvg.includes('error in text')
        )) {
          throw new Error('Mermaid syntax error detected in rendered output');
        }

        if (isMounted) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err) {
        // Silently handle errors - diagram will be hidden
        if (isMounted) {
          setError(true);
          setSvg(""); // Clear any partial SVG
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [chart, uniqueId]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`my-6 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-6 ${className}`}>
        <div className="flex items-center justify-center gap-3 text-[var(--muted-foreground)]">
          <svg 
            className="w-5 h-5 animate-spin" 
            fill="none" 
            viewBox="0 0 24 24"
          >
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

  // Error state - hide broken diagrams silently
  if (error) {
    return null;
  }

  // Empty state
  if (!svg) {
    return null;
  }

  // Success - render the SVG
  return (
    <div className={`my-6 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-2 bg-[var(--surface-2)] border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg 
            className="w-4 h-4 text-[var(--primary)]" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" 
            />
          </svg>
          <span className="text-xs font-mono text-[var(--muted-foreground)]">
            diagram
          </span>
        </div>
        
        {/* Toggle raw code button */}
        <button
          onClick={() => setShowRawCode(!showRawCode)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-1)] transition-colors"
          title={showRawCode ? "Show diagram" : "View source code"}
        >
          {showRawCode ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>Diagram</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span>Code</span>
            </>
          )}
        </button>
      </div>
      
      {/* Content area - either diagram or raw code */}
      {showRawCode ? (
        <div className="p-4 overflow-x-auto">
          <pre className="text-sm font-mono text-[var(--foreground)] whitespace-pre-wrap break-words">
            {chart}
          </pre>
        </div>
      ) : (
        <div 
          ref={containerRef}
          className="p-4 overflow-x-auto flex justify-center mermaid-container"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
      
      {/* Styles for the rendered SVG */}
      <style jsx global>{`
        .mermaid-container svg {
          max-width: 100%;
          height: auto;
        }
        
        .mermaid-container .node rect,
        .mermaid-container .node circle,
        .mermaid-container .node ellipse,
        .mermaid-container .node polygon,
        .mermaid-container .node path {
          stroke-width: 1.5px;
        }
        
        .mermaid-container .edgePath .path {
          stroke-width: 1.5px;
        }
        
        .mermaid-container .label {
          font-family: ui-sans-serif, system-ui, sans-serif;
        }
        
        .mermaid-container .cluster rect {
          rx: 8px;
          ry: 8px;
        }
        
        /* Improve text readability */
        .mermaid-container text {
          font-family: ui-sans-serif, system-ui, sans-serif;
        }
        
        /* Sequence diagram specific styles */
        .mermaid-container .actor {
          stroke-width: 1.5px;
        }
        
        .mermaid-container .messageText {
          font-size: 13px;
        }
        
        /* State diagram styles */
        .mermaid-container .statediagram-state rect {
          rx: 8px;
          ry: 8px;
        }
        
        /* Mindmap styles */
        .mermaid-container .mindmap-node rect {
          rx: 8px;
          ry: 8px;
        }
        
        /* Pie chart styles */
        .mermaid-container .pieTitleText {
          font-size: 16px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
