"use client";

import React, { useMemo } from "react";
import { MathJax } from "better-react-mathjax";
import TabGroup from "@/components/content/v2/components/display/TabGroup";
import { normalizeLatex } from "@/utils/richText";

/**
 * Parse content string into structured blocks for rendering
 * Handles: headings, paragraphs, lists, code blocks, math, blockquotes, tables
 */
function parseImageBlock(lines, startIdx) {
  let i = startIdx + 1;
  const fields = {};

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }
    if (/^:::/i.test(line)) {
      i++;
      break;
    }

    const match = line.match(/^([a-zA-Z_]+)\s*:\s*(.+)$/);
    if (match) {
      fields[match[1].toLowerCase()] = match[2].trim();
    }
    i++;
  }

  if (!fields.url) {
    return null;
  }

  return {
    type: "image",
    url: fields.url,
    fullUrl: fields.full_url || fields.fullurl,
    caption: fields.caption || "",
    alt: fields.alt || "",
    author: fields.author || "",
    license: fields.license || "",
    endIdx: i,
  };
}

/**
 * Parse a TeX block in the format:
 * :::tex
 * LaTeX content
 * :::
 */
function parseTexBlock(lines, startIdx) {
  const startLine = lines[startIdx].trim();
  const match = startLine.match(/^:::\s*tex\b(.*)$/i);
  const inlineContent = match?.[1]?.trim();
  const contentLines = [];
  let i = startIdx + 1;

  if (inlineContent) {
    contentLines.push(inlineContent);
  }

  while (i < lines.length) {
    const line = lines[i];
    if (/^:::\s*$/.test(line.trim())) {
      i++;
      break;
    }
    contentLines.push(line);
    i++;
  }

  let content = contentLines.join("\n").trim();
  if (/^\$\$[\s\S]*\$\$$/.test(content)) {
    content = content.slice(2, -2).trim();
  } else if (/^\\\[[\s\S]*\\\]$/.test(content)) {
    content = content.slice(2, -2).trim();
  } else if (/^\\\([\s\S]*\\\)$/.test(content)) {
    content = content.slice(2, -2).trim();
  }

  return {
    type: "block-math",
    content,
    endIdx: i,
  };
}

/**
 * Parse a tab group in the format:
 * :::tabs
 * :::tab{label="Tab 1"}
 * Tab 1 content
 * :::tab{label="Tab 2"}
 * Tab 2 content
 * :::
 */
function parseTabGroup(lines, startIdx) {
  let i = startIdx + 1;
  const tabs = [];
  let currentTab = null;
  let currentContent = [];

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    const sanitized = trimmed.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // Allow nested :::tex blocks inside tab content
    if (/^:::\s*tex\b/i.test(sanitized)) {
      const texLines = [line];
      i++;
      while (i < lines.length) {
        const texLine = lines[i];
        texLines.push(texLine);
        if (/^:::\s*$/.test(texLine.trim())) {
          i++;
          break;
        }
        i++;
      }
      if (currentTab) {
        currentContent.push(...texLines);
      }
      continue;
    }

    // Check if this is a potential end marker (standalone :::)
    if (/^:::$/.test(sanitized) || (/^:::/.test(sanitized) && !/^:::\s*tab/i.test(sanitized))) {
      // Look ahead to see if there's another tab following
      let nextNonEmptyIdx = i + 1;
      while (nextNonEmptyIdx < lines.length && lines[nextNonEmptyIdx].trim() === '') {
        nextNonEmptyIdx++;
      }
      const nextLine = nextNonEmptyIdx < lines.length ? lines[nextNonEmptyIdx].trim().replace(/[\u200B-\u200D\uFEFF]/g, '') : '';
      const nextIsTab = /^:::\s*tab/i.test(nextLine);

      if (nextIsTab) {
        // This ::: just closes the current tab, not the entire group
        // Save current tab if we have one, then continue to let the next iteration handle the new tab
        if (currentTab) {
          tabs.push({
            ...currentTab,
            content: currentContent.join("\n").trim(),
          });
          currentTab = null;
          currentContent = [];
        }
        i++;
        continue;
      }

      // End of entire tab group
      if (currentTab) {
        tabs.push({
          ...currentTab,
          content: currentContent.join("\n").trim(),
        });
      }
      i++;

      // If the next non-empty line is also a standalone :::, consume it too
      // (this handles the case where each tab has its own ::: closer AND there's a final ::: for the container)
      while (i < lines.length) {
        const checkLine = lines[i].trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
        if (checkLine === '') {
          i++;
          continue;
        }
        if (/^:::$/.test(checkLine)) {
          i++;
        }
        break;
      }
      break;
    }

    const tabMatch = sanitized.match(/^:::\s*tab\s*\{([^}]*)\}/i);
    if (tabMatch) {
      if (currentTab) {
        tabs.push({
          ...currentTab,
          content: currentContent.join("\n").trim(),
        });
      }
      const labelMatch = tabMatch[1].match(/label\s*=\s*["']([^"']+)["']/i);
      currentTab = {
        id: `tab-${tabs.length}`,
        label: labelMatch?.[1] || `Tab ${tabs.length + 1}`,
      };
      currentContent = [];
      i++;
      continue;
    }

    if (currentTab) {
      currentContent.push(line);
    }
    i++;
  }

  if (tabs.length === 0) {
    return null;
  }

  return {
    type: "tab_group",
    tabs,
    endIdx: i,
  };
}

