"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import RichBlock from "@/components/content/RichBlock";
import { hasRichContent, toRichBlock } from "@/utils/richText";

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
 *
 * The component assumes a single-correct-answer quiz. Selecting an option
 * reveals whether it is correct (when the `correct` flag is provided) and
 * surfaces any rich feedback block supplied on the option.
 */
export default function Quiz({ questions, question, options = [], onAnswer, onQuestionChange }) {
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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [revealedByQuestion, setRevealedByQuestion] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Track the last notification sent to parent to prevent duplicate calls
  const lastNotificationRef = useRef(null);

  const currentQuestion = normalizedQuestions[currentIndex] ?? null;
  const questionCount = normalizedQuestions.length;

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
    lastNotificationRef.current = null;
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

  const handleSubmit = useCallback(() => {
    if (isSubmitted || questionCount === 0) return;

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
  }, [isSubmitted, normalizedQuestions, questionCount]);

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
        optionLabels: currentQuestion.options.map((o) => o.label).slice(0, 10),
      });
    }
  }, [currentQuestion?.id, currentIndex, revealed, selectedId, isSubmitted, onQuestionChange]);

  return (
    <div className="mx-auto w-full max-w-5xl">
      {questionCount === 0 ? (
        <div className="text-center text-sm text-[var(--muted-foreground)]">No questions available.</div>
      ) : (
        <>
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <span>Question {currentIndex + 1}</span>
              <span>
                {currentIndex + 1} of {questionCount}
              </span>
            </div>
            <div id={questionLabelId}>
              <RichBlock block={currentQuestion.block} maxWidth="100%" />
            </div>
          </div>

          <div role="radiogroup" aria-labelledby={questionLabelId} className="space-y-3">
            {currentQuestion.options.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] p-4 text-center text-sm text-[var(--muted-foreground)]">
                No options available.
              </div>
            ) : (
              currentQuestion.options.map((opt) => {
                const isSelected = selectedId === opt.id;
                const showState = revealed && anyCorrect;
                let status = null;

                if (showState) {
                  if (opt.correct) status = "correct";
                  else if (isSelected) status = "incorrect";
                }

                const baseClass =
                  "relative flex w-full items-start gap-4 rounded-2xl border px-4 py-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 cursor-pointer";
                const idleClass =
                  "border-[var(--border-muted)] bg-[var(--surface-1)] hover:border-primary/60 hover:bg-primary/5";
                const selectedClass = "border-primary bg-primary/10 shadow";
                const correctClass = "border-emerald-400 bg-emerald-500/10";
                const incorrectClass = "border-rose-400 bg-rose-500/10";

                let optionClass = baseClass;
                if (status === "correct") optionClass += ` ${correctClass}`;
                else if (status === "incorrect") optionClass += ` ${incorrectClass}`;
                else if (isSelected) optionClass += ` ${selectedClass}`;
                else optionClass += ` ${idleClass}`;

                const badgeBase =
                  "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition";
                const badgeIdle = "border-[var(--border-muted)] bg-[var(--surface-1)] text-[var(--muted-foreground)]";
                const badgeSelected = "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]";
                const badgeCorrect = "border-emerald-400 bg-emerald-400 text-[var(--surface-1)]";
                const badgeIncorrect = "border-rose-400 bg-rose-400 text-[var(--surface-1)]";

                let badgeClass = badgeBase;
                if (status === "correct") badgeClass += ` ${badgeCorrect}`;
                else if (status === "incorrect") badgeClass += ` ${badgeIncorrect}`;
                else if (isSelected) badgeClass += ` ${badgeSelected}`;
                else badgeClass += ` ${badgeIdle}`;

                return (
                  <div
                    key={opt.id}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    className={optionClass}
                    onClick={() => handleSelect(opt.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleSelect(opt.id);
                      }
                    }}
                  >
                    <div className={badgeClass}>{opt.label}</div>

                    <div className="flex-1 text-left">
                      <RichBlock block={opt.block} maxWidth="100%" />

                      {showState && opt.feedback ? (
                        <div className="mt-3 text-sm text-[var(--muted-foreground)]">
                          <RichBlock block={opt.feedback} maxWidth="100%" />
                        </div>
                      ) : null}
                    </div>

                    {status === "correct" ? (
                      <span className="ml-4 mt-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
                        Correct
                      </span>
                    ) : null}

                    {status === "incorrect" ? (
                      <span className="ml-4 mt-1 text-xs font-semibold uppercase tracking-wide text-rose-300">
                        Try again
                      </span>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          {showExplanation ? (
            <div className="mt-6 rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                Explanation
              </div>
              <RichBlock block={explanationBlock} maxWidth="100%" />
            </div>
          ) : null}

          {questionCount > 0 ? (
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                className="rounded-full bg-[var(--primary)] px-6 py-2 text-sm font-semibold text-[var(--primary-contrast)] hover:opacity-90 transition shadow-sm select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => handleNavigate(-1)}
                onPointerDown={(e) => e.currentTarget.blur()}
                tabIndex={-1}
                disabled={currentIndex === 0}
              >
                Previous
              </button>
              {currentIndex === questionCount - 1 && !isSubmitted ? (
                <button
                  type="button"
                  className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white hover:opacity-90 transition shadow-sm select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleSubmit}
                  onPointerDown={(e) => e.currentTarget.blur()}
                  tabIndex={-1}
                  disabled={questionCount === 0}
                >
                  Submit Quiz
                </button>
              ) : (
                <button
                  type="button"
                  className="rounded-full bg-[var(--primary)] px-6 py-2 text-sm font-semibold text-[var(--primary-contrast)] hover:opacity-90 transition shadow-sm select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => handleNavigate(1)}
                  onPointerDown={(e) => e.currentTarget.blur()}
                  tabIndex={-1}
                  disabled={currentIndex === questionCount - 1}
                >
                  Next
                </button>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
