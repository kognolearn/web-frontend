"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import RichBlock from "@/components/content/RichBlock";
import { hasRichContent, toRichBlock } from "@/utils/richText";
import Tooltip from "@/components/ui/Tooltip";
import OnboardingTooltip from "@/components/ui/OnboardingTooltip";

/**
 * Seeded random number generator for consistent shuffling per question
 * Uses a simple mulberry32 algorithm
 */
function seededRandom(seed) {
  let t = seed + 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

/**
 * Create a deterministic seed from a string (question ID + lesson context)
 */
function stringToSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Shuffle an array with a seeded random, returning the shuffled array and index mapping
 * Returns { shuffled, originalToShuffled, shuffledToOriginal }
 */
function shuffleWithMapping(array, seed) {
  const indices = array.map((_, i) => i);
  const shuffledIndices = [...indices];
  
  // Fisher-Yates shuffle with seeded random
  for (let i = shuffledIndices.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
  }
  
  const shuffled = shuffledIndices.map(i => array[i]);
  const originalToShuffled = {};
  const shuffledToOriginal = {};
  
  shuffledIndices.forEach((originalIdx, shuffledIdx) => {
    originalToShuffled[originalIdx] = shuffledIdx;
    shuffledToOriginal[shuffledIdx] = originalIdx;
  });
  
  return { shuffled, originalToShuffled, shuffledToOriginal };
}

function normalizeRichBlock(value) {
  const block = toRichBlock(value);
  return hasRichContent(block) ? block : { content: [] };
}

function collectPlainText(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map(collectPlainText).join(" ");
  }
  if (typeof value === "object") {
    let text = "";
    if (typeof value.text === "string") text += ` ${value.text}`;
    if (typeof value.value === "string") text += ` ${value.value}`;
    if (value.children) text += ` ${collectPlainText(value.children)}`;
    if (value.content) text += ` ${collectPlainText(value.content)}`;
    return text;
  }
  return "";
}

function extractPlainTextFromBlock(block) {
  if (!block) return "";
  if (typeof block === "string") return block;
  return collectPlainText(block.content ?? block).replace(/\s+/g, " ").trim();
}

function extractBraceSegment(str, startIndex) {
  if (str[startIndex] !== "{") return null;
  let depth = 0;
  for (let i = startIndex; i < str.length; i++) {
    const char = str[i];
    if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) {
        return {
          segment: str.slice(startIndex, i + 1),
          nextIndex: i + 1,
        };
      }
    }
  }
  return null;
}

function splitInlineLatexSegments(str) {
  if (typeof str !== "string" || !str.includes("\\")) return null;

  const segments = [];
  let hasMath = false;
  let cursor = 0;
  let textStart = 0;

  const flushText = (endIndex) => {
    if (endIndex > textStart) {
      segments.push({ type: "text", value: str.slice(textStart, endIndex) });
    }
  };

  while (cursor < str.length) {
    if (str[cursor] === "\\") {
      let cmdEnd = cursor + 1;
      while (cmdEnd < str.length && /[A-Za-z]/.test(str[cmdEnd])) {
        cmdEnd++;
      }

      if (cmdEnd === cursor + 1) { // lone backslash, treat as text
        cursor++;
        continue;
      }

      flushText(cursor);

      let latex = str.slice(cursor, cmdEnd);
      let scanIndex = cmdEnd;

      // Capture consecutive braced groups (e.g., \frac{a}{b})
      while (scanIndex < str.length && str[scanIndex] === "{") {
        const brace = extractBraceSegment(str, scanIndex);
        if (!brace) break;
        latex += brace.segment;
        scanIndex = brace.nextIndex;
      }

      // Capture superscripts/subscripts like ^2 or _{n}
      while (scanIndex < str.length && (str[scanIndex] === "^" || str[scanIndex] === "_")) {
        const symbol = str[scanIndex];
        let nextIndex = scanIndex + 1;
        if (str[nextIndex] === "{") {
          const brace = extractBraceSegment(str, nextIndex);
          if (!brace) break;
          latex += symbol + brace.segment;
          nextIndex = brace.nextIndex;
        } else {
          latex += str.slice(scanIndex, Math.min(str.length, scanIndex + 2));
          nextIndex = Math.min(str.length, scanIndex + 2);
        }
        scanIndex = nextIndex;
      }

      segments.push({ type: "math", value: latex });
      hasMath = true;
      cursor = scanIndex;
      textStart = scanIndex;
      continue;
    }

    cursor++;
  }

  flushText(str.length);

  return hasMath ? segments : null;
}