function parseContent(content) {
  if (!content) return [];

  // Normalize line endings
  let normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Strip zero-width/invisible chars that can break directive parsing
  normalizedContent = normalizedContent.replace(/[\u200B-\u200D\uFEFF]/g, '');

  const lines = normalizedContent.split('\n');
  const blocks = [];
  let i = 0;
  
  // Helper to consume lines until a condition is met
  const consumeUntil = (startIdx, condition) => {
    const collected = [];
    let currentIdx = startIdx;
    while (currentIdx < lines.length) {
      const line = lines[currentIdx];
      if (condition(line)) {
        return { collected, endIdx: currentIdx };
      }
      collected.push(line);
      currentIdx++;
    }
    return { collected, endIdx: currentIdx };
  };
  
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed) {
      i++;
      continue;
    }

    if (/^:::\s*image/i.test(trimmed)) {
      const imageBlock = parseImageBlock(lines, i);
      if (imageBlock) {
        blocks.push(imageBlock);
        i = imageBlock.endIdx;
        continue;
      }
    }

    if (/^:::\s*tex\b/i.test(trimmed)) {
      const texBlock = parseTexBlock(lines, i);
      if (texBlock) {
        blocks.push(texBlock);
        i = texBlock.endIdx;
        continue;
      }
    }

    if (/^:::\s*tabs/i.test(trimmed)) {
      const tabGroup = parseTabGroup(lines, i);
      if (tabGroup) {
        blocks.push(tabGroup);
        i = tabGroup.endIdx;
        continue;
      }
    }
    
    // Headings
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        content: headingMatch[2],
      });
      i++;
      continue;
    }
    
    // Blockquote
    if (trimmed.startsWith(">")) {
      const quoteLines = [];
      while (i < lines.length) {
        const currentLine = lines[i].trim();
        if (currentLine.startsWith(">")) {
          quoteLines.push(currentLine.slice(1).trim());
          i++;
        } else if (currentLine === "") {
          i++;
          break;
        } else {
          break;
        }
      }
      blocks.push({
        type: "blockquote",
        content: quoteLines.join(" "),
      });
      continue;
    }
    
    // Table
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableRows = [];
      let hasHeader = false;
      while (i < lines.length) {
        const currentLine = lines[i].trim();
        if (currentLine.startsWith("|") && currentLine.endsWith("|")) {
          if (/^\|[\s-:|]+\|$/.test(currentLine)) {
            hasHeader = tableRows.length > 0;
            i++;
            continue;
          }
          const cells = currentLine.slice(1, -1).split("|").map(c => c.trim());
          tableRows.push(cells);
          i++;
        } else {
          break;
        }
      }
      if (tableRows.length > 0) {
        blocks.push({
          type: "table",
          hasHeader,
          rows: tableRows,
        });
      }
      continue;
    }
    
    // Code blocks
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const { collected, endIdx } = consumeUntil(i + 1, (l) => l.trim().startsWith("```"));
      blocks.push({
        type: "code",
        language: lang,
        content: collected.join("\n"),
      });
      i = endIdx + 1;
      continue;
    }
    
    // Block math ($$...$$ or \[...\])
    const isDollarBlock = trimmed.startsWith("$$");
    const isBracketBlock = trimmed.startsWith("\\[");
    
    if (isDollarBlock || isBracketBlock) {
      const startMarker = isDollarBlock ? "$$" : "\\[";
      const endMarker = isDollarBlock ? "$$" : "\\]";
      const sliceStart = 2;
      const sliceEnd = -2;

      if (trimmed.endsWith(endMarker) && trimmed.length > 4) {
        blocks.push({
          type: "block-math",
          content: trimmed.slice(sliceStart, sliceEnd).trim(),
        });
        i++;
        continue;
      } else {
        const { collected, endIdx } = consumeUntil(i + 1, (l) => l.trim().endsWith(endMarker));
        const mathContent = [trimmed.slice(sliceStart), ...collected];
        if (endIdx < lines.length) {
          const lastLine = lines[endIdx].trim();
          mathContent.push(lastLine.slice(0, sliceEnd));
        }
        blocks.push({
          type: "block-math",
          content: mathContent.join("\n").trim(),
        });
        i = endIdx + 1;
        continue;
      }
    }
    
    // Lists
    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const isOrdered = /^\d+\./.test(trimmed);
      const listItems = [];
      while (i < lines.length) {
        const currentLine = lines[i].trim();
        const itemMatch = isOrdered 
          ? currentLine.match(/^\d+\.\s+(.+)$/)
          : currentLine.match(/^[-*]\s+(.+)$/);
        if (itemMatch) {
          listItems.push(itemMatch[1]);
          i++;
        } else if (currentLine === "") {
          i++;
          break;
        } else {
          break;
        }
      }
      blocks.push({
        type: "list",
        ordered: isOrdered,
        items: listItems,
      });
      continue;
    }
    
    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }
    
    // Paragraph
    const paragraphLines = [line];
    i++;
    while (i < lines.length) {
      const nextLine = lines[i];
      const nextTrimmed = nextLine.trim();
      if (
        !nextTrimmed ||
        /^#{1,6}\s/.test(nextTrimmed) ||
        /^[-*]\s+/.test(nextTrimmed) ||
        /^\d+\.\s+/.test(nextTrimmed) ||
        nextTrimmed.startsWith("```") ||
        nextTrimmed.startsWith("$$") ||
        nextTrimmed.startsWith("\\[") ||
        nextTrimmed.startsWith(":::")
      ) {
        break;
      }
      paragraphLines.push(nextLine);
      i++;
    }
    
    blocks.push({
      type: "paragraph",
      content: paragraphLines.join(" "),
    });
  }
  
  return blocks;
}

