// components/RichBlock.jsx
import React from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";

const mjxConfig = {
  loader: { load: ["input/tex", "output/svg"] },
  tex: { inlineMath: [["$", "$"], ["\\(", "\\)"]] },
  svg: { fontCache: "global" }
};

// helper: render \n inside text as <br>
function renderTextWithBreaks(text, keyPrefix) {
  return String(text ?? "").split("\n").map((seg, i) => (
    <React.Fragment key={`${keyPrefix}-${i}`}>
      {i > 0 && <br />}
      {seg}
    </React.Fragment>
  ));
}

/**
 * Props:
 * - block: { content: [ {"text"?:string} | {"inline-math"?:string} | {"block-math"?:string} ] }
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
  const items = Array.isArray(block.content) ? block.content : [];

  // gather inline into a single paragraph; flush on block-math
  const out = [];
  let inlineBuf = [];
  const flushInline = (idxTag) => {
    if (inlineBuf.length) {
      out.push(
        <p key={`p-${idxTag}`} className="break-words whitespace-pre-wrap">
          {inlineBuf}
        </p>
      );
      inlineBuf = [];
    }
  };

  items.forEach((node, i) => {
    if ("text" in node) {
      inlineBuf.push(renderTextWithBreaks(node.text, `t-${i}`));
      return;
    }
    if ("inline-math" in node) {
      inlineBuf.push(<MathJax inline dynamic key={`im-${i}`}>{`$${node["inline-math"]}$`}</MathJax>);
      return;
    }
    if ("block-math" in node) {
      flushInline(i);
      out.push(
        <div key={`bm-${i}`} className="my-4 text-center">
          <MathJax dynamic>{`$$${node["block-math"]}$$`}</MathJax>
        </div>
      );
    }
  });
  flushInline("end");

  // --- AUTO-SCROLL HEURISTIC ---
  // Scroll only when content is likely tall:
  //  - multiple block equations, or
  //  - any newline present, or
  //  - long text overall
  //  - otherwise (e.g., single block equation) => no scroll
  const counts = items.reduce(
    (acc, n) => {
      if ("block-math" in n) acc.blocks += 1;
      if ("inline-math" in n) acc.inlines += 1;
      if ("text" in n) {
        acc.textChars += (n.text || "").length;
        acc.textNewlines += ((n.text || "").match(/\n/g) || []).length;
      }
      return acc;
    },
    { blocks: 0, inlines: 0, textChars: 0, textNewlines: 0 }
  );

  const autoNeedsScroll =
    counts.blocks >= 2 ||
    counts.textNewlines > 0 ||
    counts.textChars > 280 ||
    (counts.blocks === 1 && counts.textChars > 80); // single block + lots of text

  const shouldScroll =
    scrollMode === "always" ? true :
    scrollMode === "never"  ? false :
    // "auto"
    !!scrollY && autoNeedsScroll;

  const Inner = (
    <div className={`prose prose-invert max-w-none ${containerClassName}`}>{out}</div>
  );

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
