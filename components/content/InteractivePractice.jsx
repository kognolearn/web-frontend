"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { MathJax } from "better-react-mathjax";
import { normalizeLatex } from "@/utils/richText";

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
 * Ensures LaTeX content is properly wrapped for MathJax rendering.
 * If content contains LaTeX commands but no delimiters, wraps in \(...\)
 */
function ensureLatexDelimiters(text) {
  if (!text || typeof text !== 'string') return text;
  
  // Decode HTML entities first
  const decoded = decodeHtmlEntities(text);
  
  // Already has delimiters
  if (decoded.includes('\\(') || decoded.includes('\\[') || decoded.includes('$')) {
    return normalizeLatex(decoded);
  }
  
  // Check if it looks like it contains LaTeX (has backslash commands)
  const hasLatexCommands = /\\[a-zA-Z]+/.test(decoded);
  const hasLatexSymbols = /[_^{}]/.test(decoded);
  
  if (hasLatexCommands || hasLatexSymbols) {
    // Wrap the entire thing in inline math delimiters
    return `\\(${normalizeLatex(decoded)}\\)`;
  }
  
  return normalizeLatex(decoded);
}

/**
 * Renders text with inline markdown code (`code`) converted to styled <code> elements.
 * Also handles newlines by converting them to <br /> elements.
 */
function renderInlineMarkdown(text) {
  if (!text || typeof text !== 'string') return text;
  
  // Decode HTML entities first
  const decoded = decodeHtmlEntities(text);
  
  const parts = [];
  const regex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match;
  let keyIdx = 0;
  
  while ((match = regex.exec(decoded)) !== null) {
    // Add text before the code
    if (match.index > lastIndex) {
      const textBefore = decoded.slice(lastIndex, match.index);
      parts.push(...renderTextWithLineBreaks(textBefore, keyIdx));
      keyIdx++;
    }
    // Add the code element
    parts.push(
      <code 
        key={`code-${keyIdx}`}
        className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--primary)] font-mono text-[0.9em]"
      >
        {match[1]}
      </code>
    );
    keyIdx++;
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < decoded.length) {
    parts.push(...renderTextWithLineBreaks(decoded.slice(lastIndex), keyIdx));
  }
  
  return parts.length > 0 ? parts : decoded;
}

/**
 * Helper to convert newlines to <br /> elements within text
 */
function renderTextWithLineBreaks(text, baseKey) {
  const lines = text.split('\n');
  const result = [];
  lines.forEach((line, idx) => {
    if (idx > 0) {
      result.push(<br key={`br-${baseKey}-${idx}`} />);
    }
    if (line) {
      result.push(<span key={`text-${baseKey}-${idx}`}>{normalizeLatex(line)}</span>);
    }
  });
  return result;
}

// ============================================================================
// PARSONS PROBLEMS (Drag-to-reorder)
// ============================================================================

