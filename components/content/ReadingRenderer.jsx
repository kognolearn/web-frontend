"use client";

import React, { useMemo, useState, useCallback } from "react";
import { MathJax } from "better-react-mathjax";

/**
 * Parse content string into structured blocks for rendering
 * Handles: headings, paragraphs, lists, code blocks, math, questions, emphasis
 */
function parseContent(content) {
  if (!content) return [];
  
  const blocks = [];
  const lines = content.split("\n");
  let i = 0;
  
  // Helper to consume lines for multi-line blocks
  const consumeUntil = (startIdx, endCondition) => {
    const collected = [];
    let j = startIdx;
    while (j < lines.length && !endCondition(lines[j], j)) {
      collected.push(lines[j]);
      j++;
    }
    return { collected, endIdx: j };
  };
  
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Empty line
    if (!trimmed) {
      i++;
      continue;
    }
    
    // Question block (starts with "Question:" or "**Question:**")
    if (/^(\*\*)?Question:?\*?\*?/i.test(trimmed)) {
      const questionBlock = parseQuestionBlock(lines, i);
      if (questionBlock) {
        blocks.push(questionBlock);
        i = questionBlock.endIdx;
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
    
    // Bold headings (like **The Binary System (Base 2)**)
    const boldHeadingMatch = trimmed.match(/^\*\*([^*]+)\*\*$/);
    if (boldHeadingMatch && !trimmed.includes(":")) {
      blocks.push({
        type: "heading",
        level: 3,
        content: boldHeadingMatch[1],
      });
      i++;
      continue;
    }
    
    // Blockquote / Callout (starts with >)
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
    
    // Table (starts with |)
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableRows = [];
      let hasHeader = false;
      while (i < lines.length) {
        const currentLine = lines[i].trim();
        if (currentLine.startsWith("|") && currentLine.endsWith("|")) {
          // Check if it's a separator row (|---|---|)
          if (/^\|[\s-:|]+\|$/.test(currentLine)) {
            hasHeader = tableRows.length > 0;
            i++;
            continue;
          }
          // Parse cells
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
    
    // Block math ($$...$$)
    if (trimmed.startsWith("$$")) {
      if (trimmed.endsWith("$$") && trimmed.length > 4) {
        // Single line block math
        blocks.push({
          type: "block-math",
          content: trimmed.slice(2, -2).trim(),
        });
        i++;
        continue;
      } else {
        // Multi-line block math
        const { collected, endIdx } = consumeUntil(i + 1, (l) => l.trim().endsWith("$$"));
        const mathContent = [trimmed.slice(2), ...collected];
        if (endIdx < lines.length) {
          const lastLine = lines[endIdx].trim();
          mathContent.push(lastLine.slice(0, -2));
        }
        blocks.push({
          type: "block-math",
          content: mathContent.join("\n").trim(),
        });
        i = endIdx + 1;
        continue;
      }
    }
    
    // Lists (unordered and ordered)
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
    
    // Details/Summary (collapsible)
    if (trimmed.startsWith("<details>") || trimmed === "▶") {
      // Skip HTML details for now, treat as paragraph
    }
    
    // Default: paragraph (may contain inline elements)
    // Collect consecutive non-empty, non-special lines
    const paragraphLines = [line];
    i++;
    while (i < lines.length) {
      const nextLine = lines[i];
      const nextTrimmed = nextLine.trim();
      // Stop on empty line, heading, list, code, etc.
      if (
        !nextTrimmed ||
        /^#{1,6}\s/.test(nextTrimmed) ||
        /^[-*]\s+/.test(nextTrimmed) ||
        /^\d+\.\s+/.test(nextTrimmed) ||
        nextTrimmed.startsWith("```") ||
        nextTrimmed.startsWith("$$") ||
        /^(\*\*)?Question:?\*?\*?/i.test(nextTrimmed)
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
 * Parse a question block with options and answer reveal
 */
function parseQuestionBlock(lines, startIdx) {
  const firstLine = lines[startIdx];
  let questionText = firstLine.replace(/^(\*\*)?Question:?\*?\*?\s*/i, "").trim();
  
  let i = startIdx + 1;
  const options = [];
  let correctIndex = -1;
  let explanation = "";
  
  // Collect question text until we hit options
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }
    // Check for option pattern: "A.", "A)", "- A.", "* A.", etc.
    if (/^[-*]?\s*[A-D][.)]\s+/i.test(line)) {
      break;
    }
    questionText += " " + line;
    i++;
  }
  
  // Collect options - handle both "A. text" and "- A. text" formats
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }
    // Match options with optional bullet prefix: "- A. text", "* A. text", "A. text", "A) text"
    const optionMatch = line.match(/^[-*]?\s*([A-D])[.)]\s+(.+)$/i);
    if (optionMatch) {
      options.push({
        label: optionMatch[1].toUpperCase(),
        text: optionMatch[2],
      });
      i++;
    } else if (/^<details>|^<summary>|Show Answer/i.test(line)) {
      // Skip show answer markers, continue to find answer
      i++;
    } else if (/^<\/details>|^<\/summary>/i.test(line)) {
      i++;
    } else if (/^Answer:/i.test(line)) {
      // Found answer line - extract it
      const answerLineMatch = line.match(/^Answer:\s*([A-D])/i);
      if (answerLineMatch) {
        const letter = answerLineMatch[1].toUpperCase();
        correctIndex = options.findIndex(o => o.label === letter);
      }
      // Also extract explanation if present
      const explMatch = line.match(/\*?Explanation:\*?\s*(.+)$/i);
      if (explMatch) {
        explanation = explMatch[1];
      }
      i++;
      break;
    } else {
      break;
    }
  }
  
  // If we haven't found the answer yet, look for it in nearby lines
  if (correctIndex === -1) {
    let searchLimit = Math.min(i + 10, lines.length);
    while (i < searchLimit) {
      const line = lines[i].trim();
      if (!line || /^<\/?details>|^<\/?summary>/i.test(line)) {
        i++;
        continue;
      }
      // Check for answer pattern
      const answerMatch = line.match(/^Answer:\s*([A-D])/i) || line.match(/(?:correct|answer)[:\s]+([A-D])/i);
      if (answerMatch) {
        const letter = answerMatch[1].toUpperCase();
        correctIndex = options.findIndex(o => o.label === letter);
        // Extract explanation if present
        const explMatch = line.match(/\*?Explanation:\*?\s*(.+)$/i);
        if (explMatch) {
          explanation = explMatch[1];
        }
        i++;
        break;
      }
      // Stop if we hit new content
      if (/^#{1,6}\s|^\*\*[^*]+\*\*$|^Question:/i.test(line)) {
        break;
      }
      i++;
    }
  }
  
  if (options.length === 0) {
    return null;
  }
  
  return {
    type: "question",
    question: questionText.trim(),
    options,
    correctIndex,
    explanation,
    endIdx: i,
  };
}

/**
 * Renders inline content with math, bold, italic, code, and links
 */
function InlineContent({ text }) {
  const parts = useMemo(() => {
    if (!text) return [];
    
    const result = [];
    let remaining = text;
    let key = 0;
    
    // Process inline elements
    while (remaining.length > 0) {
      // Inline math $...$
      const mathMatch = remaining.match(/\$([^$]+)\$/);
      // Bold **...**
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      // Italic _..._ (using underscore to avoid conflicts with math asterisks)
      const italicMatch = remaining.match(/_([^_]+)_/);
      // Inline code `...`
      const codeMatch = remaining.match(/`([^`]+)`/);
      // Links [text](url)
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
      
      // Find earliest match
      const matches = [
        mathMatch && { type: "math", match: mathMatch, idx: mathMatch.index },
        boldMatch && { type: "bold", match: boldMatch, idx: boldMatch.index },
        italicMatch && { type: "italic", match: italicMatch, idx: italicMatch.index },
        codeMatch && { type: "code", match: codeMatch, idx: codeMatch.index },
        linkMatch && { type: "link", match: linkMatch, idx: linkMatch.index },
      ].filter(Boolean);
      
      if (matches.length === 0) {
        result.push({ type: "text", content: remaining, key: key++ });
        break;
      }
      
      const earliest = matches.reduce((a, b) => (a.idx < b.idx ? a : b));
      
      // Add text before match
      if (earliest.idx > 0) {
        result.push({ type: "text", content: remaining.slice(0, earliest.idx), key: key++ });
      }
      
      // Add matched element
      const m = earliest.match;
      switch (earliest.type) {
        case "math":
          result.push({ type: "math", content: m[1], key: key++ });
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
            return <span key={part.key} className="inline-math">{`$${part.content}$`}</span>;
          case "bold":
            return <strong key={part.key} className="font-semibold">{part.content}</strong>;
          case "italic":
            return <em key={part.key}>{part.content}</em>;
          case "code":
            return (
              <code
                key={part.key}
                className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--primary)] font-mono text-[0.9em]"
              >
                {part.content}
              </code>
            );
          case "link":
            return (
              <a
                key={part.key}
                href={part.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--primary)] hover:text-[var(--primary-hover)] underline underline-offset-2"
              >
                {part.text}
              </a>
            );
          default:
            return null;
        }
      })}
    </>
  );
}

/**
 * Interactive question component with answer reveal
 */
function QuestionBlock({ question, options, correctIndex, explanation }) {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [revealed, setRevealed] = useState(false);
  
  const handleSelect = useCallback((idx) => {
    if (!revealed) {
      setSelectedIdx(idx);
    }
  }, [revealed]);
  
  const handleReveal = useCallback(() => {
    setRevealed(true);
  }, []);
  
  return (
    <div className="my-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
      {/* Question header */}
      <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-2)]/50">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs font-bold">
            ?
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Check Your Understanding
          </span>
        </div>
        <div className="text-[var(--foreground)] leading-relaxed">
          <MathJax dynamic>
            <InlineContent text={question} />
          </MathJax>
        </div>
      </div>
      
      {/* Options */}
      <div className="p-4 space-y-2">
        {options.map((option, idx) => {
          const isSelected = selectedIdx === idx;
          const isCorrect = correctIndex === idx;
          const showCorrect = revealed && isCorrect;
          const showIncorrect = revealed && isSelected && !isCorrect;
          
          let optionClass = "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ";
          
          if (showCorrect) {
            optionClass += "bg-emerald-500/10 border-emerald-400 ";
          } else if (showIncorrect) {
            optionClass += "bg-rose-500/10 border-rose-400 ";
          } else if (isSelected) {
            optionClass += "bg-[var(--primary)]/10 border-[var(--primary)] ";
          } else {
            optionClass += "bg-[var(--surface-1)] border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5 ";
          }
          
          let badgeClass = "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ";
          
          if (showCorrect) {
            badgeClass += "bg-emerald-400 text-white ";
          } else if (showIncorrect) {
            badgeClass += "bg-rose-400 text-white ";
          } else if (isSelected) {
            badgeClass += "bg-[var(--primary)] text-white ";
          } else {
            badgeClass += "bg-[var(--surface-2)] text-[var(--muted-foreground)] ";
          }
          
          return (
            <div
              key={idx}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              className={optionClass}
              onClick={() => handleSelect(idx)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(idx);
                }
              }}
            >
              <div className={badgeClass}>{option.label}</div>
              <div className="flex-1 pt-0.5 text-[var(--foreground)]">
                <MathJax dynamic>
                  <InlineContent text={option.text} />
                </MathJax>
              </div>
              {showCorrect && (
                <span className="text-xs font-semibold text-emerald-400 uppercase">Correct</span>
              )}
              {showIncorrect && (
                <span className="text-xs font-semibold text-rose-400 uppercase">Incorrect</span>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Reveal button */}
      {!revealed && selectedIdx !== null && (
        <div className="px-4 pb-4">
          <button
            onClick={handleReveal}
            className="w-full py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold text-sm hover:bg-[var(--primary-hover)] transition-colors"
          >
            Check Answer
          </button>
        </div>
      )}
      
      {/* Answer explanation */}
      {revealed && correctIndex >= 0 && (
        <div className="px-4 pb-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/30">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-semibold text-emerald-400">
                Correct Answer: {options[correctIndex]?.label}
              </span>
            </div>
            {explanation && (
              <p className="mt-2 text-sm text-[var(--foreground)] leading-relaxed">
                <MathJax dynamic>
                  <InlineContent text={explanation} />
                </MathJax>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Main ReadingRenderer component
 */
export default function ReadingRenderer({ content }) {
  const blocks = useMemo(() => parseContent(content), [content]);
  
  return (
    <>
      <article className="reading-content max-w-none">
        <MathJax dynamic>
          {blocks.map((block, idx) => {
            switch (block.type) {
              case "heading":
                const HeadingTag = `h${Math.min(block.level, 6)}`;
                const headingClasses = {
                  1: "text-2xl sm:text-3xl font-bold mt-8 mb-4 text-[var(--foreground)]",
                  2: "text-xl sm:text-2xl font-bold mt-8 mb-4 text-[var(--foreground)]",
                  3: "text-lg sm:text-xl font-semibold mt-6 mb-3 text-[var(--foreground)]",
                  4: "text-base sm:text-lg font-semibold mt-5 mb-2 text-[var(--foreground)]",
                  5: "text-base font-medium mt-4 mb-2 text-[var(--foreground)]",
                  6: "text-sm font-medium mt-4 mb-2 text-[var(--muted-foreground)]",
                };
                return (
                  <HeadingTag key={idx} className={headingClasses[block.level] || headingClasses[3]}>
                    <InlineContent text={block.content} />
                  </HeadingTag>
                );
                
              case "paragraph":
                return (
                  <p key={idx} className="my-4 leading-7 text-[var(--foreground)]">
                    <InlineContent text={block.content} />
                  </p>
                );
                
              case "block-math":
                return (
                  <div key={idx} className="my-6 py-4 px-4 rounded-xl bg-[var(--surface-2)]/50 overflow-x-auto">
                    <div className="text-center text-lg">{`$$${block.content}$$`}</div>
                  </div>
                );
                
              case "list":
                const ListTag = block.ordered ? "ol" : "ul";
                const listClass = block.ordered
                  ? "my-4 pl-6 list-decimal space-y-2"
                  : "my-4 pl-6 list-disc space-y-2";
                return (
                  <ListTag key={idx} className={listClass}>
                    {block.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="text-[var(--foreground)] leading-relaxed pl-1">
                        <InlineContent text={item} />
                      </li>
                    ))}
                  </ListTag>
                );
              
              case "blockquote":
                return (
                  <blockquote 
                    key={idx} 
                    className="my-6 pl-4 border-l-4 border-[var(--primary)]/50 bg-[var(--primary)]/5 py-3 pr-4 rounded-r-lg"
                  >
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 mt-0.5 text-[var(--primary)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-[var(--foreground)] leading-relaxed">
                        <InlineContent text={block.content} />
                      </p>
                    </div>
                  </blockquote>
                );
              
              case "table":
                return (
                  <div key={idx} className="my-6 overflow-x-auto rounded-xl border border-[var(--border)]">
                    <table className="w-full border-collapse">
                      {block.hasHeader && block.rows.length > 0 && (
                        <thead>
                          <tr className="bg-[var(--surface-2)]">
                            {block.rows[0].map((cell, cellIdx) => (
                              <th 
                                key={cellIdx} 
                                className="px-4 py-3 text-left text-sm font-semibold text-[var(--foreground)] border-b border-[var(--border)]"
                              >
                                <InlineContent text={cell} />
                              </th>
                            ))}
                          </tr>
                        </thead>
                      )}
                      <tbody>
                        {(block.hasHeader ? block.rows.slice(1) : block.rows).map((row, rowIdx) => (
                          <tr 
                            key={rowIdx} 
                            className={rowIdx % 2 === 0 ? "bg-[var(--surface-1)]" : "bg-[var(--surface-2)]/30"}
                          >
                            {row.map((cell, cellIdx) => (
                              <td 
                                key={cellIdx} 
                                className="px-4 py-3 text-sm text-[var(--foreground)] border-b border-[var(--border)]/50"
                              >
                                <InlineContent text={cell} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
                
              case "code":
                return (
                  <div key={idx} className="my-6 rounded-xl overflow-hidden border border-[var(--border)]">
                    {block.language && (
                      <div className="px-4 py-2 bg-[var(--surface-2)] border-b border-[var(--border)] text-xs font-mono text-[var(--muted-foreground)]">
                        {block.language}
                      </div>
                    )}
                    <pre className="p-4 bg-[var(--surface-1)] overflow-x-auto">
                      <code className="text-sm font-mono text-[var(--foreground)]">
                        {block.content}
                      </code>
                    </pre>
                  </div>
                );
                
              case "question":
                return (
                  <QuestionBlock
                    key={idx}
                    question={block.question}
                    options={block.options}
                    correctIndex={block.correctIndex}
                    explanation={block.explanation}
                  />
                );
                
              case "hr":
                return (
                  <hr key={idx} className="my-8 border-t border-[var(--border)]" />
                );
                
              default:
                return null;
            }
          })}
        </MathJax>
      </article>
      
      <style jsx global>{`
        .reading-content {
          font-size: 1.05rem;
          line-height: 1.75;
        }
        
        .reading-content .inline-math {
          font-size: 1em;
        }
        
        .reading-content .mjx-container {
          display: inline-block;
          margin: 0;
        }
        
        .reading-content .mjx-container svg {
          max-width: 100%;
          height: auto;
        }
        
        .reading-content p + p {
          margin-top: 1.25rem;
        }
        
        /* Better spacing for headings following paragraphs */
        .reading-content p + h2,
        .reading-content p + h3,
        .reading-content p + h4 {
          margin-top: 2rem;
        }
        
        /* Ensure math blocks don't overflow */
        .reading-content [class*="block-math"] .mjx-container {
          display: block;
          overflow-x: auto;
          padding: 0.5rem 0;
        }
      `}</style>
    </>
  );
}
