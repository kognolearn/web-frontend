// components/content/RichBlock.jsx
"use client";

import React from "react";
import { MathJax } from "better-react-mathjax";
import { normalizeLatex } from "@/utils/richText";

/**
 * Decodes HTML entities in text (e.g., &amp; -> &, &gt; -> >, &lt; -> <)
 */
function decodeHtmlEntities(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function wrapBareLatex(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  const hasLatexCommand = /\\[a-zA-Z]+/.test(trimmed);
  const hasDelimiters = /\$|\\\(|\\\[|\\begin\{/.test(trimmed);
  // Detect unescaped natural-language words (>=3 letters) to avoid wrapping full sentences
  const hasPlainWords = /(^|[^\\])[A-Za-z]{3,}/.test(trimmed);
  if (hasLatexCommand && !hasDelimiters && !hasPlainWords) {
    return `\\(${value}\\)`;
  }
  return value;
}

/**
 * Normalizes text by decoding HTML entities and then normalizing LaTeX
 */
function normalizeText(text) {
  return normalizeLatex(decodeHtmlEntities(text));
}

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
  const bodyText = wrapBareLatex(normalizeText(block["body"] || block["reading"] || ""));

  const Inner = items ? (
    <div className={`prose prose-invert max-w-none ${containerClassName}`}>
      <MathJax dynamic>
        {items.map((node, i) => {
          if ("text" in node) {
            const text = wrapBareLatex(normalizeText(node.text));
            return <div key={i} className="whitespace-pre-wrap">{text}</div>;
          }
          if ("inline-math" in node) {
            return <span key={i}>{`$${decodeHtmlEntities(node["inline-math"])}$`}</span>;
          }
          if ("block-math" in node) {
            return <div key={i} className="my-4 text-center">{`$$${decodeHtmlEntities(node["block-math"])}$$`}</div>;
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
    <>
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
    </>
  );
}
