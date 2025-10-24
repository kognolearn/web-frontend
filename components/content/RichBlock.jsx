import React from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";

const mjxConfig = {
  loader: { load: ["input/tex", "output/svg"] },
  tex: { inlineMath: [["$", "$"], ["\\(", "\\)"]] },
  svg: { fontCache: "global" }
};

// helper: render \n inside text as <br>
function renderTextWithBreaks(text, keyPrefix) {
  return String(text).split("\n").map((seg, i) => (
    <React.Fragment key={`${keyPrefix}-${i}`}>
      {i > 0 && <br />}
      {seg}
    </React.Fragment>
  ));
}

export default function RichBlock({ block, maxWidth = 720 }) {
  if (!block) return null;
  const items = Array.isArray(block.content) ? block.content : [];

  // accumulate inline (text + inline-math) into a single paragraph,
  // flush when we hit a block-math
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
      inlineBuf.push(
        <MathJax inline dynamic key={`im-${i}`}>{` $${node["inline-math"]}$ `}</MathJax>
      );
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

  return (
    <MathJaxContext version={3} config={mjxConfig}>
      {/* scale MathJax SVG to container, no horizontal scroll */}
      <style jsx global>{`
        .mjx-container svg { max-width: 100%; height: auto; }
      `}</style>

      <div className="mx-auto w-full" style={{ maxWidth }}>
        <div className="prose prose-invert max-w-none">
          {out}
        </div>
      </div>
    </MathJaxContext>
  );
}
