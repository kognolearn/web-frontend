"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { MathJax } from "better-react-mathjax";
import MermaidDiagram from "./MermaidDiagram";
import { normalizeLatex } from "@/utils/richText";
import { authFetch } from "@/lib/api";
import { Callout, RevealBlock, TabGroup, VideoEmbed } from "@/components/content/v2/components/display";

/**
 * Decodes HTML entities in text (e.g., &amp; -> &, &gt; -> >, &lt; -> <)
 */
function decodeHtmlEntities(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Normalizes text by decoding HTML entities and then normalizing LaTeX
 */
function normalizeText(text) {
  return normalizeLatex(decodeHtmlEntities(text));
}

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

function normalizeSelectedAnswer(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const letter = trimmed.toUpperCase();
  if (/^[A-Z]$/.test(letter)) {
    return letter.charCodeAt(0) - "A".charCodeAt(0);
  }
  return null;
}

function normalizeInlineSelections(input) {
  if (!input) return {};
  if (Array.isArray(input)) {
    return input.reduce((acc, item) => {
      if (!item) return acc;
      const idx = item.questionIndex;
      if (idx === undefined || idx === null) return acc;
      const normalized = normalizeSelectedAnswer(
        item.selectedAnswer ?? item.selectedOption ?? item.answer
      );
      if (normalized === null) return acc;
      acc[idx] = normalized;
      return acc;
    }, {});
  }
  if (typeof input === "object") {
    return Object.entries(input).reduce((acc, [key, value]) => {
      const normalized = normalizeSelectedAnswer(value);
      if (normalized === null) return acc;
      acc[key] = normalized;
      return acc;
    }, {});
  }
  return {};
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
 * Parse table row into cells, handling escaped pipes (\|) and pipes inside backticks
 */
function parseTableCells(rowContent) {
  const cells = [];
  let current = '';
  let inBacktick = false;
  let i = 0;
  
  while (i < rowContent.length) {
    const char = rowContent[i];
    
    // Track backtick state for inline code
    if (char === '`') {
      inBacktick = !inBacktick;
      current += char;
      i++;
      continue;
    }
    
    // Handle escaped pipe
    if (char === '\\' && i + 1 < rowContent.length && rowContent[i + 1] === '|') {
      current += '|';
      i += 2;
      continue;
    }
    
    // Handle cell delimiter (only when not inside backticks)
    if (char === '|' && !inBacktick) {
      cells.push(current.trim());
      current = '';
      i++;
      continue;
    }
    
    current += char;
    i++;
  }
  
  // Don't forget the last cell
  if (current.length > 0 || cells.length > 0) {
    cells.push(current.trim());
  }
  
  return cells;
}

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
 * Parse a video block in the format:
 * :::video
 * url: https://youtube.com/...
 * title: Video Title
 * caption: Video caption
 * :::
 */
function parseVideoBlock(lines, startIdx) {
  let i = startIdx + 1;
  const fields = {};

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }
    if (/^:::/.test(line)) {
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
    type: "embedded_video",
    url: fields.url,
    title: fields.title || "",
    caption: fields.caption || "",
    endIdx: i,
  };
}

/**
 * Parse a callout block in the format:
 * :::callout{type="info"}
 * Content goes here
 * :::
 */
function parseCalloutBlock(lines, startIdx, attrs) {
  let i = startIdx + 1;
  const contentLines = [];

  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*:::/.test(line) && !/^:::(callout|reveal|tabs|tab|video|image)/i.test(line.trim())) {
      i++;
      break;
    }
    contentLines.push(line);
    i++;
  }

  // Parse attributes: type="info", title="My Title", collapsible
  const typeMatch = attrs.match(/type\s*=\s*["']([^"']+)["']/i);
  const titleMatch = attrs.match(/title\s*=\s*["']([^"']+)["']/i);
  const collapsible = /collapsible/i.test(attrs);

  return {
    type: "callout",
    calloutType: typeMatch?.[1] || "info",
    title: titleMatch?.[1] || "",
    content: contentLines.join("\n").trim(),
    collapsible,
    endIdx: i,
  };
}

/**
 * Parse a reveal block in the format:
 * :::reveal{label="Show Solution"}
 * Hidden content goes here
 * :::
 */