function ParsonsItem({ item, isDragging }) {
  return (
    <motion.div
      layout
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border cursor-grab active:cursor-grabbing
        transition-colors duration-150
        ${isDragging 
          ? 'bg-[var(--primary)]/10 border-[var(--primary)] shadow-lg scale-[1.02]' 
          : 'bg-[var(--surface-1)] border-[var(--border)] hover:border-[var(--primary)]/50'
        }
      `}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 1.02 }}
    >
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--surface-2)] text-xs font-medium text-[var(--muted-foreground)]">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      <MathJax className="flex-1 text-[var(--foreground)]">
        {normalizeLatex(decodeHtmlEntities(item.content))}
      </MathJax>
    </motion.div>
  );
}

function ParsonsProblem({ problem, onComplete }) {
  const [items, setItems] = useState(() => {
    // Shuffle items initially
    const shuffled = [...problem.items].sort(() => Math.random() - 0.5);
    return shuffled;
  });
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [draggingId, setDraggingId] = useState(null);

  const checkAnswer = useCallback(() => {
    const userOrder = items.map(item => item.id);
    const correct = JSON.stringify(userOrder) === JSON.stringify(problem.correct_order);
    setIsCorrect(correct);
    setSubmitted(true);
    if (correct && onComplete) onComplete();
  }, [items, problem.correct_order, onComplete]);

  const reset = useCallback(() => {
    const shuffled = [...problem.items].sort(() => Math.random() - 0.5);
    setItems(shuffled);
    setSubmitted(false);
    setIsCorrect(false);
  }, [problem.items]);

  // Get correctness for each item position when submitted
  const getItemStatus = useCallback((index) => {
    if (!submitted) return null;
    return items[index].id === problem.correct_order[index] ? 'correct' : 'incorrect';
  }, [submitted, items, problem.correct_order]);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary)]/15 flex items-center justify-center">
          <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </div>
        <MathJax className="text-[var(--foreground)] font-medium">
          {renderInlineMarkdown(problem.prompt)}
        </MathJax>
      </div>

      <Reorder.Group 
        axis="y" 
        values={items} 
        onReorder={setItems}
        className="space-y-2"
      >
        {items.map((item, index) => {
          const status = getItemStatus(index);
          return (
            <Reorder.Item 
              key={item.id} 
              value={item}
              onDragStart={() => setDraggingId(item.id)}
              onDragEnd={() => setDraggingId(null)}
              disabled={submitted}
            >
              <div className="relative">
                <div className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200
                  ${submitted ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}
                  ${draggingId === item.id 
                    ? 'bg-[var(--primary)]/10 border-[var(--primary)] shadow-lg scale-[1.02]' 
                    : status === 'correct'
                      ? 'bg-emerald-500/10 border-emerald-500/50'
                      : status === 'incorrect'
                        ? 'bg-red-500/10 border-red-500/50'
                        : 'bg-[var(--surface-1)] border-[var(--border)] hover:border-[var(--primary)]/50'
                  }
                `}>
                  <div className={`
                    flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold
                    ${status === 'correct' 
                      ? 'bg-emerald-500/20 text-emerald-500' 
                      : status === 'incorrect'
                        ? 'bg-red-500/20 text-red-500'
                        : 'bg-[var(--surface-2)] text-[var(--muted-foreground)]'
                    }
                  `}>
                    {submitted ? (
                      status === 'correct' ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )
                    ) : (
                      index + 1
                    )}
                  </div>
                  <MathJax className="flex-1 text-[var(--foreground)]">
                    {normalizeLatex(decodeHtmlEntities(item.content))}
                  </MathJax>
                  {!submitted && (
                    <svg className="w-4 h-4 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  )}
                </div>
              </div>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>

      <div className="flex items-center gap-3 mt-6">
        {!submitted ? (
          <button
            onClick={checkAnswer}
            className="btn btn-primary px-6"
          >
            Check Order
          </button>
        ) : (
          <>
            <div className={`
              flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
              ${isCorrect 
                ? 'bg-emerald-500/15 text-emerald-500' 
                : 'bg-red-500/15 text-red-500'
              }
            `}>
              {isCorrect ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Perfect! Correct order.
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Not quite. Check the highlighted items.
                </>
              )}
            </div>
            <button
              onClick={reset}
              className="btn px-4 text-sm"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SKELETON PROBLEMS (Fill-in-the-gap with dropdowns)
// ============================================================================

function SkeletonGap({ gap, value, onChange, submitted, isCorrect }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const options = useMemo(() => {
    const all = [gap.correct_value, ...gap.distractors];
    // Use a seeded shuffle based on gap id for consistency
    return all.sort((a, b) => {
      const hashA = a.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const hashB = b.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      return hashA - hashB;
    });
  }, [gap]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (opt) => {
    onChange(gap.id, opt);
    setIsOpen(false);
  };

  return (
    <span className="inline-block mx-1 my-1 relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !submitted && setIsOpen(!isOpen)}
        disabled={submitted}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium min-w-[120px]
          transition-all duration-200
          ${submitted 
            ? isCorrect
              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 cursor-default'
              : 'bg-red-500/15 border-red-500/50 text-red-600 dark:text-red-400 cursor-default'
            : value
              ? 'bg-[var(--primary)]/10 border-[var(--primary)]/50 text-[var(--foreground)] cursor-pointer hover:bg-[var(--primary)]/20'
              : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted-foreground)] cursor-pointer hover:border-[var(--primary)]/50'
          }
        `}
      >
        <MathJax className="flex-1 text-left">
          {value ? normalizeLatex(decodeHtmlEntities(value)) : 'Select...'}
        </MathJax>
        {!submitted && (
          <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>
      
      <AnimatePresence>
        {isOpen && !submitted && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-0 top-full mt-1 min-w-[160px] max-w-[280px] bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden"
          >
            {options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(opt)}
                className={`
                  w-full px-3 py-2 text-left text-sm transition-colors
                  ${value === opt 
                    ? 'bg-[var(--primary)]/15 text-[var(--foreground)]' 
                    : 'text-[var(--foreground)] hover:bg-[var(--surface-2)]'
                  }
                `}
              >
                <MathJax>{normalizeLatex(decodeHtmlEntities(opt))}</MathJax>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      {submitted && !isCorrect && (
        <span className="ml-2 text-xs text-emerald-500 inline-flex items-center gap-1">
          → <MathJax className="inline">{normalizeLatex(decodeHtmlEntities(gap.correct_value))}</MathJax>
        </span>
      )}
    </span>
  );
}

function SkeletonProblem({ problem, onComplete }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [allCorrect, setAllCorrect] = useState(false);

  const handleChange = useCallback((gapId, value) => {
    setAnswers(prev => ({ ...prev, [gapId]: value }));
  }, []);

  const checkAnswer = useCallback(() => {
    const correct = problem.gaps.every(gap => answers[gap.id] === gap.correct_value);
    setAllCorrect(correct);
    setSubmitted(true);
    if (correct && onComplete) onComplete();
  }, [answers, problem.gaps, onComplete]);

  const reset = useCallback(() => {
    setAnswers({});
    setSubmitted(false);
    setAllCorrect(false);
  }, []);

  // Parse template and render with gaps
  const renderTemplate = useMemo(() => {
    const parts = [];
    let remaining = problem.template;
    const gapRegex = /\{\{(\w+)\}\}/g;
    let match;
    let lastIndex = 0;

    while ((match = gapRegex.exec(problem.template)) !== null) {
      // Add text before gap
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: remaining.slice(lastIndex, match.index)
        });
      }
      // Add gap
      const gapId = match[1];
      const gap = problem.gaps.find(g => g.id === gapId);
      if (gap) {
        parts.push({
          type: 'gap',
          gap
        });
      }
      lastIndex = match.index + match[0].length;
    }
    // Add remaining text
    if (lastIndex < problem.template.length) {
      parts.push({
        type: 'text',
        content: problem.template.slice(lastIndex)
      });
    }

    return parts;
  }, [problem.template, problem.gaps]);

  const allFilled = problem.gaps.every(gap => answers[gap.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center">
          <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <MathJax className="text-[var(--foreground)] font-medium">
          {renderInlineMarkdown(problem.context)}
        </MathJax>
      </div>

      <div className="p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)]">
        <MathJax className="text-lg leading-relaxed text-[var(--foreground)] flex flex-wrap items-baseline gap-1">
          {renderTemplate.map((part, idx) => (
            part.type === 'text' ? (
              <React.Fragment key={idx}>{renderInlineMarkdown(part.content)}</React.Fragment>
            ) : (
              <SkeletonGap
                key={idx}
                gap={part.gap}
                value={answers[part.gap.id]}
                onChange={handleChange}
                submitted={submitted}
                isCorrect={answers[part.gap.id] === part.gap.correct_value}
              />
            )
          ))}
        </MathJax>
      </div>

      <div className="flex items-center gap-3 mt-6">
        {!submitted ? (
          <button
            onClick={checkAnswer}
            disabled={!allFilled}
            className="btn btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Check Answer
          </button>
        ) : (
          <>
            <div className={`
              flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
              ${allCorrect 
                ? 'bg-emerald-500/15 text-emerald-500' 
                : 'bg-red-500/15 text-red-500'
              }
            `}>
              {allCorrect ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  All correct!
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Some gaps are incorrect.
                </>
              )}
            </div>
            <button
              onClick={reset}
              className="btn px-4 text-sm"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MATCHING PROBLEMS (Connect left to right)
// ============================================================================

function MatchingProblem({ problem, onComplete }) {
  const [connections, setConnections] = useState({}); // { leftItem: rightItem }
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState({}); // { leftItem: 'correct' | 'incorrect' }
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const leftRefs = useRef({});
  const rightRefs = useRef({});
  const [linePositions, setLinePositions] = useState([]);

  // Stable shuffle - only shuffle once on mount using a seeded approach
  const shuffledRight = useMemo(() => {
    const items = [...problem.right_items];
    // Deterministic shuffle based on problem id or first item
    const seed = (problem.id || problem.right_items[0] || '').toString();
    const seedNum = seed.split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
    
    // Fisher-Yates with seeded random
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.abs((seedNum * (i + 1) * 9301 + 49297) % 233280) % (i + 1);
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }, [problem.id, problem.right_items]);

  // Function to calculate line positions
  const updateLinePositions = useCallback(() => {
    if (!svgRef.current) return;

    const svgRect = svgRef.current.getBoundingClientRect();
    const lines = [];

    Object.entries(connections).forEach(([left, right]) => {
      const leftEl = leftRefs.current[left];
      const rightEl = rightRefs.current[right];
      if (leftEl && rightEl) {
        const leftRect = leftEl.getBoundingClientRect();
        const rightRect = rightEl.getBoundingClientRect();
        lines.push({
          left,
          right,
          x1: leftRect.right - svgRect.left,
          y1: leftRect.top + leftRect.height / 2 - svgRect.top,
          x2: rightRect.left - svgRect.left,
          y2: rightRect.top + rightRect.height / 2 - svgRect.top,
        });
      }
    });

    setLinePositions(lines);
  }, [connections]);

  // Update line positions when connections change, with a small delay for DOM updates
  useEffect(() => {
    // Immediate update
    updateLinePositions();
    // Delayed update to catch any layout shifts from MathJax rendering
    const timeout = setTimeout(updateLinePositions, 100);
    return () => clearTimeout(timeout);
  }, [connections, submitted, updateLinePositions]);

  // Also update on window resize
  useEffect(() => {
    window.addEventListener('resize', updateLinePositions);
    return () => window.removeEventListener('resize', updateLinePositions);
  }, [updateLinePositions]);

  const handleLeftClick = useCallback((item) => {
    if (submitted) return;
    if (selectedLeft === item) {
      setSelectedLeft(null);
    } else {
      setSelectedLeft(item);
    }
  }, [selectedLeft, submitted]);

  const handleRightClick = useCallback((item) => {
    if (submitted || !selectedLeft) return;
    
    // Remove any existing connection to this right item
    setConnections(prev => {
      const next = { ...prev };
      Object.entries(next).forEach(([left, right]) => {
        if (right === item) delete next[left];
      });
      next[selectedLeft] = item;
      return next;
    });
    setSelectedLeft(null);
  }, [selectedLeft, submitted]);

  const removeConnection = useCallback((leftItem) => {
    if (submitted) return;
    setConnections(prev => {
      const next = { ...prev };
      delete next[leftItem];
      return next;
    });
  }, [submitted]);

  const checkAnswer = useCallback(() => {
    const newResults = {};
    let allCorrect = true;

    problem.left_items.forEach(left => {
      const correctMatch = problem.matches.find(m => m.left === left);
      if (correctMatch && connections[left] === correctMatch.right) {
        newResults[left] = 'correct';
      } else {
        newResults[left] = 'incorrect';
        allCorrect = false;
      }
    });

    setResults(newResults);
    setSubmitted(true);
    if (allCorrect && onComplete) onComplete();
  }, [connections, problem.left_items, problem.matches, onComplete]);

  const reset = useCallback(() => {
    setConnections({});
    setSelectedLeft(null);
    setSubmitted(false);
    setResults({});
  }, []);

  const allConnected = problem.left_items.every(item => connections[item]);
  const allCorrect = Object.values(results).every(r => r === 'correct');

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <MathJax className="text-[var(--foreground)] font-medium">
          {renderInlineMarkdown(problem.prompt)}
        </MathJax>
      </div>

      <p className="text-sm text-[var(--muted-foreground)] mb-4">
        Click an item on the left, then click its match on the right. Click a connected item to disconnect.
      </p>

      <div className="relative p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)]">
        <svg 
          ref={svgRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{ overflow: 'visible' }}
        >
          {linePositions.map((line, idx) => (
            <line
              key={idx}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={
                submitted 
                  ? results[line.left] === 'correct' 
                    ? 'rgb(16, 185, 129)' 
                    : 'rgb(239, 68, 68)'
                  : 'var(--primary)'
              }
              strokeWidth={2}
              strokeDasharray={submitted && results[line.left] === 'incorrect' ? '4 4' : '0'}
            />
          ))}
        </svg>

        <div className="flex justify-between gap-8">
          {/* Left column */}
          <div className="flex-1 space-y-3">
            {problem.left_items.map((item, idx) => {
              const isSelected = selectedLeft === item;
              const isConnected = connections[item];
              const status = results[item];
              
              return (
                <motion.button
                  key={idx}
                  ref={el => leftRefs.current[item] = el}
                  onClick={() => isConnected ? removeConnection(item) : handleLeftClick(item)}
                  disabled={submitted}
                  className={`
                    relative w-full px-4 py-3 rounded-xl border text-left transition-all duration-200
                    ${submitted 
                      ? status === 'correct'
                        ? 'bg-emerald-500/10 border-emerald-500/50'
                        : 'bg-red-500/10 border-red-500/50'
                      : isSelected
                        ? 'bg-[var(--primary)]/15 border-[var(--primary)] ring-2 ring-[var(--primary)]/30'
                        : isConnected
                          ? 'bg-[var(--primary)]/10 border-[var(--primary)]/50'
                          : 'bg-[var(--surface-2)] border-[var(--border)] hover:border-[var(--primary)]/50'
                    }
                    disabled:cursor-default
                  `}
                  whileHover={!submitted ? { scale: 1.02 } : {}}
                  whileTap={!submitted ? { scale: 0.98 } : {}}
                >
                  <MathJax className="text-[var(--foreground)]">
                    {ensureLatexDelimiters(item)}
                  </MathJax>
                  {isConnected && !submitted && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-[var(--primary)]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Center spacer for lines */}
          <div className="w-16" />

          {/* Right column */}
          <div className="flex-1 space-y-3">
            {shuffledRight.map((item, idx) => {
              const isConnectedTo = Object.entries(connections).find(([, right]) => right === item)?.[0];
              const status = isConnectedTo ? results[isConnectedTo] : null;
              
              return (
                <motion.button
                  key={idx}
                  ref={el => rightRefs.current[item] = el}
                  onClick={() => handleRightClick(item)}
                  disabled={submitted || !selectedLeft}
                  className={`
                    relative w-full px-4 py-3 rounded-xl border text-left transition-all duration-200
                    ${submitted 
                      ? status === 'correct'
                        ? 'bg-emerald-500/10 border-emerald-500/50'
                        : status === 'incorrect'
                          ? 'bg-red-500/10 border-red-500/50'
                          : 'bg-[var(--surface-2)] border-[var(--border)]'
                      : isConnectedTo
                        ? 'bg-[var(--primary)]/10 border-[var(--primary)]/50'
                        : selectedLeft
                          ? 'bg-[var(--surface-2)] border-[var(--border)] hover:border-[var(--primary)]/50 cursor-pointer'
                          : 'bg-[var(--surface-2)] border-[var(--border)] opacity-60'
                    }
                    disabled:cursor-default
                  `}
                  whileHover={!submitted && selectedLeft ? { scale: 1.02 } : {}}
                  whileTap={!submitted && selectedLeft ? { scale: 0.98 } : {}}
                >
                  <MathJax className="text-[var(--foreground)]">
                    {ensureLatexDelimiters(item)}
                  </MathJax>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-6">
        {!submitted ? (
          <button
            onClick={checkAnswer}
            disabled={!allConnected}
            className="btn btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Check Matches
          </button>
        ) : (
          <>
            <div className={`
              flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
              ${allCorrect 
                ? 'bg-emerald-500/15 text-emerald-500' 
                : 'bg-red-500/15 text-red-500'
              }
            `}>
              {allCorrect ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  All matches correct!
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Some matches are incorrect.
                </>
              )}
            </div>
            <button
              onClick={reset}
              className="btn px-4 text-sm"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// BLACKBOX PROBLEMS (Input/Output pattern recognition)
// ============================================================================

function BlackboxProblem({ problem, onComplete }) {
  const [userAnswer, setUserAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  // Simple check - exact match or close enough
  const isCorrect = useMemo(() => {
    if (!submitted) return false;
    const normalized = userAnswer.toLowerCase().replace(/\s+/g, '').replace(/[()]/g, '');
    const expected = problem.hidden_rule.toLowerCase().replace(/\s+/g, '').replace(/[()]/g, '');
    // Check for exact match or common variations
    return normalized === expected || 
           normalized.includes('2x+1') || 
           normalized.includes('2*x+1') ||
           normalized === expected.replace(/f\(x\)\s*=\s*/i, '');
  }, [submitted, userAnswer, problem.hidden_rule]);

  const checkAnswer = useCallback(() => {
    setSubmitted(true);
    if (isCorrect && onComplete) onComplete();
  }, [isCorrect, onComplete]);

  const reset = useCallback(() => {
    setUserAnswer('');
    setSubmitted(false);
    setShowAnswer(false);
  }, []);

  return (
    <div className="space-y-4">
      {/* Question prompt */}
      <MathJax className="text-[var(--foreground)] font-medium text-lg">
        {renderInlineMarkdown(problem.question)}
      </MathJax>

      {/* Black box visualization */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[var(--surface-1)] to-[var(--surface-2)] border border-[var(--border)]">
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="text-center">
            <div className="text-xs font-medium text-[var(--muted-foreground)] mb-2 uppercase tracking-wide">Input</div>
            <div className="w-16 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-500 font-mono font-bold">
              x
            </div>
          </div>
          <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <div className="relative">
            <div className="w-32 h-20 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700 flex items-center justify-center shadow-lg">
              <span className="text-2xl">📦</span>
              <span className="absolute -bottom-5 text-xs font-medium text-[var(--muted-foreground)]">f(x) = ?</span>
            </div>
          </div>
          <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <div className="text-center">
            <div className="text-xs font-medium text-[var(--muted-foreground)] mb-2 uppercase tracking-wide">Output</div>
            <div className="w-16 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 font-mono font-bold">
              ?
            </div>
          </div>
        </div>

        {/* I/O Examples Table */}
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--surface-2)]">
                <th className="px-6 py-3 text-center text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider border-r border-[var(--border)]">
                  Input (x)
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Output f(x)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {problem.io_pairs.map((pair, idx) => (
                <motion.tr 
                  key={idx}
                  className="bg-[var(--surface-1)] hover:bg-[var(--surface-2)] transition-colors"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <td className="px-6 py-4 text-center font-mono text-lg font-medium text-blue-500 border-r border-[var(--border)]">
                    {pair.input}
                  </td>
                  <td className="px-6 py-4 text-center font-mono text-lg font-medium text-emerald-500">
                    {pair.output}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Answer input */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-[var(--foreground)]">
          What is the transformation rule?
        </label>
        <div className="flex gap-3">
          <textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            disabled={submitted}
            placeholder="e.g., f(x) = 2x + 1 or describe the rule"
            rows={4}
            className={`
              flex-1 px-4 py-3 rounded-xl border bg-[var(--surface-1)] text-[var(--foreground)]
              placeholder:text-[var(--muted-foreground)] font-mono text-sm
              focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]
              disabled:opacity-60 disabled:cursor-not-allowed resize-y min-h-[100px]
              ${submitted 
                ? isCorrect 
                  ? 'border-emerald-500/50 bg-emerald-500/10' 
                  : 'border-red-500/50 bg-red-500/10'
                : 'border-[var(--border)]'
              }
            `}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-6">
        {!submitted ? (
          <button
            onClick={checkAnswer}
            disabled={!userAnswer.trim()}
            className="btn btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Check Answer
          </button>
        ) : (
          <>
            <div className={`
              flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
              ${isCorrect 
                ? 'bg-emerald-500/15 text-emerald-500' 
                : 'bg-red-500/15 text-red-500'
              }
            `}>
              {isCorrect ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Correct!
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Not quite.
                </>
              )}
            </div>
            
            {!isCorrect && (
              <button
                onClick={() => setShowAnswer(!showAnswer)}
                className="text-sm text-[var(--primary)] hover:underline"
              >
                {showAnswer ? 'Hide answer' : 'Show answer'}
              </button>
            )}
            
            <button
              onClick={reset}
              className="btn px-4 text-sm"
            >
              Try Again
            </button>
          </>
        )}
      </div>

      <AnimatePresence>
        {showAnswer && submitted && !isCorrect && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-sm text-[var(--muted-foreground)]">The hidden rule is:</span>
              <MathJax className="text-lg font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                {normalizeLatex(decodeHtmlEntities(problem.hidden_rule))}
              </MathJax>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function InteractivePractice({ interactivePractice = {}, onComplete }) {
  const [currentType, setCurrentType] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedProblems, setCompletedProblems] = useState(new Set());

  // Collect all problems with their types
  const allProblems = useMemo(() => {
    const problems = [];
    
    if (interactivePractice.parsons?.length) {
      interactivePractice.parsons.forEach((p, i) => {
        problems.push({ ...p, _type: 'parsons', _idx: i });
      });
    }
    if (interactivePractice.skeleton?.length) {
      interactivePractice.skeleton.forEach((p, i) => {
        problems.push({ ...p, _type: 'skeleton', _idx: i });
      });
    }
    if (interactivePractice.matching?.length) {
      interactivePractice.matching.forEach((p, i) => {
        problems.push({ ...p, _type: 'matching', _idx: i });
      });
    }
    if (interactivePractice.blackbox?.length) {
      interactivePractice.blackbox.forEach((p, i) => {
        problems.push({ ...p, _type: 'blackbox', _idx: i });
      });
    }
    
    return problems;
  }, [interactivePractice]);

  // Initialize current type
  useEffect(() => {
    if (allProblems.length > 0 && !currentType) {
      setCurrentType(allProblems[0]._type);
    }
  }, [allProblems, currentType]);

  const currentProblem = allProblems[currentIndex];

  const typeLabels = {
    parsons: { label: 'Ordering', icon: '🔢', color: 'var(--primary)' },
    skeleton: { label: 'Fill Gaps', icon: '✏️', color: 'rgb(245, 158, 11)' },
    matching: { label: 'Matching', icon: '🔗', color: 'rgb(59, 130, 246)' },
    blackbox: { label: 'Black Box', icon: '📦', color: 'rgb(168, 85, 247)' },
  };

  const handleProblemComplete = useCallback(() => {
    setCompletedProblems(prev => new Set([...prev, currentProblem?.id]));
  }, [currentProblem?.id]);

  const navigateProblem = useCallback((direction) => {
    setCurrentIndex(prev => {
      const next = prev + direction;
      if (next < 0) return 0;
      if (next >= allProblems.length) return allProblems.length - 1;
      return next;
    });
  }, [allProblems.length]);

  if (!allProblems.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <p className="text-[var(--muted-foreground)]">No interactive practice problems available.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Progress header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[var(--foreground)]">
            Problem {currentIndex + 1} of {allProblems.length}
          </span>
          <span className="text-sm text-emerald-500 font-medium">
            {completedProblems.size} completed
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[var(--primary)] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${((currentIndex + 1) / allProblems.length) * 100}%` }}
          />
        </div>

        {/* Problem type indicators */}
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
          {allProblems.map((problem, idx) => {
            const isCurrent = idx === currentIndex;
            const isCompleted = completedProblems.has(problem.id);
            const typeInfo = typeLabels[problem._type];
            
            return (
              <button
                key={problem.id}
                onClick={() => setCurrentIndex(idx)}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                  transition-all duration-200 border-2
                  ${isCurrent 
                    ? 'scale-110 shadow-lg' 
                    : 'hover:scale-105'
                  }
                  ${isCompleted
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500'
                    : isCurrent
                      ? 'bg-[var(--primary)]/20 border-[var(--primary)] text-[var(--primary)]'
                      : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted-foreground)]'
                  }
                `}
                title={`${typeInfo.label} problem ${idx + 1}`}
              >
                {isCompleted ? '✓' : idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Current problem type badge */}
      {currentProblem && (
        <div className="mb-4">
          <span 
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
            style={{ 
              backgroundColor: `${typeLabels[currentProblem._type].color}20`,
              color: typeLabels[currentProblem._type].color
            }}
          >
            <span>{typeLabels[currentProblem._type].icon}</span>
            {typeLabels[currentProblem._type].label}
          </span>
        </div>
      )}

      {/* Problem content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentProblem?.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)] shadow-sm"
        >
          {currentProblem?._type === 'parsons' && (
            <ParsonsProblem 
              problem={currentProblem} 
              onComplete={handleProblemComplete} 
            />
          )}
          {currentProblem?._type === 'skeleton' && (
            <SkeletonProblem 
              problem={currentProblem} 
              onComplete={handleProblemComplete} 
            />
          )}
          {currentProblem?._type === 'matching' && (
            <MatchingProblem 
              problem={currentProblem} 
              onComplete={handleProblemComplete} 
            />
          )}
          {currentProblem?._type === 'blackbox' && (
            <BlackboxProblem 
              problem={currentProblem} 
              onComplete={handleProblemComplete} 
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => navigateProblem(-1)}
          disabled={currentIndex === 0}
          className="btn px-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        <button
          onClick={() => navigateProblem(1)}
          disabled={currentIndex === allProblems.length - 1}
          className="btn btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
