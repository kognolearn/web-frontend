// components/RichBlock.jsx
import React from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";

const mjxConfig = {
  loader: { load: ["input/tex", "output/svg"] },
  tex: { inlineMath: [["$", "$"], ["\\(", "\\)"]] },
  svg: { fontCache: "global" }
};

// helper: render \n inside text as <br>
// helper: render inline markdown (bold/italic/code + line breaks)
function renderInlineSegments(text, keyPrefix) {
  const inlineRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const renderInline = (segment, segIdx) => {
    inlineRegex.lastIndex = 0;
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = inlineRegex.exec(segment))) {
      if (match.index > lastIndex) {
        parts.push(
          <React.Fragment key={`${keyPrefix}-txt-${segIdx}-${parts.length}`}>
            {segment.slice(lastIndex, match.index)}
          </React.Fragment>
        );
      }

      const token = match[0];
      const inner = token.slice(token.startsWith("**") ? 2 : 1, token.endsWith("**") ? -2 : -1);

      if (token.startsWith("**")) {
        parts.push(
          <strong key={`${keyPrefix}-strong-${segIdx}-${parts.length}`}>
            {inner}
          </strong>
        );
      } else if (token.startsWith("*")) {
        parts.push(
          <em key={`${keyPrefix}-em-${segIdx}-${parts.length}`}>
            {inner}
          </em>
        );
      } else {
        parts.push(
          <code key={`${keyPrefix}-code-${segIdx}-${parts.length}`}>
            {token.slice(1, -1)}
          </code>
        );
      }

      lastIndex = match.index + token.length;
    }

    if (lastIndex < segment.length) {
      parts.push(
        <React.Fragment key={`${keyPrefix}-tail-${segIdx}`}>
          {segment.slice(lastIndex)}
        </React.Fragment>
      );
    }

    return parts;
  };

  return String(text ?? "")
    .split("\n")
    .flatMap((line, lineIdx) => {
      const lineParts = renderInline(line, lineIdx);
      if (lineIdx === 0) return lineParts;
      return [<br key={`${keyPrefix}-br-${lineIdx}`} />, ...lineParts];
    });
}

// helper: render simple markdown blocks (headings, lists, paragraphs)
function renderBlockMarkdown(text, keyPrefix) {
  const lines = String(text ?? "").split("\n");
  const elements = [];
  let listBuffer = null; // { type: 'ul' | 'ol', items: React.ReactNode[], key: number }
  let listKey = 0;
  let paragraphLines = [];
  let paragraphKey = 0;

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    const paragraphText = paragraphLines.join("\n");
    elements.push(
      <p key={`${keyPrefix}-p-${paragraphKey++}`} className="break-words whitespace-pre-wrap">
        {renderInlineSegments(paragraphText, `${keyPrefix}-p-${paragraphKey}`)}
      </p>
    );
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listBuffer) return;
    const ListTag = listBuffer.type === "ul" ? "ul" : "ol";
    const className =
      listBuffer.type === "ul"
        ? "ml-6 list-disc space-y-1"
        : "ml-6 list-decimal space-y-1";

    elements.push(
      <ListTag key={`${keyPrefix}-${listBuffer.type}-${listKey++}`} className={className}>
        {listBuffer.items.map((item, idx) => (
          <li key={`${keyPrefix}-li-${listKey}-${idx}`} className="leading-relaxed">
            {item}
          </li>
        ))}
      </ListTag>
    );
    listBuffer = null;
  };

  const isListLine = (line) => /^\s*([-*+]\s+|\d+\.\s+)/.test(line);

  lines.forEach((line, idx) => {
    const headingMatch = line.match(/^\s*(#{1,6})\s+(.*)$/);
    const orderedMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
    const unorderedMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = Math.min(headingMatch[1].length, 6);
      const HeadingTag = `h${level}`;
      elements.push(
        <HeadingTag key={`${keyPrefix}-h-${idx}`} className="mt-6 first:mt-0">
          {renderInlineSegments(headingMatch[2], `${keyPrefix}-h-${idx}`)}
        </HeadingTag>
      );
      return;
    }

    if (orderedMatch) {
      flushParagraph();
      if (!listBuffer || listBuffer.type !== "ol") {
        flushList();
        listBuffer = { type: "ol", items: [] };
      }
      listBuffer.items.push(
        <span key={`${keyPrefix}-ol-item-${listBuffer.items.length}`} className="contents">
          {renderInlineSegments(orderedMatch[2], `${keyPrefix}-ol-${listBuffer.items.length}`)}
        </span>
      );
      return;
    }

    if (unorderedMatch) {
      flushParagraph();
      if (!listBuffer || listBuffer.type !== "ul") {
        flushList();
        listBuffer = { type: "ul", items: [] };
      }
      listBuffer.items.push(
        <span key={`${keyPrefix}-ul-item-${listBuffer.items.length}`} className="contents">
          {renderInlineSegments(unorderedMatch[1], `${keyPrefix}-ul-${listBuffer.items.length}`)}
        </span>
      );
      return;
    }

    if (isListLine(line)) {
      return; // safety, though regex above should catch
    }

    paragraphLines.push(line);
  });

  flushParagraph();
  flushList();

  return elements;
}

const blockyMarkdownPattern = /(^|\n)\s*(#{1,6}\s|[-*+]\s|\d+\.\s)/;

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
  const items = Array.isArray(block["content"]) ? block["content"] : [];

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
      const text = node["text"];
      if (blockyMarkdownPattern.test(String(text ?? ""))) {
        flushInline(i);
        out.push(
          <React.Fragment key={`md-${i}`}>
            {renderBlockMarkdown(text, `md-${i}`)}
          </React.Fragment>
        );
      } else {
        inlineBuf.push(...renderInlineSegments(text, `t-${i}`));
      }
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
