// components/content/RichBlock.jsx
"use client";

import React from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";

const mjxConfig = {
  loader: { load: ["input/tex", "output/svg"] },
  tex: { 
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    processEscapes: true,
    processEnvironments: true
  },
  svg: { fontCache: "global" }
};

/**
 * Props:
 * - block: { content: [ {"text"?:string} | {"inline-math"?:string} | {"block-math"?:string} ] }
 *   OR { body: string } for markdown/latex mixed content
 * - maxWidth?: number | string (default 720)
 * - scrollY?: string (e.g., "10rem" or "240px")
 * - scrollMode?: "auto" | "always" | "never"  (default "auto")
 * - containerClassName?: string
 */
export default function RichBlock({
  block,
  maxWidth = 720,
  scrollY,
  scrollMode = "auto",
  containerClassName = ""
}) {
  if (!block) return null;
  
  // Check if it's the structured format or simple body text
  const items = Array.isArray(block["content"]) ? block["content"] : null;
  const bodyText = block["body"] || block["reading"] || "";

  const Inner = items ? (
    <div className={`prose prose-invert max-w-none ${containerClassName}`}>
      <MathJax dynamic>
        {items.map((node, i) => {
          if ("text" in node) {
            return <div key={i} className="whitespace-pre-wrap">{node.text}</div>;
          }
          if ("inline-math" in node) {
            return <span key={i}>{`$${node["inline-math"]}$`}</span>;
          }
          if ("block-math" in node) {
            return <div key={i} className="my-4 text-center">{`$$${node["block-math"]}$$`}</div>;
          }
          return null;
        })}
      </MathJax>
    </div>
  ) : (
    <div className={`prose prose-invert max-w-none ${containerClassName}`}>
      <MathJax dynamic>
        <div className="whitespace-pre-wrap">{bodyText}</div>
      </MathJax>
    </div>
  );

  // Auto-scroll heuristic
  const shouldScroll =
    scrollMode === "always" ? true :
    scrollMode === "never"  ? false :
    !!scrollY;

  return (
    <MathJaxContext version={3} config={mjxConfig}>
      {/* Scale MathJax SVG to container width */}
      <style jsx global>{`.mjx-container svg { max-width: 100%; height: auto; }`}</style>

      <div className="mx-auto w-full" style={{ maxWidth }}>
        {shouldScroll ? (
          <div className="overflow-y-auto" style={{ maxHeight: scrollY }}>
            {Inner}
          </div>
        ) : (
          Inner
        )}
      </div>
    </MathJaxContext>
  );
}
