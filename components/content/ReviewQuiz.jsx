"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MathJax } from "better-react-mathjax";
import RichBlock from "@/components/content/RichBlock";
import { hasRichContent, toRichBlock, normalizeLatex } from "@/utils/richText";
import Tooltip from "@/components/ui/Tooltip";
import { authFetch } from "@/lib/api";

/**
 * Seeded random number generator for consistent shuffling per question
 */
function seededRandom(seed) {
  let t = seed + 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

function stringToSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

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

function normalizeRichBlock(value) {
  const block = toRichBlock(value);
  return hasRichContent(block) ? block : { content: [] };
}

function extractPlainTextFromBlock(block) {
  if (!block) return "";
  if (typeof block === "string") return block;
  
  const collectText = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map(collectText).join(" ");
    if (typeof value === "object") {
      let text = "";
      if (typeof value.text === "string") text += ` ${value.text}`;
      if (typeof value.value === "string") text += ` ${value.value}`;
      if (value.children) text += ` ${collectText(value.children)}`;
      if (value.content) text += ` ${collectText(value.content)}`;
      return text;
    }
    return "";
  };
  
  return collectText(block.content ?? block).replace(/\s+/g, " ").trim();
}

function getOptionLabel(option, index) {
  if (option?.label) return option.label;
  return String.fromCharCode("A".charCodeAt(0) + index);
}

function normalizeOption(option, index, optionExplanation = null) {
  const blockSource = option?.block ?? (option?.content ? { content: option.content } : option);
  const block = normalizeRichBlock(blockSource);
  const fallbackValue = typeof option === "string" ? option : option?.value ?? option?.text ?? null;
  const plainText = extractPlainTextFromBlock(block);
  
  // Handle explanation - can be string or rich block
  let explanationBlock = null;
  let explanationText = null;
  const rawExplanation = optionExplanation ?? option?.explanation;
  
  if (rawExplanation) {
    if (typeof rawExplanation === 'string') {
      explanationText = rawExplanation;
      explanationBlock = { content: [{ type: 'paragraph', children: [{ text: rawExplanation }] }] };
    } else {
      explanationBlock = normalizeRichBlock(rawExplanation);
    }
  }
  
  return {
    id: option?.id ?? String(index),
    label: getOptionLabel(option, index),
    block,
    correct: Boolean(option?.correct),
    explanation: explanationBlock && hasRichContent(explanationBlock) ? explanationBlock : null,
    explanationText,
    valueText: typeof fallbackValue === "string" ? fallbackValue : null,
    plainText,
  };
}

/**
 * ReviewQuiz - Interactive quiz component for review mode
 * 
 * Key differences from regular Quiz:
 * - Shows immediate feedback after each answer
 * - If correct: Show success, allow flagging, then move to next
 * - If wrong: Show "Try Again" with explanation of why that answer is wrong, don't reveal correct answer
 * - Updates question status in database after correct answer
 * - Tracks attempts per question
 */
