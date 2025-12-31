"use client";

import React from "react";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";

/**
 * MarkdownBlock - Primary content delivery with LaTeX support
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {string} props.content - Markdown content with LaTeX ($inline$ or $$block$$)
 */
export default function MarkdownBlock({ id, content }) {
  if (!content) {
    return null;
  }

  return (
    <div id={id} className="v2-markdown-block prose prose-sm max-w-none dark:prose-invert">
      <MarkdownRenderer content={content} />
    </div>
  );
}
