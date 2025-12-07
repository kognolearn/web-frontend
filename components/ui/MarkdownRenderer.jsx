"use client";

import React, { useMemo } from "react";
import { MathJax } from "better-react-mathjax";

/**
 * Parse content string into structured blocks for rendering
 * Handles: headings, paragraphs, lists, code blocks, math, blockquotes, tables
 */
function parseContent(content) {
  if (!content) return [];
  
  // Normalize line endings
  let normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Normalize double-escaped backslashes from JSON
  normalizedContent = normalizedContent
    .replace(/\\\\(\(|\))/g, '\\$1')
    .replace(/\\\\(\[|\])/g, '\\$1');

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
        nextTrimmed.startsWith("\\[")
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
      
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      const italicMatch = remaining.match(/_([^_]+)_/);
      const codeMatch = remaining.match(/`([^`]+)`/);
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
      const brMatch = remaining.match(/<br\s*\/?>/i);
      
      const matches = [
        mathMatch && { type: "math", match: mathMatch, idx: mathMatch.index },
        boldMatch && { type: "bold", match: boldMatch, idx: boldMatch.index },
        italicMatch && { type: "italic", match: italicMatch, idx: italicMatch.index },
        codeMatch && { type: "code", match: codeMatch, idx: codeMatch.index },
        linkMatch && { type: "link", match: linkMatch, idx: linkMatch.index },
        brMatch && { type: "br", match: brMatch, idx: brMatch.index },
      ].filter(Boolean);
      
      if (matches.length === 0) {
        result.push({ type: "text", content: remaining, key: key++ });
        break;
      }
      
      const earliest = matches.reduce((a, b) => (a.idx < b.idx ? a : b));
      
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
            return <MathJax key={part.key} inline>{part.content}</MathJax>;
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
          default:
            return null;
        }
      })}
    </>
  );
}

export default function MarkdownRenderer({ content, className = "" }) {
  const blocks = useMemo(() => parseContent(content), [content]);

  return (
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
            
          default:
            return null;
        }
      })}
    </div>
  );
}