function parseRevealBlock(lines, startIdx, attrs) {
  let i = startIdx + 1;
  const contentLines = [];

  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*:::/.test(line) && !/^:::(callout|reveal|tabs|tab|video|image)/i.test(line.trim())) {
      i++;
      break;
    }
    contentLines.push(line);
    i++;
  }

  // Parse attributes: label="Show Hint"
  const labelMatch = attrs.match(/label\s*=\s*["']([^"']+)["']/i);

  return {
    type: "reveal",
    label: labelMatch?.[1] || "Show",
    content: contentLines.join("\n").trim(),
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

    // End of entire tab group
    if (/^:::$/.test(trimmed) || (/^:::/.test(trimmed) && !/^:::tab/i.test(trimmed))) {
      // Save last tab if any
      if (currentTab) {
        tabs.push({
          ...currentTab,
          content: currentContent.join("\n").trim(),
        });
      }
      i++;
      break;
    }

    // Start of a new tab
    const tabMatch = trimmed.match(/^:::tab\s*\{([^}]*)\}/i);
    if (tabMatch) {
      // Save previous tab if any
      if (currentTab) {
        tabs.push({
          ...currentTab,
          content: currentContent.join("\n").trim(),
        });
      }
      // Parse tab attributes: label="Tab Label"
      const labelMatch = tabMatch[1].match(/label\s*=\s*["']([^"']+)["']/i);
      currentTab = {
        id: `tab-${tabs.length}`,
        label: labelMatch?.[1] || `Tab ${tabs.length + 1}`,
      };
      currentContent = [];
      i++;
      continue;
    }

    // Add line to current tab content
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

/**
 * Parse content string into structured blocks for rendering
 * Handles: headings, paragraphs, lists, code blocks, math, questions, emphasis
 */