export default function ReviewQuiz({
  questions = [],
  userId,
  courseId,
  onQuestionCompleted,
  onAllCompleted,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [answerState, setAnswerState] = useState(null); // null, 'correct', 'incorrect'
  const [attempts, setAttempts] = useState({}); // questionId -> attempt count
  const [wrongAttempts, setWrongAttempts] = useState({}); // questionId -> Set of wrong option ids
  const [completedQuestions, setCompletedQuestions] = useState(new Set());
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const [showContinuePrompt, setShowContinuePrompt] = useState(false);

  // Normalize questions
  const normalizedQuestions = useMemo(() => {
    return questions.map((q, idx) => {
      // Handle explanation - can be a JSON string array, actual array, or single value
      let optionExplanations = [];
      if (q?.explanation) {
        if (typeof q.explanation === 'string') {
          // Try to parse as JSON array
          try {
            const parsed = JSON.parse(q.explanation);
            if (Array.isArray(parsed)) {
              optionExplanations = parsed;
            }
          } catch (e) {
            // Not JSON, treat as single explanation
            optionExplanations = [];
          }
        } else if (Array.isArray(q.explanation)) {
          optionExplanations = q.explanation;
        }
      }
      
      // Handle options - can be array of strings or array of objects
      let options = [];
      if (Array.isArray(q?.options)) {
        options = q.options.map((opt, optIdx) => {
          // If opt is a string, convert to object format
          if (typeof opt === 'string') {
            return normalizeOption({ value: opt }, optIdx, optionExplanations[optIdx] || null);
          }
          return normalizeOption(opt, optIdx, optionExplanations[optIdx] || null);
        });
      }
      
      // Apply correct index if not already set on options
      if (!options.some(opt => opt.correct)) {
        const correctIdx = q?.correctIndex ?? q?.correct_index ?? q?.answerIndex ?? q?.answer_index;
        if (typeof correctIdx === 'number' && correctIdx >= 0 && correctIdx < options.length) {
          options[correctIdx].correct = true;
        }
      }
      
      // Handle question text - can be string, object with 'question' field, or rich block
      let questionBlock;
      if (typeof q?.question === 'string') {
        questionBlock = { content: [{ type: 'paragraph', children: [{ text: q.question }] }] };
      } else {
        questionBlock = normalizeRichBlock(q?.question ?? q?.prompt ?? q?.block ?? q);
      }
      
      // Question-level explanation (only if not per-option)
      let questionExplanation = null;
      if (optionExplanations.length === 0 && q?.explanation && typeof q.explanation === 'string') {
        // It's a single string explanation, not JSON array
        try {
          JSON.parse(q.explanation);
          // If it parses, it was handled above
        } catch (e) {
          // Not JSON, use as question-level explanation
          questionExplanation = { content: [{ type: 'paragraph', children: [{ text: q.explanation }] }] };
        }
      }
      
      return {
        id: q?.id ?? String(idx),
        block: questionBlock,
        options,
        explanation: questionExplanation && hasRichContent(questionExplanation) ? questionExplanation : null,
        correctIndex: q?.correct_index ?? q?.correctIndex,
        // Keep original question text for display fallback
        questionText: typeof q?.question === 'string' ? q.question : null,
      };
    });
  }, [questions]);

  // Shuffle options for current question
  const shuffledData = useMemo(() => {
    return normalizedQuestions.map((q) => {
      const seedString = `${q.id}-${courseId || ''}-review`;
      const seed = stringToSeed(seedString);
      const { shuffled, shuffledToOriginal } = shuffleWithMapping(q.options, seed);
      
      const shuffledWithLabels = shuffled.map((opt, idx) => ({
        ...opt,
        label: String.fromCharCode("A".charCodeAt(0) + idx),
        originalIndex: shuffledToOriginal[idx],
      }));
      
      return {
        ...q,
        shuffledOptions: shuffledWithLabels,
        shuffledToOriginal,
      };
    });
  }, [normalizedQuestions, courseId]);

  const currentQuestion = shuffledData[currentIndex];
  const questionCount = shuffledData.length;
  const isCompleted = currentQuestion ? completedQuestions.has(currentQuestion.id) : false;
  const isFlagged = currentQuestion ? flaggedQuestions.has(currentQuestion.id) : false;

  // Get wrong attempts for current question
  const currentWrongAttempts = currentQuestion ? (wrongAttempts[currentQuestion.id] || new Set()) : new Set();

  // Reset state when moving to new question
  useEffect(() => {
    setSelectedId(null);
    setAnswerState(null);
    setShowContinuePrompt(false);
  }, [currentIndex]);

  const handleSelect = useCallback((optionId) => {
    if (isCompleted || answerState === 'correct' || isUpdating) return;
    setSelectedId(optionId);
    setAnswerState(null);
  }, [isCompleted, answerState, isUpdating]);

  const handleCheckAnswer = useCallback(async () => {
    if (!selectedId || !currentQuestion || isUpdating) return;

    const selectedOption = currentQuestion.shuffledOptions.find(opt => opt.id === selectedId);
    if (!selectedOption) return;

    const questionId = currentQuestion.id;
    const attemptCount = (attempts[questionId] || 0) + 1;
    setAttempts(prev => ({ ...prev, [questionId]: attemptCount }));

    if (selectedOption.correct) {
      setAnswerState('correct');
      setShowContinuePrompt(true);
      
      // Update database - mark as correct
      if (userId && courseId) {
        setIsUpdating(true);
        try {
          const selectedOriginalIndex = selectedOption.originalIndex;
          
          await authFetch(`/api/courses/${courseId}/questions`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              updates: [{
                id: questionId,
                status: 'correct',
                selectedAnswer: selectedOriginalIndex,
              }]
            }),
          });

          if (typeof onQuestionCompleted === 'function') {
            onQuestionCompleted(questionId, true, attemptCount);
          }
        } catch (error) {
          console.error('Error updating question status:', error);
        } finally {
          setIsUpdating(false);
        }
      }
    } else {
      setAnswerState('incorrect');
      // Track this wrong attempt
      setWrongAttempts(prev => ({
        ...prev,
        [questionId]: new Set([...(prev[questionId] || []), selectedId])
      }));
    }
  }, [selectedId, currentQuestion, attempts, userId, courseId, onQuestionCompleted, isUpdating]);

  const handleTryAgain = useCallback(() => {
    setSelectedId(null);
    setAnswerState(null);
  }, []);

  const handleContinue = useCallback(() => {
    if (!currentQuestion) return;
    
    // Mark as completed
    setCompletedQuestions(prev => new Set([...prev, currentQuestion.id]));
    
    // Move to next question or finish
    if (currentIndex < questionCount - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // All questions completed
      if (typeof onAllCompleted === 'function') {
        onAllCompleted({
          totalQuestions: questionCount,
          flaggedCount: flaggedQuestions.size,
          attempts,
        });
      }
    }
  }, [currentQuestion, currentIndex, questionCount, flaggedQuestions, attempts, onAllCompleted]);

  const handleFlag = useCallback(async () => {
    if (!currentQuestion || !userId || !courseId) return;
    
    const questionId = currentQuestion.id;
    const newFlaggedState = !flaggedQuestions.has(questionId);
    
    // Update local state
    setFlaggedQuestions(prev => {
      const next = new Set(prev);
      if (newFlaggedState) {
        next.add(questionId);
      } else {
        next.delete(questionId);
      }
      return next;
    });
    
    // Update database
    try {
      const selectedOption = currentQuestion.shuffledOptions.find(opt => opt.id === selectedId);
      const selectedOriginalIndex = selectedOption?.originalIndex ?? null;
      
      await authFetch(`/api/courses/${courseId}/questions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          updates: [{
            id: questionId,
            status: newFlaggedState ? 'correct/flag' : 'correct',
            selectedAnswer: selectedOriginalIndex,
          }]
        }),
      });
    } catch (error) {
      console.error('Error updating flagged status:', error);
    }
  }, [currentQuestion, flaggedQuestions, userId, courseId, selectedId]);

  const handleNavigate = useCallback((direction) => {
    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < questionCount) {
      setCurrentIndex(nextIndex);
    }
  }, [currentIndex, questionCount]);

  if (questionCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">No questions to review</h3>
        <p className="text-[var(--muted-foreground)] max-w-md">
          Great job! You've answered all questions correctly. Keep up the good work!
        </p>
      </div>
    );
  }

  const completedCount = completedQuestions.size;
  const progressPercent = questionCount > 0 ? (completedCount / questionCount) * 100 : 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Question {currentIndex + 1} of {questionCount}
            </span>
            <span className="text-sm text-[var(--muted-foreground)]">
              • {completedCount} completed
            </span>
          </div>
          {attempts[currentQuestion?.id] > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-[var(--surface-2)] text-[var(--muted-foreground)]">
              {attempts[currentQuestion?.id]} attempt{attempts[currentQuestion?.id] !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        {/* Progress bar */}
        <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Question navigation dots */}
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
          {shuffledData.map((q, idx) => {
            const isCurrentQuestion = idx === currentIndex;
            const isQuestionCompleted = completedQuestions.has(q.id);
            const isQuestionFlagged = flaggedQuestions.has(q.id);
            
            let dotClass = "bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]";
            let icon = null;
            
            if (isQuestionCompleted) {
              if (isQuestionFlagged) {
                dotClass = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
                icon = (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                  </svg>
                );
              } else {
                dotClass = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
                icon = (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                );
              }
            }
            
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`
                  w-8 h-8 rounded-lg border text-sm font-medium
                  transition-all duration-200 cursor-pointer
                  flex items-center justify-center
                  ${dotClass}
                  ${isCurrentQuestion ? "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--background)] scale-110" : "hover:scale-105"}
                `}
              >
                {icon || (idx + 1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion?.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4">
              <div className="text-lg font-medium text-[var(--foreground)] leading-relaxed flex-1">
                {currentQuestion?.questionText ? (
                  <MathJax dynamic>
                    <p>{normalizeLatex(currentQuestion.questionText)}</p>
                  </MathJax>
                ) : (
                  <RichBlock block={currentQuestion?.block} maxWidth="100%" />
                )}
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {currentQuestion?.shuffledOptions.map((opt) => {
              const isSelected = selectedId === opt.id;
              const wasWrongAttempt = currentWrongAttempts.has(opt.id);
              const showCorrectState = answerState === 'correct' && opt.correct;
              const showIncorrectState = answerState === 'incorrect' && isSelected;
              
              // Determine if option should be disabled
              const isDisabled = isCompleted || answerState === 'correct' || wasWrongAttempt || isUpdating;

              return (
                <motion.div
                  key={opt.id}
                  layout
                  className="space-y-0"
                >
                  <div
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={isDisabled ? -1 : 0}
                    className={`
                      group relative flex w-full items-start gap-4 rounded-xl border p-4 
                      transition-all duration-200 focus:outline-none
                      ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                      ${showCorrectState
                        ? "border-emerald-500/50 bg-emerald-500/10" 
                        : showIncorrectState
                        ? "border-rose-500/50 bg-rose-500/10" 
                        : wasWrongAttempt
                        ? "border-rose-500/20 bg-rose-500/5 opacity-50"
                        : isSelected 
                        ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-sm" 
                        : isDisabled
                        ? "border-[var(--border)] bg-[var(--surface-1)] opacity-50"
                        : "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--primary)]/40 hover:bg-[var(--surface-2)]/50"
                      }
                    `}
                    onClick={() => !isDisabled && handleSelect(opt.id)}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && !isDisabled) {
                        e.preventDefault();
                        handleSelect(opt.id);
                      }
                    }}
                  >
                    {/* Option letter badge */}
                    <div className={`
                      flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200
                      ${showCorrectState
                        ? "bg-emerald-500 text-white" 
                        : showIncorrectState || wasWrongAttempt
                        ? "bg-rose-500 text-white" 
                        : isSelected 
                        ? "bg-[var(--primary)] text-white" 
                        : "bg-[var(--surface-2)] text-[var(--muted-foreground)] group-hover:bg-[var(--primary)]/10 group-hover:text-[var(--primary)]"
                      }
                    `}>
                      {wasWrongAttempt ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        opt.label
                      )}
                    </div>

                    {/* Option content */}
                    <div className={`flex-1 min-w-0 pt-0.5 ${wasWrongAttempt ? "line-through decoration-rose-500/50" : ""}`}>
                      <div className="text-[var(--foreground)]">
                        {opt.valueText ? (
                          <MathJax dynamic>
                            <span>{normalizeLatex(opt.valueText)}</span>
                          </MathJax>
                        ) : (
                          <RichBlock block={opt.block} maxWidth="100%" />
                        )}
                      </div>
                    </div>

                    {/* Status indicator */}
                    {showCorrectState && (
                      <div className="flex items-center gap-1.5 text-emerald-500">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}

                    {showIncorrectState && (
                      <div className="flex items-center gap-1.5 text-rose-500">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Wrong answer explanation - show when this specific option is selected and wrong */}
                  <AnimatePresence>
                    {showIncorrectState && (opt.explanation || opt.explanationText) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 ml-12 p-4 rounded-lg bg-rose-500/5 border border-rose-500/20">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-rose-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <svg className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400 mb-1">
                                Why this is incorrect
                              </p>
                              <div className="text-sm text-rose-700 dark:text-rose-300 leading-relaxed">
                                {opt.explanationText ? (
                                  <MathJax dynamic>
                                    <p>{normalizeLatex(opt.explanationText)}</p>
                                  </MathJax>
                                ) : (
                                  <RichBlock block={opt.explanation} maxWidth="100%" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Feedback and Action Area */}
          <AnimatePresence mode="wait">
            {/* Correct Answer Feedback */}
            {answerState === 'correct' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                        Correct! 🎉
                      </h3>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300">
                        {attempts[currentQuestion?.id] === 1 
                          ? "You got it on the first try!" 
                          : `You got it after ${attempts[currentQuestion?.id]} attempts.`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Flag option */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isFlagged 
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" 
                        : "bg-[var(--surface-2)] text-[var(--muted-foreground)]"
                    }`}>
                      <svg 
                        className="w-5 h-5" 
                        fill={isFlagged ? "currentColor" : "none"} 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {isFlagged ? "Flagged for future review" : "Flag this question?"}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {isFlagged 
                          ? "This question will appear in your review list" 
                          : "Add to review list even though you got it right"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleFlag}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isFlagged
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25"
                        : "bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {isFlagged ? "Unflag" : "Flag"}
                  </button>
                </div>

                {/* Continue button */}
                <button
                  onClick={handleContinue}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                >
                  {currentIndex < questionCount - 1 ? (
                    <>
                      Continue to Next Question
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  ) : (
                    <>
                      Complete Review
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {/* Incorrect Answer Feedback */}
            {answerState === 'incorrect' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="p-5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-rose-600 dark:text-rose-400 mb-1">
                        Not quite right
                      </h3>
                      <p className="text-sm text-rose-700 dark:text-rose-300">
                        That answer is incorrect. Read the explanation above and try again!
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleTryAgain}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-semibold hover:opacity-90 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </button>
              </motion.div>
            )}

            {/* Check Answer button - only show when option selected but not yet checked */}
            {selectedId && !answerState && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <button
                  onClick={handleCheckAnswer}
                  disabled={isUpdating}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-semibold hover:opacity-90 transition-colors disabled:opacity-50"
                >
                  {isUpdating ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Checking...
                    </>
                  ) : (
                    <>
                      Check Answer
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {/* Prompt to select an answer */}
            {!selectedId && !answerState && !isCompleted && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-4"
              >
                <p className="text-sm text-[var(--muted-foreground)]">
                  Select an answer to check if it's correct
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation for completed questions */}
          {isCompleted && (
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => handleNavigate(-1)}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              
              <button
                onClick={() => handleNavigate(1)}
                disabled={currentIndex === questionCount - 1}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