/**
 * Renders inline content with math, bold, italic, code, and links
 */
function InlineContent({ text }) {
  const parts = useMemo(() => {
    if (!text) return [];
    
    const result = [];
    let remaining = text
      .replace(/\\(\(|\))/g, '\\$1')
      .replace(/\\(\[|\])/g, '\\$1');
    
    let key = 0;
    
    while (remaining.length > 0) {
      const mathDollar = remaining.match(/\$([^$]+)\$/);
      const mathParen = remaining.match(/\\\(([\s\S]*?)\\\)/);
      const mathMatch = (() => {
        if (mathDollar && mathParen) {
          return mathDollar.index < mathParen.index ? mathDollar : mathParen;
        }
        return mathDollar || mathParen || null;
      })();

      // Bold: **text** or __text__ - use non-greedy match to handle multiple bold sections
      const boldAsteriskMatch = remaining.match(/\*\*(.+?)\*\*/);
      const boldUnderscoreMatch = remaining.match(/__(.+?)__/);
      const boldMatch = (() => {
        if (boldAsteriskMatch && boldUnderscoreMatch) {
          return boldAsteriskMatch.index < boldUnderscoreMatch.index ? boldAsteriskMatch : boldUnderscoreMatch;
        }
        return boldAsteriskMatch || boldUnderscoreMatch || null;
      })();
      // Italic: *text* or _text_ - single asterisk or underscore, non-greedy
      // The italic match should not capture content that starts with another * (which would be bold)
      const italicAsteriskMatch = remaining.match(/\*([^*]+)\*/);
      const italicUnderscoreMatch = remaining.match(/_([^_]+)_/);
      const italicMatch = (() => {
        if (italicAsteriskMatch && italicUnderscoreMatch) {
          return italicAsteriskMatch.index < italicUnderscoreMatch.index ? italicAsteriskMatch : italicUnderscoreMatch;
        }
        return italicAsteriskMatch || italicUnderscoreMatch || null;
      })();
      const codeMatch = remaining.match(/`([^`]+)`/);
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
      const brMatch = remaining.match(/<br\s*\/?>/i);
      // Strikethrough: ~~text~~
      const strikethroughMatch = remaining.match(/~~(.+?)~~/);

      // Priority order: higher number = higher priority when at same index
      // Bold (** or __) should take precedence over italic (* or _)
      const matches = [
        mathMatch && { type: "math", match: mathMatch, idx: mathMatch.index, priority: 3 },
        boldMatch && { type: "bold", match: boldMatch, idx: boldMatch.index, priority: 2 },
        italicMatch && { type: "italic", match: italicMatch, idx: italicMatch.index, priority: 1 },
        codeMatch && { type: "code", match: codeMatch, idx: codeMatch.index, priority: 3 },
        linkMatch && { type: "link", match: linkMatch, idx: linkMatch.index, priority: 3 },
        brMatch && { type: "br", match: brMatch, idx: brMatch.index, priority: 3 },
        strikethroughMatch && { type: "strikethrough", match: strikethroughMatch, idx: strikethroughMatch.index, priority: 2 },
      ].filter(Boolean);

      if (matches.length === 0) {
        result.push({ type: "text", content: remaining, key: key++ });
        break;
      }

      // Pick earliest match; if tied, pick highest priority
      const earliest = matches.reduce((a, b) => {
        if (a.idx !== b.idx) return a.idx < b.idx ? a : b;
        return a.priority > b.priority ? a : b;
      });
      
      if (earliest.idx > 0) {
        result.push({ type: "text", content: remaining.slice(0, earliest.idx), key: key++ });
      }
      
      const m = earliest.match;
      switch (earliest.type) {
        case "math":
          result.push({ type: "math", content: m[0], key: key++ });
          break;
        case "bold":
          result.push({ type: "bold", content: m[1], key: key++ });
          break;
        case "italic":
          result.push({ type: "italic", content: m[1], key: key++ });
          break;
        case "code":
          result.push({ type: "code", content: m[1], key: key++ });
          break;
        case "link":
          result.push({ type: "link", text: m[1], url: m[2], key: key++ });
          break;
        case "br":
          result.push({ type: "br", key: key++ });
          break;
        case "strikethrough":
          result.push({ type: "strikethrough", content: m[1], key: key++ });
          break;
      }

      remaining = remaining.slice(earliest.idx + m[0].length);
    }
    
    return result;
  }, [text]);

  return (
    <>
      {parts.map((part) => {
        switch (part.type) {
          case "text":
            return <span key={part.key}>{part.content}</span>;
          case "math":
            // Output math text directly - parent MathJax wrapper will typeset it
            return <span key={part.key}>{part.content}</span>;
          case "bold":
            return <strong key={part.key} className="font-semibold text-[var(--foreground)]">{part.content}</strong>;
          case "italic":
            return <em key={part.key} className="italic">{part.content}</em>;
          case "code":
            return <code key={part.key} className="rounded bg-[var(--surface-2)] px-1 py-0.5 font-mono text-sm text-[var(--primary)]">{part.content}</code>;
          case "link":
            return (
              <a key={part.key} href={part.url} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">
                {part.text}
              </a>
            );
          case "br":
            return <br key={part.key} />;
          case "strikethrough":
            return <del key={part.key} className="line-through">{part.content}</del>;
          default:
            return null;
        }
      })}
    </>
  );
}

export default function MarkdownRenderer({ content, className = "" }) {
  // Normalize LaTeX first, then parse content
  const normalizedContent = useMemo(() => normalizeLatex(content), [content]);
  const blocks = useMemo(() => parseContent(normalizedContent), [normalizedContent]);

  return (
    <MathJax dynamic>
      <div className={`space-y-3 ${className}`}>
        {blocks.map((block, index) => {
          switch (block.type) {
          case "heading":
            const HeadingTag = `h${Math.min(block.level + 2, 6)}`; // Shift levels down for chat
            return (
              <HeadingTag key={index} className="font-bold text-[var(--foreground)] mt-4 mb-2">
                <InlineContent text={block.content} />
              </HeadingTag>
            );

          case "image":
            const credit = [block.author, block.license].filter(Boolean).join(" | ");
            const imageAlt = block.alt || block.caption || "Image";
            const imageElement = (
              <img
                src={block.url}
                alt={imageAlt}
                loading="lazy"
                className="w-full h-auto rounded-lg"
              />
            );
            return (
              <figure key={index} className="my-3">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
                  {block.fullUrl ? (
                    <a href={block.fullUrl} target="_blank" rel="noopener noreferrer">
                      {imageElement}
                    </a>
                  ) : (
                    imageElement
                  )}
                </div>
                {(block.caption || credit) && (
                  <figcaption className="mt-2 text-xs text-[var(--muted-foreground)] leading-relaxed">
                    {block.caption && <InlineContent text={block.caption} />}
                    {credit && (
                      <span className="block mt-1 text-[10px] text-[var(--muted-foreground)]">
                        {credit}
                      </span>
                    )}
                  </figcaption>
                )}
              </figure>
            );
            
          case "paragraph":
            return (
              <p key={index} className="leading-relaxed whitespace-pre-wrap">
                <InlineContent text={block.content} />
              </p>
            );
            
          case "list":
            const ListTag = block.ordered ? "ol" : "ul";
            return (
              <ListTag key={index} className={`pl-5 space-y-1 ${block.ordered ? "list-decimal" : "list-disc"}`}>
                {block.items.map((item, i) => (
                  <li key={i} className="pl-1">
                    <InlineContent text={item} />
                  </li>
                ))}
              </ListTag>
            );
            
          case "code":
            return (
              <div key={index} className="my-2 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
                {block.language && (
                  <div className="px-3 py-1 text-xs text-[var(--muted-foreground)] border-b border-[var(--border)] bg-[var(--surface-3)]">
                    {block.language}
                  </div>
                )}
                <pre className="overflow-x-auto p-3 text-sm font-mono">
                  <code>{block.content}</code>
                </pre>
              </div>
            );
            
          case "block-math":
            return (
              <div key={index} className="my-3 overflow-x-auto text-center">
                <MathJax>{`$$${block.content}$$`}</MathJax>
              </div>
            );
            
          case "blockquote":
            return (
              <blockquote key={index} className="border-l-4 border-[var(--primary)] pl-4 italic text-[var(--muted-foreground)] my-2">
                <InlineContent text={block.content} />
              </blockquote>
            );
            
          case "table":
            return (
              <div key={index} className="my-3 overflow-x-auto rounded-lg border border-[var(--border)]">
                <table className="w-full text-sm text-left">
                  {block.hasHeader && (
                    <thead className="bg-[var(--surface-2)] text-[var(--foreground)]">
                      <tr>
                        {block.rows[0].map((cell, i) => (
                          <th key={i} className="px-4 py-2 font-medium border-b border-[var(--border)]">
                            <InlineContent text={cell} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {block.rows.slice(block.hasHeader ? 1 : 0).map((row, i) => (
                      <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/50">
                        {row.map((cell, j) => (
                          <td key={j} className="px-4 py-2">
                            <InlineContent text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
            
          case "hr":
            return <hr key={index} className="my-4 border-[var(--border)]" />;

          case "tab_group":
            return (
              <TabGroup key={index} id={`tabs-${index}`} tabs={block.tabs} />
            );
            
          default:
            return null;
        }
      })}
      </div>
    </MathJax>
  );
}
