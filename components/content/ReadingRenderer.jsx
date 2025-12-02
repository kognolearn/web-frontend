"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import { MathJax } from "better-react-mathjax";
import { 
  markReadingQuestionAnswered, 
  setReadingTotalQuestions, 
  getReadingProgress 
} from "@/utils/lessonProgress";

/**
 * Seeded random number generator for consistent shuffling per question
 */
function seededRandom(seed) {
  let t = seed + 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

/**
 * Create a deterministic seed from a string
 */
function stringToSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Shuffle an array with a seeded random, returning the shuffled array and original index mapping
 */
function shuffleWithMapping(array, seed) {
  const indices = array.map((_, i) => i);
  const shuffledIndices = [...indices];
  
  for (let i = shuffledIndices.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
  }
  
  const shuffled = shuffledIndices.map(i => array[i]);
  const shuffledToOriginal = {};
  
  shuffledIndices.forEach((originalIdx, shuffledIdx) => {
    shuffledToOriginal[shuffledIdx] = originalIdx;
  });
  
  return { shuffled, shuffledToOriginal };
}

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
    
    // Question block (starts with "Question:" or "**Question:**" or "**Check Your Understanding**")
    if (/^(\*\*)?Question:?\*?\*?/i.test(trimmed) || /^\*\*Check Your Understanding\*\*/i.test(trimmed)) {
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
        /^(\*\*)?Question:?\*?\*?/i.test(nextTrimmed) ||
        /^\*\*Check Your Understanding\*\*/i.test(nextTrimmed)
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
 * Supports formats:
 * 1. "Question: ..." with options A., B., C., D.
 * 2. "**Check Your Understanding**" followed by question text and options
 */
function parseQuestionBlock(lines, startIdx) {
  const firstLine = lines[startIdx];
  let questionText = "";
  let i = startIdx;
  
  // Check if this is the "Check Your Understanding" format
  const isCheckFormat = /^\*\*Check Your Understanding\*\*/i.test(firstLine.trim());
  
  if (isCheckFormat) {
    // Skip the header line
    i++;
    // Skip empty lines after header
    while (i < lines.length && !lines[i].trim()) {
      i++;
    }
    // Collect question text until we hit options
    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) {
        i++;
        continue;
      }
      // Check for option pattern: "- A.", "- A. A.", etc.
      if (/^[-*]\s*[A-D][.)]/i.test(line)) {
        break;
      }
      questionText += (questionText ? " " : "") + line;
      i++;
    }
  } else {
    // Original "Question:" format
    questionText = firstLine.replace(/^(\*\*)?Question:?\*?\*?\s*/i, "").trim();
    i = startIdx + 1;
    
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
  }
  
  const options = [];
  let correctIndex = -1;
  let explanation = "";
  
  // Collect options - format: "- A. Option text" or "A. Option text"
  // Single letter only (no duplicate like "- A. A.")
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }
    // Match options: "- A. text", "A. text", "A) text", "* A. text"
    // Single letter format only: "- A. Option text here"
    const optionMatch = line.match(/^[-*]?\s*([A-D])[.)]\s+(.+)$/i);
    
    if (optionMatch) {
      options.push({
        label: optionMatch[1].toUpperCase(),
        text: optionMatch[2],
      });
      i++;
    } else if (/^<details>|^<summary>|Show Answer/i.test(line)) {
      // Inside details block - continue to find answer
      i++;
    } else if (/^<\/details>|^<\/summary>/i.test(line)) {
      i++;
    } else if (/^\*?\*?Answer:?\*?\*?/i.test(line)) {
      // Found answer line - format: "**Answer:** B. *Explanation:* text"
      // Extract the answer letter
      const answerMatch = line.match(/\*?\*?Answer:?\*?\*?\s*([A-D])/i);
      if (answerMatch) {
        const letter = answerMatch[1].toUpperCase();
        correctIndex = options.findIndex(o => o.label === letter);
      }
      
      // Extract explanation - format: "*Explanation:* text" or "Explanation: text"
      const explMatch = line.match(/\*?Explanation:?\*?\s*(.+)$/i);
      if (explMatch) {
        explanation = explMatch[1].trim();
      }
      i++;
    } else if (line.startsWith("---") || /^#{1,6}\s/.test(line) || /^(\*\*)?Question:?\*?\*?/i.test(line) || /^\*\*Check Your Understanding\*\*/i.test(line)) {
      // Hit new section, stop parsing
      break;
    } else {
      // Continue looking for answer in subsequent lines
      i++;
    }
  }
  
  // If we still haven't found the answer, do a broader search
  if (correctIndex === -1 && options.length > 0) {
    let searchStart = startIdx;
    let searchLimit = Math.min(startIdx + 30, lines.length);
    
    for (let j = searchStart; j < searchLimit; j++) {
      const line = lines[j].trim();
      
      // Look for answer pattern: "**Answer:** B" or "Answer: B"
      const answerMatch = line.match(/\*?\*?Answer:?\*?\*?\s*([A-D])/i);
      if (answerMatch) {
        const letter = answerMatch[1].toUpperCase();
        correctIndex = options.findIndex(o => o.label === letter);
        
        // Also try to get explanation from same line
        const explMatch = line.match(/\*?Explanation:?\*?\s*(.+)$/i);
        if (explMatch) {
          explanation = explMatch[1].trim();
        }
        
        // Update endIdx to after this line
        i = Math.max(i, j + 1);
        break;
      }
      
      // Stop if we hit a new major section
      if ((line.startsWith("---") || /^#{1,6}\s/.test(line)) && j > startIdx + 5) {
        break;
      }
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
      // Line breaks <br>, <br/>, <br />
      const brMatch = remaining.match(/<br\s*\/?>/i);
      
      // Find earliest match
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
          case "br":
            return <br key={part.key} />;
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
function QuestionBlock({ question, options, correctIndex, explanation, questionIndex, courseId, lessonId, onAnswered }) {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  
  // Create shuffled options with deterministic seed based on question context
  const { shuffledOptions, shuffledToOriginal, originalCorrectInShuffled } = useMemo(() => {
    const seedString = `reading-q${questionIndex}-${courseId || ''}-${lessonId || ''}`;
    const seed = stringToSeed(seedString);
    const { shuffled, shuffledToOriginal } = shuffleWithMapping(options, seed);
    
    // Find where the original correct answer ended up in shuffled array
    let originalCorrectInShuffled = -1;
    Object.entries(shuffledToOriginal).forEach(([shuffledIdx, originalIdx]) => {
      if (originalIdx === correctIndex) {
        originalCorrectInShuffled = parseInt(shuffledIdx, 10);
      }
    });
    
    // Reassign labels (A, B, C, D) to shuffled options
    const shuffledWithLabels = shuffled.map((opt, idx) => ({
      ...opt,
      label: String.fromCharCode("A".charCodeAt(0) + idx),
    }));
    
    return { shuffledOptions: shuffledWithLabels, shuffledToOriginal, originalCorrectInShuffled };
  }, [options, correctIndex, questionIndex, courseId, lessonId]);
  
  // Load saved answer state from localStorage
  useEffect(() => {
    if (courseId && lessonId && questionIndex !== undefined) {
      const progress = getReadingProgress(courseId, lessonId);
      const savedAnswer = progress?.questionsAnswered?.[questionIndex];
      if (savedAnswer?.answered) {
        // Restore the submitted state
        setSubmitted(true);
      }
    }
  }, [courseId, lessonId, questionIndex]);
  
  const handleSelect = useCallback((idx) => {
    if (!submitted) {
      setSelectedIdx(idx);
    }
  }, [submitted]);
  
  const handleSubmit = useCallback(() => {
    if (selectedIdx !== null && !submitted) {
      setSubmitted(true);
      // Check if selected shuffled index maps to the original correct index
      const isCorrect = selectedIdx === originalCorrectInShuffled;
      
      // Save to localStorage
      if (courseId && lessonId && questionIndex !== undefined) {
        markReadingQuestionAnswered(courseId, lessonId, questionIndex, isCorrect);
      }
      
      // Notify parent of answer
      if (onAnswered) {
        onAnswered({ questionIndex, isCorrect });
      }
    }
  }, [selectedIdx, submitted, originalCorrectInShuffled, courseId, lessonId, questionIndex, onAnswered]);

  // Use shuffled correct index for display
  const isCorrect = submitted && selectedIdx === originalCorrectInShuffled;
  const isIncorrect = submitted && selectedIdx !== originalCorrectInShuffled;
  
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
        {shuffledOptions.map((option, idx) => {
          const isSelected = selectedIdx === idx;
          const isCorrectOption = idx === originalCorrectInShuffled;
          const showAsCorrect = submitted && isCorrectOption;
          const showAsIncorrect = submitted && isSelected && !isCorrectOption;
          
          let optionClass = "flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 ";
          
          if (!submitted) {
            optionClass += "cursor-pointer ";
            if (isSelected) {
              optionClass += "bg-[var(--primary)]/10 border-[var(--primary)] ";
            } else {
              optionClass += "bg-[var(--surface-1)] border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5 ";
            }
          } else {
            optionClass += "cursor-default ";
            if (showAsCorrect) {
              optionClass += "bg-emerald-500/10 border-emerald-500 ";
            } else if (showAsIncorrect) {
              optionClass += "bg-rose-500/10 border-rose-500 ";
            } else {
              optionClass += "bg-[var(--surface-1)] border-[var(--border)] opacity-60 ";
            }
          }
          
          let badgeClass = "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-semibold transition-colors ";
          
          if (showAsCorrect) {
            badgeClass += "bg-emerald-500 text-white ";
          } else if (showAsIncorrect) {
            badgeClass += "bg-rose-500 text-white ";
          } else if (isSelected && !submitted) {
            badgeClass += "bg-[var(--primary)] text-white ";
          } else {
            badgeClass += "bg-[var(--surface-2)] text-[var(--muted-foreground)] ";
          }
          
          return (
            <div
              key={idx}
              role="radio"
              aria-checked={isSelected}
              tabIndex={submitted ? -1 : 0}
              className={optionClass}
              onClick={() => handleSelect(idx)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !submitted) {
                  e.preventDefault();
                  handleSelect(idx);
                }
              }}
            >
              <div className={badgeClass}>
                {showAsCorrect ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : showAsIncorrect ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  option.label
                )}
              </div>
              <div className="flex-1 pt-0.5 text-[var(--foreground)]">
                <MathJax dynamic>
                  <InlineContent text={option.text} />
                </MathJax>
              </div>
              {showAsCorrect && (
                <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wide">Correct</span>
              )}
              {showAsIncorrect && (
                <span className="text-xs font-semibold text-rose-500 uppercase tracking-wide">Your answer</span>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Submit button - only show when not submitted and an option is selected */}
      {!submitted && (
        <div className="px-4 pb-4">
          <button
            onClick={handleSubmit}
            disabled={selectedIdx === null}
            className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
              selectedIdx !== null
                ? "bg-[var(--primary)] text-white hover:opacity-90 cursor-pointer"
                : "bg-[var(--surface-2)] text-[var(--muted-foreground)] cursor-not-allowed"
            }`}
          >
            Submit Answer
          </button>
        </div>
      )}
      
      {/* Results section - only show after submission */}
      {submitted && (
        <div className="px-4 pb-4 space-y-3">
          {/* Explanation */}
          {explanation && (
            <div className="p-4 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-md bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3.5 h-3.5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)] mb-1">
                    Explanation
                  </div>
                  <div className="text-sm text-[var(--foreground)] leading-relaxed">
                    <MathJax dynamic>
                      <InlineContent text={explanation} />
                    </MathJax>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Main ReadingRenderer component
 */
export default function ReadingRenderer({ content, courseId, lessonId, onReadingCompleted }) {
  const blocks = useMemo(() => parseContent(content), [content]);
  
  // Count question blocks
  const questionCount = useMemo(() => {
    return blocks.filter(block => block.type === "question").length;
  }, [blocks]);
  
  // Track answered questions
  const [answeredCount, setAnsweredCount] = useState(0);
  
  // Initialize total questions on mount and restore answered count from localStorage
  useEffect(() => {
    if (courseId && lessonId) {
      // Set total questions
      setReadingTotalQuestions(courseId, lessonId, questionCount);
      
      // Restore answered count from localStorage
      const progress = getReadingProgress(courseId, lessonId);
      const savedAnsweredCount = Object.keys(progress?.questionsAnswered || {}).length;
      setAnsweredCount(savedAnsweredCount);
      
      // Check if already completed
      if (questionCount > 0 && savedAnsweredCount >= questionCount && onReadingCompleted) {
        onReadingCompleted();
      } else if (questionCount === 0 && onReadingCompleted) {
        // No questions, reading is automatically completed when viewed
        onReadingCompleted();
      }
    }
  }, [courseId, lessonId, questionCount, onReadingCompleted]);
  
  const handleQuestionAnswered = useCallback(({ questionIndex, isCorrect }) => {
    setAnsweredCount(prev => {
      const newCount = prev + 1;
      // Check if all questions are now answered
      if (newCount >= questionCount && courseId && lessonId) {
        setReadingTotalQuestions(courseId, lessonId, questionCount);
        if (onReadingCompleted) {
          onReadingCompleted();
        }
      }
      return newCount;
    });
  }, [questionCount, courseId, lessonId, onReadingCompleted]);
  
  // Track question index for each question block
  let questionIndex = 0;
  
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
                const currentQuestionIndex = questionIndex++;
                return (
                  <QuestionBlock
                    key={idx}
                    question={block.question}
                    options={block.options}
                    correctIndex={block.correctIndex}
                    explanation={block.explanation}
                    questionIndex={currentQuestionIndex}
                    courseId={courseId}
                    lessonId={lessonId}
                    onAnswered={handleQuestionAnswered}
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
