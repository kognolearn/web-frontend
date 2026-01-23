"use client";

import React, { useEffect, useRef } from "react";
import MarkdownBlock from "./MarkdownBlock";

const getPaneContent = (pane, fallbackContent) => {
  if (typeof pane === "string") return { content: pane };
  if (pane && typeof pane === "object") {
    return {
      title: pane.title || pane.label || pane.heading || null,
      content:
        pane.content ||
        pane.body ||
        pane.markdown ||
        pane.text ||
        "",
    };
  }
  return { content: fallbackContent || "" };
};

/**
 * SideBySideCompare - Two-panel comparison view
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {string|Object} [props.left] - Left panel content
 * @param {string|Object} [props.right] - Right panel content
 * @param {Array} [props.panels] - Optional [left, right] panels
 */
export default function SideBySideCompare({
  id,
  left,
  right,
  left_content,
  right_content,
  leftContent,
  rightContent,
  left_title,
  right_title,
  leftTitle,
  rightTitle,
  left_label,
  right_label,
  leftLabel,
  rightLabel,
  panels,
  sync_scroll = true,
}) {
  const leftPane = getPaneContent(left ?? panels?.[0], left_content || leftContent);
  const rightPane = getPaneContent(right ?? panels?.[1], right_content || rightContent);
  const resolvedLeftTitle = left_title || leftTitle || left_label || leftLabel || leftPane.title;
  const resolvedRightTitle = right_title || rightTitle || right_label || rightLabel || rightPane.title;
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!sync_scroll) return undefined;
    const leftEl = leftRef.current;
    const rightEl = rightRef.current;
    if (!leftEl || !rightEl) return undefined;

    const syncScroll = (source, target) => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      target.scrollTop = source.scrollTop;
      target.scrollLeft = source.scrollLeft;
      requestAnimationFrame(() => {
        syncingRef.current = false;
      });
    };

    const handleLeft = () => syncScroll(leftEl, rightEl);
    const handleRight = () => syncScroll(rightEl, leftEl);

    leftEl.addEventListener("scroll", handleLeft);
    rightEl.addEventListener("scroll", handleRight);

    return () => {
      leftEl.removeEventListener("scroll", handleLeft);
      rightEl.removeEventListener("scroll", handleRight);
    };
  }, [sync_scroll]);

  if (!leftPane.content && !rightPane.content) {
    return (
      <div
        id={id}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-center"
      >
        <p className="text-sm text-[var(--muted-foreground)]">
          No comparison content provided
        </p>
      </div>
    );
  }

  return (
    <div id={id} className="v2-side-by-side-compare grid gap-4 md:grid-cols-2">
      <div
        ref={leftRef}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 max-h-[60vh] overflow-auto"
      >
        {resolvedLeftTitle && (
          <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
            {resolvedLeftTitle}
          </h3>
        )}
        {leftPane.content ? (
          <MarkdownBlock content={leftPane.content} />
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">
            No content provided.
          </p>
        )}
      </div>
      <div
        ref={rightRef}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 max-h-[60vh] overflow-auto"
      >
        {resolvedRightTitle && (
          <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
            {resolvedRightTitle}
          </h3>
        )}
        {rightPane.content ? (
          <MarkdownBlock content={rightPane.content} />
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">
            No content provided.
          </p>
        )}
      </div>
    </div>
  );
}