function normalizeTextValue(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function matchOptionTextIndex(options, value) {
  const normalized = normalizeTextValue(value);
  if (!normalized) return null;
  const matchIndex = options.findIndex((opt) => {
    const candidates = [opt.id, opt.label, opt.valueText, opt.plainText];
    return candidates.some((candidate) => normalizeTextValue(candidate) === normalized);
  });
  return matchIndex >= 0 ? matchIndex : null;
}

function coerceNumericIndex(rawValue, length) {
  if (!Number.isFinite(rawValue)) return null;
  const zeroBased = Math.trunc(rawValue);
  if (zeroBased >= 0 && zeroBased < length) return zeroBased;
  const oneBased = zeroBased - 1;
  if (oneBased >= 0 && oneBased < length) return oneBased;
  return null;
}

function parseNumericCandidate(value, length) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^[-+]?\d+$/.test(trimmed)) return null;
  const numeric = Number.parseInt(trimmed, 10);
  return coerceNumericIndex(numeric, length);
}

function resolveCorrectIndexFromCandidate(candidate, options) {
  if (candidate === undefined || candidate === null || !Array.isArray(options) || options.length === 0) {
    return null;
  }

  const length = options.length;

  if (typeof candidate === "number") {
    return coerceNumericIndex(candidate, length);
  }

  if (typeof candidate === "string") {
    const numericIndex = parseNumericCandidate(candidate, length);
    if (numericIndex !== null) return numericIndex;
    return matchOptionTextIndex(options, candidate);
  }

  if (Array.isArray(candidate)) {
    const text = candidate.map((entry) => (typeof entry === "string" ? entry : "")).join(" ");
    if (text) {
      const idx = matchOptionTextIndex(options, text);
      if (idx !== null) return idx;
    }
    return null;
  }

  if (typeof candidate === "object") {
    if (typeof candidate.index === "number") {
      const idx = coerceNumericIndex(candidate.index, length);
      if (idx !== null) return idx;
    }

    if (typeof candidate.id === "string") {
      const idx = options.findIndex(
        (opt) => normalizeTextValue(opt.id) === normalizeTextValue(candidate.id)
      );
      if (idx !== -1) return idx;
    }

    const candidateText =
      candidate.text ??
      candidate.value ??
      candidate.label ??
      (candidate.block ? extractPlainTextFromBlock(normalizeRichBlock(candidate.block)) : null) ??
      (Array.isArray(candidate.content)
        ? extractPlainTextFromBlock(normalizeRichBlock({ content: candidate.content }))
        : null);

    if (candidateText) {
      const idx = matchOptionTextIndex(options, candidateText);
      if (idx !== null) return idx;
    }
  }

  return null;
}

function applyQuestionLevelCorrectness(sourceQuestion, options) {
  if (!Array.isArray(options) || options.length === 0) return;
  if (options.some((opt) => opt.correct)) return;

  const candidates = [
    sourceQuestion?.correctIndex,
    sourceQuestion?.correct_index,
    sourceQuestion?.answerIndex,
    sourceQuestion?.answer_index,
    sourceQuestion?.correctOption,
    sourceQuestion?.correct_option,
    sourceQuestion?.correctOptionId,
    sourceQuestion?.correct_option_id,
    sourceQuestion?.correctAnswer,
    sourceQuestion?.correct_answer,
    sourceQuestion?.answer,
    sourceQuestion?.solution,
  ];

  for (const candidate of candidates) {
    const idx = resolveCorrectIndexFromCandidate(candidate, options);
    if (idx !== null) {
      options[idx].correct = true;
      break;
    }
  }
}

function getOptionLabel(option, index) {
  if (option?.label) return option.label;
  return String.fromCharCode("A".charCodeAt(0) + index);
}

function normalizeOption(option, index, optionExplanation = null) {
  const blockSource =
    option?.block ?? (option?.content ? { content: option.content } : option);
  const feedbackBlock = option?.feedback ? normalizeRichBlock(option.feedback) : null;
  const block = normalizeRichBlock(blockSource);
  const fallbackValue =
    typeof option === "string"
      ? option
      : option?.value ?? option?.text ?? (typeof option?.label === "string" ? option.label : null);
  const plainText = extractPlainTextFromBlock(block);
  
  // Handle explanation - can come from option itself or from question-level array
  let explanationBlock = null;
  if (optionExplanation) {
    explanationBlock = normalizeRichBlock(optionExplanation);
  } else if (option?.explanation) {
    explanationBlock = normalizeRichBlock(option.explanation);
  }
  
  return {
    id: option?.id ?? String(index),
    label: getOptionLabel(option, index),
    block,
    correct: Boolean(option?.correct),
    feedback: feedbackBlock && hasRichContent(feedbackBlock) ? feedbackBlock : null,
    explanation: explanationBlock && hasRichContent(explanationBlock) ? explanationBlock : null,
    valueText: typeof fallbackValue === "string" ? fallbackValue : null,
    plainText,
  };
}