function parseContent(content) {
  if (!content) return [];
  
  console.log('ReadingRenderer raw content:', content.slice(0, 200));

  // Content should already have proper newlines from JSON parsing
  // Only normalize Windows line endings
  let normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Normalize double-escaped backslashes from JSON and decode HTML entities
  // This handles cases where content has \\( instead of \( for inline math
  // We use normalizeText for this now, which handles both HTML entities and LaTeX
  normalizedContent = normalizeText(normalizedContent);
  
  // Ensure code block closing markers are on their own line
  // This handles cases like "```\n**Check Your Understanding**" where there's no blank line
  normalizedContent = normalizedContent.replace(/(```)\s*(\*\*Check Your Understanding\*\*)/gi, '$1\n\n$2');
  
  // Handle Check Your Understanding blocks that are concatenated to previous text
  // Insert a newline before **Check Your Understanding** if it's not at the start of a line
  normalizedContent = normalizedContent.replace(/([^\n])(\*\*Check Your Understanding\*\*)/gi, '$1\n\n$2');
  
  // Also ensure there's a blank line after code blocks before Check Your Understanding
  // Handles: ```\nsome content\n```\n**Check -> need blank line before **Check
  normalizedContent = normalizedContent.replace(/(```\n)(\*\*Check Your Understanding\*\*)/gi, '$1\n$2');
  
  const blocks = [];
  const lines = normalizedContent.split("\n");
  
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

    if (/^:::\s*image/i.test(trimmed)) {
      const imageBlock = parseImageBlock(lines, i);
      if (imageBlock) {
        blocks.push(imageBlock);
        i = imageBlock.endIdx;
        continue;
      }
    }

    // Video block (:::video)
    if (/^:::\s*video/i.test(trimmed)) {
      const videoBlock = parseVideoBlock(lines, i);
      if (videoBlock) {
        blocks.push(videoBlock);
        i = videoBlock.endIdx;
        continue;
      }
    }

    // Callout block (:::callout{type="info"})
    const calloutMatch = trimmed.match(/^:::\s*callout\s*\{([^}]*)\}/i);
    if (calloutMatch) {
      const calloutBlock = parseCalloutBlock(lines, i, calloutMatch[1]);
      if (calloutBlock) {
        blocks.push(calloutBlock);
        i = calloutBlock.endIdx;
        continue;
      }
    }

    // Reveal block (:::reveal{label="Show"})
    const revealMatch = trimmed.match(/^:::\s*reveal\s*\{([^}]*)\}/i);
    if (revealMatch) {
      const revealBlock = parseRevealBlock(lines, i, revealMatch[1]);
      if (revealBlock) {
        blocks.push(revealBlock);
        i = revealBlock.endIdx;
        continue;
      }
    }

    // Tab group (:::tabs)
    if (/^:::\s*tabs/i.test(trimmed)) {
      const tabGroupBlock = parseTabGroup(lines, i);
      if (tabGroupBlock) {
        blocks.push(tabGroupBlock);
        i = tabGroupBlock.endIdx;
        continue;
      }
    }

    // Question block (starts with "Question:" or "**Question:**" or "**Check Your Understanding**")
    if (/^(\*\*)?Question:?\*?\*?/i.test(trimmed) || /^\*\*Check Your Understanding\*\*/i.test(trimmed)) {
      console.log('[ReadingRenderer] Detected Check Your Understanding block:', lines.slice(i, i + 20).join('\n'));
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
          // Parse cells - handle escaped pipes and pipes inside backticks
          const cells = parseTableCells(currentLine.slice(1, -1));
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
      // Stop code block at ``` OR if we encounter a "Check Your Understanding" section
      // This prevents runaway code blocks from swallowing question content
      const { collected, endIdx } = consumeUntil(i + 1, (l) => {
        const t = l.trim();
        return t.startsWith("```") || /^\*\*Check Your Understanding\*\*/i.test(t);
      });
      
      // Check if we stopped at Check Your Understanding (means no closing ```)
      const stoppedAtQuestion = endIdx < lines.length && /^\*\*Check Your Understanding\*\*/i.test(lines[endIdx].trim());
      
      blocks.push({
        type: "code",
        language: lang,
        content: collected.join("\n"),
      });
      
      // If we stopped at ```, skip past it; if at question, don't skip (let it be parsed)
      i = stoppedAtQuestion ? endIdx : endIdx + 1;
      continue;
    }
    
    // Block math ($$...$$ or \[...\])
    const isDollarBlock = trimmed.startsWith("$$");
    const isBracketBlock = trimmed.startsWith("\\[");
    
    if (isDollarBlock || isBracketBlock) {
      const startMarker = isDollarBlock ? "$$" : "\\[";
      const endMarker = isDollarBlock ? "$$" : "\\]";
      const sliceStart = 2; // Both are 2 chars
      const sliceEnd = -2; // Both are 2 chars

      if (trimmed.endsWith(endMarker) && trimmed.length > 4) {
        // Single line block math
        blocks.push({
          type: "block-math",
          content: trimmed.slice(sliceStart, sliceEnd).trim(),
        });
        i++;
        continue;
      } else {
        // Multi-line block math
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
 * 
 * New format with per-option explanations:
 * **Check Your Understanding**
 * [Question Text]
 * - A. [Option A Text]
 * - B. [Option B Text]
 * - C. [Option C Text]
 * - D. [Option D Text]
 * <details><summary>Show Answer</summary>
 * **Answer:** [Letter]
 * - **A** ❌ [Explanation for A]
 * - **B** ✅ [Explanation for B]
 * - **C** ❌ [Explanation for C]
 * - **D** ❌ [Explanation for D]
 * </details>
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
  const optionExplanations = {}; // Store per-option explanations
  let inDetailsBlock = false;
  
  // Collect options - format: "- A. Option text" or "A. Option text"
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }
    
    // Check for details block start
    if (/^<details>/i.test(line)) {
      inDetailsBlock = true;
      i++;
      continue;
    }
    
    // Check for details block end
    if (/^<\/details>/i.test(line)) {
      inDetailsBlock = false;
      i++;
      continue;
    }
    
    // Skip summary tags
    if (/^<\/?summary>/i.test(line) || /Show Answer/i.test(line)) {
      i++;
      continue;
    }
    
    // If we're NOT in the details block, parse options
    if (!inDetailsBlock) {
      // Match options: "- A. text", "A. text", "A) text", "* A. text"
      const optionMatch = line.match(/^[-*]?\s*([A-D])[.)]\s+(.+)$/i);
      
      if (optionMatch) {
        options.push({
          label: optionMatch[1].toUpperCase(),
          text: optionMatch[2],
        });
        i++;
        continue;
      }
    }
    
    // Inside details block - look for answer and explanations
    if (inDetailsBlock) {
      // Look for answer line: "**Answer:** B" or "Answer: B"
      const answerMatch = line.match(/\*?\*?Answer:?\*?\*?\s*([A-D])/i);
      if (answerMatch) {
        const letter = answerMatch[1].toUpperCase();
        correctIndex = options.findIndex(o => o.label === letter);
        
        // Also check for old-style explanation on same line
        const explMatch = line.match(/\*?Explanation:?\*?\s*(.+)$/i);
        if (explMatch) {
          explanation = explMatch[1].trim();
        }
        i++;
        continue;
      }
      
      // Look for per-option explanations: "- **A** explanation" or "- **B** explanation"
      // Handles formats:
      //   - **A** Some explanation text
      //   - **A.** Some explanation text  
      //   - **A** ❌ Some explanation text (with optional emoji)
      //   - **A** ✅ Some explanation text
      const optionExplMatch = line.match(/^[-*]\s*\*\*([A-D])\.?\*\*\s*(.+)$/i);
      if (optionExplMatch) {
        const letter = optionExplMatch[1].toUpperCase();
        let explText = optionExplMatch[2].trim();
        // Remove leading emoji if present at start of explanation
        explText = explText.replace(/^[❌✅✓✗⭕️🔴🟢]\s*/, '');
        optionExplanations[letter] = explText;
        i++;
        continue;
      }
    }
    
    // Check if we hit a new section
    if (line.startsWith("---") || /^#{1,6}\s/.test(line) || /^(\*\*)?Question:?\*?\*?/i.test(line) || /^\*\*Check Your Understanding\*\*/i.test(line)) {
      break;
    }
    
    i++;
  }
  
  // If we still haven't found the answer, do a broader search (backwards compatibility)
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
  
  // Attach explanations to options
  options.forEach(opt => {
    if (optionExplanations[opt.label]) {
      opt.explanation = optionExplanations[opt.label];
    }
  });
  
  return {
    type: "question",
    question: questionText.trim(),
    options,
    correctIndex,
    explanation, // Legacy single explanation
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
    // Normalize double-escaped backslashes but keep original math delimiters intact
    let remaining = text
      .replace(/\\(\(|\))/g, '\\$1')  // \\( -> \(, \\) -> \)
      .replace(/\\(\[|\])/g, '\\$1');  // \\[ -> \[, \\] -> \]
    
    let key = 0;
    
    // Process inline elements
    while (remaining.length > 0) {
      // Inline math: support $...$, \(...\), and \[...\] without converting delimiters
      const mathDollar = remaining.match(/\$([^$]+)\$/);
      const mathParen = remaining.match(/\\\(([\s\S]*?)\\\)/);
      const mathBracket = remaining.match(/\\\[([\s\S]*?)\\\]/);
      const mathMatch = (() => {
        const candidates = [mathDollar, mathParen, mathBracket].filter(Boolean);
        if (candidates.length === 0) return null;
        return candidates.reduce((a, b) => (a.index < b.index ? a : b));
      })();
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
          // Preserve original delimiter form (either $...$ or \(...\))
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
            return <span key={part.key} className="inline-math">{part.content}</span>;
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
function QuestionBlock({ question, options, correctIndex, explanation, questionIndex, courseId, lessonId, userId, initialAnswer, onAnswered }) {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [strikethroughOptions, setStrikethroughOptions] = useState({});
  
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
  
  // Load saved answer state from backend initial data (passed via props)
  useEffect(() => {
    if (initialAnswer !== undefined && initialAnswer !== null) {
      // initialAnswer is the original option index from the backend
      // We need to find which shuffled index this maps to
      const shuffledIdx = Object.entries(shuffledToOriginal).find(
        ([, origIdx]) => origIdx === initialAnswer
      )?.[0];
      if (shuffledIdx !== undefined) {
        setSelectedIdx(parseInt(shuffledIdx, 10));
      }
      setSubmitted(true);
    }
  }, [initialAnswer, shuffledToOriginal]);
  
  const handleSelect = useCallback((idx) => {
    if (!submitted) {
      setSelectedIdx(idx);
    }
  }, [submitted]);
  
  const handleSubmit = useCallback(async () => {
    if (selectedIdx !== null && !submitted) {
      setSubmitted(true);
      // Get the original option index for the backend
      const originalOptionIndex = shuffledToOriginal[selectedIdx];

      // Submit to backend API
      if (courseId && lessonId && userId && questionIndex !== undefined) {
        try {
          const response = await authFetch(`/api/courses/${courseId}/nodes/${lessonId}/inline-questions`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              updates: [{
                questionIndex,
                selectedAnswer: originalOptionIndex,
              }]
            }),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to save inline question answer: ${response.status} ${errorText}`);
          }
          
          const data = await response.json();
          if (onAnswered) {
            onAnswered({
              questionIndex,
              selectedAnswer: originalOptionIndex,
              readingCompleted: data?.readingCompleted,
              results: data?.results,
            });
          }
        } catch (error) {
          console.error('Failed to save inline question answer:', error);
        }
      }
    }
  }, [selectedIdx, submitted, shuffledToOriginal, courseId, lessonId, userId, questionIndex, onAnswered]);

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
          const isStruckThrough = strikethroughOptions[idx] && !submitted;
          
          let optionClass = "group flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 ";
          
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
              {/* Strikethrough toggle button - only show before submission */}
              {!submitted && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStrikethroughOptions(prev => ({
                      ...prev,
                      [idx]: !prev[idx]
                    }));
                  }}
                  className={`
                    flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer
                    ${isStruckThrough
                      ? "bg-rose-500/15 text-rose-500 ring-1 ring-rose-500/30"
                      : "text-[var(--muted-foreground)]/50 hover:text-rose-500 hover:bg-rose-500/10"
                    }
                  `}
                  aria-label={isStruckThrough ? "Remove strikethrough" : "Strike through option"}
                  title={isStruckThrough ? "Remove strikethrough" : "Cross out this option"}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 4H9a3 3 0 0 0 0 6h6" />
                    <path d="M4 12h16" />
                    <path d="M15 12a3 3 0 1 1 0 6H8" />
                  </svg>
                </button>
              )}
              <div className={`flex-1 pt-0.5 transition-opacity duration-200 ${isStruckThrough ? "opacity-40" : ""}`}>
                <div className={`text-[var(--foreground)] ${isStruckThrough ? "line-through decoration-2 decoration-rose-500/70" : ""}`}>
                  <MathJax dynamic>
                    <InlineContent text={option.text} />
                  </MathJax>
                </div>
                {/* Show per-option explanation after submission */}
                {submitted && option.explanation && (
                  <div className={`mt-2 text-sm leading-relaxed ${
                    isCorrectOption 
                      ? "text-emerald-400" 
                      : "text-[var(--muted-foreground)]"
                  }`}>
                    <MathJax dynamic>
                      <InlineContent text={option.explanation} />
                    </MathJax>
                  </div>
                )}
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
          {/* Legacy single explanation - only show if no per-option explanations exist */}
          {explanation && !shuffledOptions.some(opt => opt.explanation) && (
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
 * 
 * @param {string} content - The markdown/text content to render
 * @param {string} courseId - Course ID for tracking
 * @param {string} lessonId - Lesson/node ID for tracking
 * @param {string} userId - User ID for tracking
 * @param {Object} inlineQuestionSelections - Pre-saved inline question answers from backend { questionIndex: selectedOptionIndex }
 * @param {boolean} readingCompleted - Whether reading is already completed (from backend)
 * @param {Function} onReadingCompleted - Callback when all inline questions are answered
 */
export default function ReadingRenderer({ 
  content, 
  courseId, 
  lessonId, 
  userId,
  inlineQuestionSelections = {}, 
  readingCompleted: initialReadingCompleted = false,
  onReadingCompleted,
}) {
  const blocks = useMemo(() => parseContent(content), [content]);
  const [inlineSelections, setInlineSelections] = useState(() =>
    normalizeInlineSelections(inlineQuestionSelections)
  );
  const [readingCompleted, setReadingCompleted] = useState(Boolean(initialReadingCompleted));
  const [inlineStatusLoaded, setInlineStatusLoaded] = useState(false);
  const completionNotifiedRef = useRef(false);
  const lessonKey = `${courseId || ""}:${lessonId || ""}`;
  const lastLessonKeyRef = useRef(lessonKey);

  useEffect(() => {
    if (lastLessonKeyRef.current === lessonKey) return;
    lastLessonKeyRef.current = lessonKey;
    setInlineSelections(normalizeInlineSelections(inlineQuestionSelections));
    setReadingCompleted(Boolean(initialReadingCompleted));
    completionNotifiedRef.current = false;
  }, [lessonKey, inlineQuestionSelections, initialReadingCompleted]);

  useEffect(() => {
    if (!courseId || !lessonId || !userId) {
      setInlineStatusLoaded(true);
      return;
    }

    const ac = new AbortController();
    setInlineStatusLoaded(false);

    (async () => {
      try {
        const url = `/api/courses/${courseId}/nodes/${lessonId}/inline-questions`;
        const response = await authFetch(url, { signal: ac.signal });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to load inline question status: ${response.status} ${errorText}`);
        }
        const data = await response.json();
        const normalizedSelections = normalizeInlineSelections(
          data.inlineQuestions || data.inlineQuestionSelections || data.results
        );
        setInlineSelections(normalizedSelections);
        if (typeof data.readingCompleted === "boolean") {
          setReadingCompleted(data.readingCompleted);
        }
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error("Failed to load inline question status:", error);
      } finally {
        if (!ac.signal.aborted) {
          setInlineStatusLoaded(true);
        }
      }
    })();

    return () => {
      ac.abort();
    };
  }, [courseId, lessonId, userId]);

  useEffect(() => {
    if (!onReadingCompleted || !inlineStatusLoaded) return;
    if (readingCompleted && !completionNotifiedRef.current) {
      completionNotifiedRef.current = true;
      onReadingCompleted();
    }
  }, [readingCompleted, inlineStatusLoaded, onReadingCompleted]);
  
  const handleInlineQuestionUpdate = useCallback((payload) => {
    if (!payload) return;
    if (Array.isArray(payload.results)) {
      const normalizedSelections = normalizeInlineSelections(payload.results);
      if (Object.keys(normalizedSelections).length) {
        setInlineSelections(prev => ({ ...prev, ...normalizedSelections }));
      }
    } else if (payload.questionIndex !== undefined && payload.questionIndex !== null) {
      const normalized = normalizeSelectedAnswer(payload.selectedAnswer);
      if (normalized !== null) {
        setInlineSelections(prev => ({ ...prev, [payload.questionIndex]: normalized }));
      }
    }
    if (typeof payload.readingCompleted === "boolean") {
      setReadingCompleted(payload.readingCompleted);
      setInlineStatusLoaded(true);
    }
  }, []);
  
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

              case "image":
                const credit = [block.author, block.license].filter(Boolean).join(" | ");
                const imageAlt = block.alt || block.caption || "Reading image";
                const imageElement = (
                  <img
                    src={block.url}
                    alt={imageAlt}
                    loading="lazy"
                    className="w-full h-auto rounded-xl"
                  />
                );
                return (
                  <figure key={idx} className="my-6 w-full">
                    <div className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
                      {block.fullUrl ? (
                        <a href={block.fullUrl} target="_blank" rel="noopener noreferrer" className="block w-full">
                          {imageElement}
                        </a>
                      ) : (
                        imageElement
                      )}
                    </div>
                    {(block.caption || credit) && (
                      <figcaption className="mt-2 text-sm text-[var(--muted-foreground)] leading-relaxed">
                        {block.caption && <InlineContent text={block.caption} />}
                        {credit && (
                          <span className="block mt-1 text-xs text-[var(--muted-foreground)]">
                            {credit}
                          </span>
                        )}
                      </figcaption>
                    )}
                  </figure>
                );

              case "embedded_video":
                return (
                  <div key={idx} className="my-6">
                    <VideoEmbed
                      id={`video-${idx}`}
                      video_url={block.url}
                    />
                    {(block.title || block.caption) && (
                      <div className="mt-2 text-sm text-[var(--muted-foreground)] leading-relaxed">
                        {block.title && <span className="font-medium">{block.title}</span>}
                        {block.title && block.caption && " — "}
                        {block.caption}
                      </div>
                    )}
                  </div>
                );

              case "callout":
                return (
                  <div key={idx} className="my-6">
                    <Callout
                      id={`callout-${idx}`}
                      type={block.calloutType}
                      title={block.title || undefined}
                      content={block.content}
                      collapsible={block.collapsible}
                    />
                  </div>
                );

              case "reveal":
                return (
                  <div key={idx} className="my-6">
                    <RevealBlock
                      id={`reveal-${idx}`}
                      trigger_label={block.label}
                      content={block.content}
                      reveal_type="click"
                    />
                  </div>
                );

              case "tab_group":
                return (
                  <div key={idx} className="my-6 rounded-xl border border-[var(--border)] overflow-hidden">
                    <TabGroup
                      id={`tabs-${idx}`}
                      tabs={block.tabs}
                    />
                  </div>
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
                // Check if this is a Mermaid diagram
                const isMermaid = block.language?.toLowerCase() === "mermaid";
                
                if (isMermaid) {
                  return (
                    <MermaidDiagram 
                      key={idx} 
                      chart={block.content} 
                    />
                  );
                }
                
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
                    userId={userId}
                    initialAnswer={inlineSelections?.[currentQuestionIndex]}
                    onAnswered={handleInlineQuestionUpdate}
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
