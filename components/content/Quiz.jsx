"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import RichBlock from "@/components/content/RichBlock";
import { hasRichContent, toRichBlock } from "@/utils/richText";
import Tooltip from "@/components/ui/Tooltip";
import OnboardingTooltip from "@/components/ui/OnboardingTooltip";
import { saveQuizSubmission, getQuizProgress, isQuizCompleted } from "@/utils/lessonProgress";

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

function normalizeOption(option, index) {
  const blockSource =
    option?.block ?? (option?.content ? { content: option.content } : option);
  const feedbackBlock = option?.feedback ? normalizeRichBlock(option.feedback) : null;
  const block = normalizeRichBlock(blockSource);
  const fallbackValue =
    typeof option === "string"
      ? option
      : option?.value ?? option?.text ?? (typeof option?.label === "string" ? option.label : null);
  const plainText = extractPlainTextFromBlock(block);
  return {
    id: option?.id ?? String(index),
    label: getOptionLabel(option, index),
    block,
    correct: Boolean(option?.correct),
    feedback: feedbackBlock && hasRichContent(feedbackBlock) ? feedbackBlock : null,
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

  const options = Array.isArray(item?.options) ? item.options.map(normalizeOption) : [];
  applyQuestionLevelCorrectness(item, options);

  const explanationBlock = item?.explanation ? normalizeRichBlock(item.explanation) : null;

  return {
    id: item?.id ?? String(index),
    block: normalizeRichBlock(blockSource),
    options,
    explanation:
      explanationBlock && hasRichContent(explanationBlock) ? explanationBlock : null,
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

  return {
    id: baseId,
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
          options: options.map(normalizeOption),
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

  // Track the last notification sent to parent to prevent duplicate calls
  const lastNotificationRef = useRef(null);

  const currentQuestion = normalizedQuestions[currentIndex] ?? null;
  const currentShuffledData = shuffledQuestionsData[currentIndex] ?? null;
  const questionCount = normalizedQuestions.length;
  
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
    setResponses({});
    setRevealedByQuestion({});
    setIsSubmitted(false);
    setIsSubmitting(false);
    lastNotificationRef.current = null;
    
    // Restore quiz state from localStorage if already submitted
    if (courseId && lessonId) {
      const savedProgress = getQuizProgress(courseId, lessonId);
      if (savedProgress.submitted && savedProgress.answers) {
        // Restore responses - map from our storage format to the responses format
        const restoredResponses = {};
        Object.entries(savedProgress.answers).forEach(([questionId, answer]) => {
          restoredResponses[questionId] = answer.selectedOptionId;
        });
        setResponses(restoredResponses);
        setIsSubmitted(true);
        // Mark all questions as revealed
        const revealed = {};
        Object.keys(savedProgress.answers).forEach(questionId => {
          revealed[questionId] = true;
        });
        setRevealedByQuestion(revealed);
      }
    }
  }, [questionsSignature, courseId, lessonId]);

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

    normalizedQuestions.forEach((question) => {
      if (!question?.id || !Array.isArray(question.options)) return;
      
      totalCount++;
      const userResponseId = responses[question.id];
      if (!userResponseId) return;

      const selectedOption = question.options.find((opt) => opt.id === userResponseId);
      const isCorrect = selectedOption?.correct || false;
      
      quizAnswers[question.id] = {
        selectedOptionId: userResponseId,
        isCorrect
      };
      
      if (isCorrect) {
        correctCount++;
      }
    });

    const familiarityScore = totalCount > 0 ? correctCount / totalCount : 0;

    // Save quiz submission to localStorage
    if (courseId && lessonId) {
      saveQuizSubmission(courseId, lessonId, quizAnswers, familiarityScore, totalCount);
    }

    // Update progress if tracking info is available
    if (userId && courseId && lessonId) {
      try {
        const allCorrect = totalCount > 0 && correctCount === totalCount;
        const masteryStatus = allCorrect ? 'mastered' : 'needs_review';

        const response = await fetch(`/api/courses/${courseId}/nodes/${lessonId}/progress`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            mastery_status: masteryStatus,
            familiarity_score: familiarityScore,
          }),
        });

        if (!response.ok) {
          throw new Error(`Progress update failed: ${response.status}`);
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
                let statusClass = "bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]";
                let icon = null;
                
                if (isSubmitted) {
                  const userResponse = responses[q.id];
                  const selectedOpt = q.options.find((opt) => opt.id === userResponse);
                  if (selectedOpt?.correct) {
                    statusClass = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
                    icon = (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    );
                  } else if (userResponse) {
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
            <div id={questionLabelId} className="text-lg font-medium text-[var(--foreground)] leading-relaxed">
              <RichBlock block={currentQuestion.block} maxWidth="100%" />
            </div>
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

                return (
                  <div
                    key={opt.id}
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

                    {/* Option content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="text-[var(--foreground)]">
                        <RichBlock block={opt.block} maxWidth="100%" />
                      </div>

                      {showState && opt.feedback && (
                        <div className="mt-3 pt-3 border-t border-[var(--border)] text-sm text-[var(--muted-foreground)]">
                          <RichBlock block={opt.feedback} maxWidth="100%" />
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
                );
              })
            )}
          </div>

          {/* Explanation panel */}
          {showExplanation && (
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