function normalizeQuestion(item, index) {
  const blockSource =
    item?.question ??
    item?.prompt ??
    item?.block ??
    (item?.content ? { content: item.content } : item);

  // Check if explanation is an array (per-option explanations) or a single value
  const explanationIsArray = Array.isArray(item?.explanation);
  const optionExplanations = explanationIsArray ? item.explanation : [];
  
  const options = Array.isArray(item?.options) 
    ? item.options.map((opt, idx) => normalizeOption(opt, idx, optionExplanations[idx] || null)) 
    : [];
  applyQuestionLevelCorrectness(item, options);

  // Only use question-level explanation if it's not an array (for backward compatibility)
  const questionExplanationBlock = !explanationIsArray && item?.explanation 
    ? normalizeRichBlock(item.explanation) 
    : null;

  return {
    // Use backend-provided UUID if available, otherwise fall back to index
    id: item?.id ?? String(index),
    // Include status from backend (correct, incorrect, unattempted)
    status: item?.status ?? null,
    // Include the user's previously selected answer index from backend
    selectedAnswer: item?.selectedAnswer ?? null,
    block: normalizeRichBlock(blockSource),
    options,
    explanation:
      questionExplanationBlock && hasRichContent(questionExplanationBlock) ? questionExplanationBlock : null,
    hasOptionExplanations: explanationIsArray && optionExplanations.length > 0,
  };
}

function toZeroBasedCorrectIndex(rawValue) {
  if (rawValue === undefined || rawValue === null) return null;
  const parsed = Number.parseInt(rawValue, 10);
  if (Number.isNaN(parsed)) return null;
  const zeroBased = parsed - 1;
  return zeroBased >= 0 ? zeroBased : null;
}

function extractSequenceFromValue(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "object") {
    if (Array.isArray(value.blocks)) return value.blocks;
    if (Array.isArray(value.content)) return value.content;
    if (Array.isArray(value.sequence)) return value.sequence;
  }

  return [];
}

function normalizeSequenceQuestion(value, index, keyOverride) {
  const rawSequence = extractSequenceFromValue(value);
  if (rawSequence.length < 3) {
    return null;
  }

  const baseId =
    (typeof value === "object" && value !== null && value.id) ||
    (keyOverride !== undefined ? keyOverride : null) ||
    String(index);

  const rawCorrect =
    (typeof value === "object" && value !== null
      ? value.correctOption ??
        value.correctAnswer ??
        value.answer ??
        value.correct ??
        value.correctIndex ??
        value.solution ??
        value.answerIndex
      : undefined);
  const zeroBasedCorrect = toZeroBasedCorrectIndex(rawCorrect);

  const questionBlock = normalizeRichBlock(rawSequence[0]);
  if (!hasRichContent(questionBlock)) {
    return null;
  }

  const explanationBlock = normalizeRichBlock(rawSequence[rawSequence.length - 1]);
  const optionBlocks = rawSequence.slice(1, -1).map(normalizeRichBlock);

  const options = optionBlocks.map((block, optionIndex) => ({
    id: `${baseId}-option-${optionIndex}`,
    label: getOptionLabel({}, optionIndex),
    block,
    correct: zeroBasedCorrect === optionIndex,
    feedback: null,
  }));

  if (zeroBasedCorrect === null || zeroBasedCorrect >= options.length) {
    options.forEach((option) => {
      option.correct = false;
    });
  }

  // Get status from backend if available
  const status = (typeof value === "object" && value !== null && value.status) || null;

  return {
    id: baseId,
    status,
    block: questionBlock,
    options,
    explanation: explanationBlock,
  };
}

/**
 * Quiz component
 *
 * Props:
 *  - question: RichBlock-compatible value (object|string|array)
 *  - options: Array<{
 *      id?: string,
 *      label?: string,
 *      block?: RichBlock-compatible,
 *      content?: Array (alias for block.content),
 *      correct?: boolean,
 *      feedback?: RichBlock-compatible
 *    }>
 *  - onAnswer?: ({ id, option, isCorrect }) => void
 *  - userId?: string - user identifier for progress tracking
 *  - courseId?: string - course identifier for progress tracking
 *  - lessonId?: string - lesson/node identifier for progress tracking
 *
 * The component assumes a single-correct-answer quiz. Selecting an option
 * reveals whether it is correct (when the `correct` flag is provided) and
 * surfaces any rich feedback block supplied on the option.
 */
