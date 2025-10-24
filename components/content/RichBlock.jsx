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
 * - block: { content: [ {text?:string} | {"inline-math"?:string} | {"block-math"?:string} ] }
 * - maxWidth?: number | string (default 720)
 * - scrollY?: string (e.g., "10rem" or "240px") => wraps inner content in a vertical scroll container
 * - containerClassName?: string (optional)
 */
export default function RichBlock({ block, maxWidth = 720, scrollY, containerClassName = "" }) {
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
      inlineBuf.push(renderTextWithBreaks(node["text"], `t-${i}`));
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

  const Inner = (
    <div className={`prose prose-invert max-w-none ${containerClassName}`}>{out}</div>
  );

  return (
    <MathJaxContext version={3} config={mjxConfig}>
      {/* make MathJax SVG scale with container width */}
      <style jsx global>{`.mjx-container svg { max-width: 100%; height: auto; }`}</style>

      <div className="mx-auto w-full" style={{ maxWidth }}>
        {scrollY ? (
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