export default function Quiz({ 
  questions, 
  question, 
  options = [], 
  onAnswer, 
  onQuestionChange,
  userId,
  courseId,
  lessonId,
  onQuizCompleted,
}) {
  const normalizedQuestions = useMemo(() => {
    if (questions && typeof questions === "object" && !Array.isArray(questions)) {
      const sequenceLike = Object.entries(questions)
        .map(([key, value], index) => normalizeSequenceQuestion(value, index, key))
        .filter(Boolean);
      if (sequenceLike.length > 0) {
        return sequenceLike;
      }
    }

    if (Array.isArray(questions) && questions.length > 0) {
      const sequenceLike = questions.map((item, index) => normalizeSequenceQuestion(item, index)).filter(Boolean);
      if (sequenceLike.length > 0) {
        return sequenceLike;
      }

      return questions
        .map((item, index) => normalizeQuestion(item, index))
        .filter(
          (item) =>
            hasRichContent(item.block) ||
            item.options.some((opt) => opt && hasRichContent(opt.block))
        );
    }

    if (question || options.length > 0) {
      return [
        {
          id: "0",
          block: normalizeRichBlock(question),
          options: options.map((opt, idx) => normalizeOption(opt, idx, null)),
        },
      ];
    }

    return [];
  }, [questions, question, options]);

  // Create shuffled options for each question (only if not already submitted)
  // The shuffle is deterministic based on question ID + courseId + lessonId
  const shuffledQuestionsData = useMemo(() => {
    return normalizedQuestions.map((q) => {
      const seedString = `${q.id}-${courseId || ''}-${lessonId || ''}`;
      const seed = stringToSeed(seedString);
      const { shuffled, originalToShuffled, shuffledToOriginal } = shuffleWithMapping(q.options, seed);
      
      // Reassign labels (A, B, C, D) to shuffled options
      const shuffledWithLabels = shuffled.map((opt, idx) => ({
        ...opt,
        label: String.fromCharCode("A".charCodeAt(0) + idx),
        originalIndex: shuffledToOriginal[idx],
      }));
      
      return {
        ...q,
        shuffledOptions: shuffledWithLabels,
        originalToShuffled,
        shuffledToOriginal,
      };
    });
  }, [normalizedQuestions, courseId, lessonId]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [revealedByQuestion, setRevealedByQuestion] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedExplanations, setExpandedExplanations] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState({});
  const [strikethroughOptions, setStrikethroughOptions] = useState({});

  // Track the last notification sent to parent to prevent duplicate calls
  const lastNotificationRef = useRef(null);

  const currentQuestion = normalizedQuestions[currentIndex] ?? null;
  const currentShuffledData = shuffledQuestionsData[currentIndex] ?? null;
  const questionCount = normalizedQuestions.length;
  
  // Check if current question has per-option explanations
  const hasOptionExplanations = currentQuestion?.hasOptionExplanations || 
    currentQuestion?.options?.some(opt => opt.explanation);
  
  // Use shuffled options when quiz not submitted, original when submitted (for review)
  const displayOptions = useMemo(() => {
    if (!currentQuestion) return [];
    if (isSubmitted) {
      // When submitted, show original order for consistent review
      return currentQuestion.options;
    }
    // Before submission, show shuffled options
    return currentShuffledData?.shuffledOptions || currentQuestion.options;
  }, [currentQuestion, currentShuffledData, isSubmitted]);

  const questionsSignature = useMemo(() => {
    if (normalizedQuestions.length === 0) return "__empty__";
    try {
      return JSON.stringify(
        normalizedQuestions.map((question) => ({
          id: question.id,
          status: question.status,
          optionIds: question.options.map((opt) => opt.id),
          optionCorrect: question.options.map((opt) => Boolean(opt.correct)),
          explanation: Boolean(question.explanation && hasRichContent(question.explanation)),
        }))
      );
    } catch {
      return `${normalizedQuestions.length}-${Date.now()}`;
    }
  }, [normalizedQuestions]);

  useEffect(() => {
    setCurrentIndex(0);
    setIsSubmitting(false);
    setExpandedExplanations({});
    setStrikethroughOptions({});
    lastNotificationRef.current = null;
    
    // Derive initial state from backend status on each question
    // If any question has a status of 'correct', 'incorrect', or 'correct/flag', the quiz was previously submitted
    const hasAnsweredQuestions = normalizedQuestions.some(
      q => q.status === 'correct' || q.status === 'incorrect' || q.status === 'correct/flag'
    );
    
    if (hasAnsweredQuestions) {
      // Mark quiz as submitted since we have answered questions from backend
      setIsSubmitted(true);
      
      // Restore user's selected answers from backend
      const restoredResponses = {};
      normalizedQuestions.forEach(q => {
        if (q.selectedAnswer !== null && q.selectedAnswer !== undefined && q.options[q.selectedAnswer]) {
          // Map the selectedAnswer index to the option ID
          restoredResponses[q.id] = q.options[q.selectedAnswer].id;
        }
      });
      setResponses(restoredResponses);
      
      // Mark all questions with status as revealed
      const revealed = {};
      normalizedQuestions.forEach(q => {
        if (q.status === 'correct' || q.status === 'incorrect' || q.status === 'correct/flag') {
          revealed[q.id] = true;
        }
      });
      setRevealedByQuestion(revealed);
      
      // Initialize flagged questions from 'correct/flag' status only
      const flagged = {};
      normalizedQuestions.forEach(q => {
        if (q.status === 'correct/flag') {
          flagged[q.id] = true;
        }
      });
      setFlaggedQuestions(flagged);
    } else {
      setIsSubmitted(false);
      setResponses({});
      setRevealedByQuestion({});
      setFlaggedQuestions({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionsSignature]);

  useEffect(() => {
    setCurrentIndex((prev) => {
      if (questionCount === 0) return 0;
      return prev >= questionCount ? questionCount - 1 : prev;
    });
  }, [questionCount]);

  const selectedId = currentQuestion ? responses[currentQuestion.id] ?? null : null;
  const revealed = currentQuestion
    ? isSubmitted || Boolean(revealedByQuestion[currentQuestion.id])
    : false;
  const anyCorrect = currentQuestion ? currentQuestion.options.some((opt) => opt.correct) : false;
  const explanationBlock = currentQuestion?.explanation ?? null;
  const isReviewMode = isSubmitted;
  const showExplanation =
    revealed && explanationBlock && Array.isArray(explanationBlock.content) && explanationBlock.content.length > 0;

  const handleSelect = useCallback(
    (optionId) => {
      if (isSubmitted) return;
      const questionEntry = normalizedQuestions[currentIndex];
      if (!questionEntry) return;

  setResponses((prev) => ({ ...prev, [questionEntry.id]: optionId }));

      const option = questionEntry.options.find((item) => item.id === optionId) || null;
      if (option && typeof onAnswer === "function") {
        onAnswer({
          questionId: questionEntry.id,
          question: questionEntry,
          id: optionId,
          option,
          isCorrect: option.correct,
        });
      }
    },
    [currentIndex, isSubmitted, normalizedQuestions, onAnswer]
  );

  const handleSubmit = useCallback(async () => {
    if (isSubmitted || isSubmitting || questionCount === 0) return;

    setIsSubmitting(true);

    // Calculate score first
    let correctCount = 0;
    let totalCount = 0;
    const quizAnswers = {};
    const questionStatusUpdates = [];

    normalizedQuestions.forEach((question) => {
      if (!question?.id || !Array.isArray(question.options)) return;
      
      totalCount++;
      const userResponseId = responses[question.id];
      if (!userResponseId) {
        // Mark unanswered questions as unattempted
        questionStatusUpdates.push({
          id: question.id,
          status: 'unattempted'
        });
        return;
      }

      const selectedOptionIndex = question.options.findIndex((opt) => opt.id === userResponseId);
      const selectedOption = selectedOptionIndex >= 0 ? question.options[selectedOptionIndex] : null;
      const isCorrect = selectedOption?.correct || false;
      
      quizAnswers[question.id] = {
        selectedOptionId: userResponseId,
        isCorrect
      };
      
      // Add to status updates for the PATCH request
      // Include selectedAnswer (the option index) along with status
      questionStatusUpdates.push({
        id: question.id,
        status: isCorrect ? 'correct' : 'incorrect',
        selectedAnswer: selectedOptionIndex >= 0 ? selectedOptionIndex : null
      });
      
      if (isCorrect) {
        correctCount++;
      }
    });

    const familiarityScore = totalCount > 0 ? correctCount / totalCount : 0;

    // Update progress if tracking info is available
    if (userId && courseId && lessonId) {
      try {
        const allCorrect = totalCount > 0 && correctCount === totalCount;
        const masteryStatus = allCorrect ? 'mastered' : 'needs_review';

        // Send both progress update and question status updates in parallel
        const progressPromise = fetch(`/api/courses/${courseId}/nodes/${lessonId}/progress`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            mastery_status: masteryStatus,
            familiarity_score: familiarityScore,
          }),
        });

        // Send question status updates
        const questionStatusPromise = questionStatusUpdates.length > 0 
          ? fetch(`/api/courses/${courseId}/questions`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                updates: questionStatusUpdates
              }),
            })
          : Promise.resolve({ ok: true });

        const [progressResponse, questionStatusResponse] = await Promise.all([
          progressPromise,
          questionStatusPromise
        ]);

        if (!progressResponse.ok) {
          throw new Error(`Progress update failed: ${progressResponse.status}`);
        }

        if (questionStatusResponse && !questionStatusResponse.ok) {
          console.error('Question status update failed:', questionStatusResponse.status);
        }

        // Notify parent that quiz was completed successfully
        if (typeof onQuizCompleted === 'function') {
          await onQuizCompleted({ masteryStatus, familiarityScore });
        }
      } catch (error) {
        console.error('Failed to update quiz progress:', error);
      }
    } else if (typeof onQuizCompleted === 'function') {
      // Still notify parent even if not updating server
      const allCorrect = totalCount > 0 && correctCount === totalCount;
      const masteryStatus = allCorrect ? 'mastered' : 'needs_review';
      onQuizCompleted({ masteryStatus, familiarityScore });
    }

    // Now reveal answers
    setIsSubmitted(true);
    setRevealedByQuestion((prev) => {
      const next = { ...prev };
      normalizedQuestions.forEach((question) => {
        if (question?.id) {
          next[question.id] = true;
        }
      });
      return next;
    });
    setCurrentIndex(0);
    setIsSubmitting(false);
  }, [isSubmitted, isSubmitting, normalizedQuestions, questionCount, responses, userId, courseId, lessonId, onQuizCompleted]);

  const handleNavigate = useCallback(
    (direction) => {
      setCurrentIndex((prev) => {
        const next = prev + direction;
        if (next < 0) return 0;
        if (next >= questionCount) return questionCount - 1;
        return next;
      });
    },
    [questionCount]
  );

  const handleFlagQuestion = useCallback(
    async (questionId) => {
      if (!isSubmitted || !userId || !courseId) return;
      
      // Only allow flagging for correct questions
      const question = normalizedQuestions.find(q => q.id === questionId);
      if (!question) return;
      
      const userResponse = responses[questionId];
      const selectedOptionIndex = question.options.findIndex((opt) => opt.id === userResponse);
      const selectedOpt = selectedOptionIndex >= 0 ? question.options[selectedOptionIndex] : null;
      const isCorrect = selectedOpt?.correct;
      
      // Only correct questions can be flagged
      if (!isCorrect) return;
      
      // Toggle flag state
      const isCurrentlyFlagged = flaggedQuestions[questionId];
      const newFlaggedState = !isCurrentlyFlagged;
      
      // Update local state immediately for responsive UI
      setFlaggedQuestions((prev) => ({
        ...prev,
        [questionId]: newFlaggedState
      }));
      
      // Send PATCH request to update the status
      try {
        const response = await fetch(`/api/courses/${courseId}/questions`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            updates: [{
              id: questionId,
              status: newFlaggedState ? 'correct/flag' : 'correct',
              selectedAnswer: selectedOptionIndex >= 0 ? selectedOptionIndex : null
            }]
          }),
        });
        
        if (!response.ok) {
          console.error('Failed to update flagged question status:', response.status);
        }
      } catch (error) {
        console.error('Error flagging question:', error);
      }
    },
    [isSubmitted, userId, courseId, flaggedQuestions, normalizedQuestions, responses]
  );

  const questionLabelId = currentQuestion ? `quiz-question-${currentQuestion.id}` : undefined;

  // Notify parent when selection changes so chat context can stay in sync
  useEffect(() => {
    if (typeof onQuestionChange !== "function") return;
    
    if (!currentQuestion) {
      // Only notify "null" if we haven't already done so
      if (lastNotificationRef.current !== "null") {
        lastNotificationRef.current = "null";
        onQuestionChange(null);
      }
      return;
    }

    const selId = selectedId;
    const selectedIndex = selId ? currentQuestion.options.findIndex((o) => o.id === selId) : null;
    const opt =
      selectedIndex !== null && selectedIndex >= 0
        ? currentQuestion.options[selectedIndex]
        : null;

    // extract simple text for the question; fall back to id if not available
    let questionText = undefined;
    if (currentQuestion?.block && Array.isArray(currentQuestion.block.content)) {
      const t = currentQuestion.block.content.find((n) => n && typeof n.text === "string");
      if (t) questionText = t.text.slice(0, 500);
    }

    const payload = {
      questionId: currentQuestion.id,
      index: currentIndex,
      selectedId: selId,
      selectedIndex: selectedIndex !== null && selectedIndex >= 0 ? selectedIndex : null,
      isCorrect: !!opt?.correct,
      revealed,
      submitted: isSubmitted,
      questionText,
      // Do not include optionLabels in the comparison key as it might be large/complex
    };

    // THE FIX: Compare payload with the last one sent.
    // We use JSON.stringify for a deep comparison of simple values.
    const payloadString = JSON.stringify(payload);
    
    if (lastNotificationRef.current !== payloadString) {
      lastNotificationRef.current = payloadString;
      
      // Re-add fields that were excluded from the comparison key if needed
      onQuestionChange({
        ...payload,
        optionLabels: displayOptions.map((o) => o.label).slice(0, 10),
      });
    }
  }, [currentQuestion?.id, currentIndex, revealed, selectedId, isSubmitted, onQuestionChange, displayOptions]);

  // Calculate progress stats for review mode
  const progressStats = useMemo(() => {
    if (!isSubmitted) return null;
    let correct = 0;
    let answered = 0;
    normalizedQuestions.forEach((q) => {
      const userResponse = responses[q.id];
      if (userResponse) {
        answered++;
        const selectedOpt = q.options.find((opt) => opt.id === userResponse);
        if (selectedOpt?.correct) correct++;
      }
    });
    return { correct, answered, total: questionCount };
  }, [isSubmitted, normalizedQuestions, responses, questionCount]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      {questionCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-[var(--muted-foreground)]">No questions available.</p>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <OnboardingTooltip
            id="quiz-progress"
            content="Click on any dot to jump to that question. The bar shows your progress through the quiz. Once you've answered all questions, click 'Submit Quiz' to see your results and explanations!"
            position="bottom"
            pointerPosition="center"
            delay={600}
            priority={12}
          >
            <div className="mb-8">
            <div className="flex flex-col gap-1 mb-3">
              <span className="text-sm font-medium text-[var(--foreground)]">
                Question {currentIndex + 1} of {questionCount}
              </span>
              {isSubmitted && progressStats && (
                <span className="text-sm font-medium text-emerald-500">
                  {progressStats.correct}/{progressStats.total} correct
                </span>
              )}
            </div>
            <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[var(--primary)] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${((currentIndex + 1) / questionCount) * 100}%` }}
              />
            </div>
            {/* Question navigation */}
            <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
              {normalizedQuestions.map((q, idx) => {
                const isAnswered = !!responses[q.id];
                const isCurrent = idx === currentIndex;
                const isFlagged = flaggedQuestions[q.id];
                const userResponse = responses[q.id];
                const selectedOpt = q.options.find((opt) => opt.id === userResponse);
                const isCorrect = selectedOpt?.correct;
                
                let statusClass = "bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]";
                let icon = null;
                
                if (isSubmitted) {
                  if (isFlagged && isCorrect) {
                    // Flagged correct questions show amber styling with flag icon
                    statusClass = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
                    icon = (
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                      </svg>
                    );
                  } else if (isCorrect) {
                    // Correct questions show green checkmark
                    statusClass = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
                    icon = (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    );
                  } else if (userResponse) {
                    // Incorrect questions show red X
                    statusClass = "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
                    icon = (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    );
                  }
                } else if (isAnswered) {
                  statusClass = "bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)]/30";
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
                      ${statusClass}
                      ${isCurrent ? "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--background)] scale-110" : "hover:scale-105"}
                    `}
                    aria-label={`Go to question ${idx + 1}`}
                    aria-current={isCurrent ? "true" : undefined}
                  >
                    {icon || (idx + 1)}
                  </button>
                );
              })}
            </div>
          </div>
          </OnboardingTooltip>

          {/* Question */}
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4">
              <div id={questionLabelId} className="text-lg font-medium text-[var(--foreground)] leading-relaxed flex-1">
                <RichBlock block={currentQuestion.block} maxWidth="100%" />
              </div>
              {/* Flag button - only show after submission for correct questions */}
              {isSubmitted && currentQuestion && (() => {
                const userResponse = responses[currentQuestion.id];
                const selectedOpt = currentQuestion.options.find((opt) => opt.id === userResponse);
                const isCurrentQuestionCorrect = selectedOpt?.correct;
                
                // Only show flag button for correct questions
                if (!isCurrentQuestionCorrect) return null;
                
                return (
                  <Tooltip 
                    text={flaggedQuestions[currentQuestion.id] ? "Question flagged for review" : "Flag this question if you think it needs review"} 
                    position="left"
                  >
                    <button
                      type="button"
                      onClick={() => handleFlagQuestion(currentQuestion.id)}
                      className={`
                        flex-shrink-0 p-2 rounded-lg transition-all duration-200 cursor-pointer
                        ${flaggedQuestions[currentQuestion.id]
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25"
                          : "bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                        }
                      `}
                      aria-label={flaggedQuestions[currentQuestion.id] ? "Unflag question" : "Flag question for review"}
                    >
                      <svg 
                        className="w-5 h-5" 
                        fill={flaggedQuestions[currentQuestion.id] ? "currentColor" : "none"} 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" 
                        />
                      </svg>
                    </button>
                  </Tooltip>
                );
              })()}
            </div>
            {/* Flagged indicator - only show for correct questions that are flagged */}
            {isSubmitted && currentQuestion && flaggedQuestions[currentQuestion.id] && (() => {
              const userResponse = responses[currentQuestion.id];
              const selectedOpt = currentQuestion.options.find((opt) => opt.id === userResponse);
              const isCurrentQuestionCorrect = selectedOpt?.correct;
              
              if (!isCurrentQuestionCorrect) return null;
              
              return (
                <div className="mt-3 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                  </svg>
                  <span>Flagged for review</span>
                </div>
              );
            })()}
          </div>

          {/* Options */}
          <div role="radiogroup" aria-labelledby={questionLabelId} className="space-y-3">
            {displayOptions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted-foreground)]">
                No options available.
              </div>
            ) : (
              displayOptions.map((opt, optIndex) => {
                const isSelected = selectedId === opt.id;
                const showState = revealed && anyCorrect;
                let status = null;

                if (showState) {
                  if (opt.correct) status = "correct";
                  else if (isSelected) status = "incorrect";
                }

                // Check if option is struck through
                const strikeKey = `${currentQuestion?.id}-${opt.id}`;
                const isStruckThrough = strikethroughOptions[strikeKey] && !isSubmitted;

                // Check if this option has an explanation
                const hasExplanation = opt.explanation && hasRichContent(opt.explanation);
                const explanationKey = `${currentQuestion?.id}-${opt.id}`;
                const isExplanationExpanded = expandedExplanations[explanationKey];

                return (
                  <div key={opt.id} className="space-y-0">
                    <div
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={0}
                      className={`
                        group relative flex w-full items-start gap-4 rounded-xl border p-4 
                        transition-all duration-200 focus:outline-none cursor-pointer
                        ${status === "correct" 
                          ? "border-emerald-500/50 bg-emerald-500/10" 
                          : status === "incorrect" 
                          ? "border-rose-500/50 bg-rose-500/10" 
                          : isSelected 
                          ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-sm" 
                          : "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--primary)]/40 hover:bg-[var(--surface-2)]/50"
                        }
                      `}
                      onClick={() => handleSelect(opt.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleSelect(opt.id);
                        }
                      }}
                    >
                      {/* Option letter badge */}
                      <div className={`
                        flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200
                        ${status === "correct" 
                          ? "bg-emerald-500 text-white" 
                          : status === "incorrect" 
                          ? "bg-rose-500 text-white" 
                          : isSelected 
                          ? "bg-[var(--primary)] text-white" 
                          : "bg-[var(--surface-2)] text-[var(--muted-foreground)] group-hover:bg-[var(--primary)]/10 group-hover:text-[var(--primary)]"
                        }
                      `}>
                        {opt.label}
                      </div>

                      {/* Strikethrough toggle button - only show before submission */}
                      {!isSubmitted && (
                        <Tooltip text={isStruckThrough ? "Remove strikethrough" : "Cross out this option"} position="top">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStrikethroughOptions(prev => ({
                                ...prev,
                                [strikeKey]: !prev[strikeKey]
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
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 4H9a3 3 0 0 0 0 6h6" />
                              <path d="M4 12h16" />
                              <path d="M15 12a3 3 0 1 1 0 6H8" />
                            </svg>
                          </button>
                        </Tooltip>
                      )}

                      {/* Option content */}
                      <div className={`flex-1 min-w-0 pt-0.5 transition-opacity duration-200 ${isStruckThrough ? "opacity-40" : ""}`}>
                        <div className={`text-[var(--foreground)] ${isStruckThrough ? "line-through decoration-2 decoration-rose-500/70" : ""}`}>
                          <RichBlock block={opt.block} maxWidth="100%" />
                        </div>

                        {showState && opt.feedback && (
                          <div className="mt-3 pt-3 border-t border-[var(--border)] text-sm text-[var(--muted-foreground)]">
                            <RichBlock block={opt.feedback} maxWidth="100%" />
                          </div>
                        )}

                        {/* Explanation toggle button - only show after submission */}
                        {showState && hasExplanation && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedExplanations(prev => ({
                                ...prev,
                                [explanationKey]: !prev[explanationKey]
                              }));
                            }}
                            className={`
                              mt-3 flex items-center gap-1.5 text-xs font-medium transition-colors
                              ${status === "correct" 
                                ? "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300" 
                                : status === "incorrect"
                                ? "text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300"
                                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                              }
                            `}
                          >
                            <svg 
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${isExplanationExpanded ? 'rotate-180' : ''}`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            {isExplanationExpanded ? 'Hide explanation' : 'Why is this ' + (opt.correct ? 'correct' : 'incorrect') + '?'}
                          </button>
                        )}

                        {/* Expanded explanation */}
                        {showState && hasExplanation && isExplanationExpanded && (
                          <div className={`
                            mt-3 pt-3 border-t text-sm leading-relaxed
                            ${status === "correct" 
                              ? "border-emerald-500/20 text-emerald-700 dark:text-emerald-300" 
                              : status === "incorrect"
                              ? "border-rose-500/20 text-rose-700 dark:text-rose-300"
                              : "border-[var(--border)] text-[var(--muted-foreground)]"
                            }
                          `}>
                            <RichBlock block={opt.explanation} maxWidth="100%" />
                          </div>
                        )}
                      </div>

                      {/* Status indicator */}
                      {status === "correct" && (
                        <div className="flex items-center gap-1.5 text-emerald-500">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}

                      {status === "incorrect" && (
                        <div className="flex items-center gap-1.5 text-rose-500">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Explanation panel - only show if no per-option explanations */}
          {showExplanation && !hasOptionExplanations && (
            <div className="mt-6 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)] mb-2">
                    Explanation
                  </div>
                  <div className="text-sm text-[var(--foreground)] leading-relaxed">
                    <RichBlock block={explanationBlock} maxWidth="100%" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          {questionCount > 0 && (
            <div className="mt-8 flex items-center justify-between gap-4">
              <Tooltip text="Go to previous question" position="top">
                <button
                  type="button"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  onClick={() => handleNavigate(-1)}
                  onPointerDown={(e) => e.currentTarget.blur()}
                  tabIndex={-1}
                  disabled={currentIndex === 0}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
              </Tooltip>
              
              {currentIndex === questionCount - 1 && !isSubmitted ? (
                <Tooltip text="Submit all answers to see your results" position="top">
                  <button
                    type="button"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    onClick={handleSubmit}
                    onPointerDown={(e) => e.currentTarget.blur()}
                    tabIndex={-1}
                    disabled={isSubmitting || questionCount === 0}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Quiz
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </Tooltip>
              ) : (
                <Tooltip text="Go to next question" position="top">
                  <button
                    type="button"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--primary)] text-sm font-semibold text-white hover:opacity-90 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    onClick={() => handleNavigate(1)}
                    onPointerDown={(e) => e.currentTarget.blur()}
                    tabIndex={-1}
                    disabled={currentIndex === questionCount - 1}
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </Tooltip>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
