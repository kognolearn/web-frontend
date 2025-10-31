"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import RichBlock from "@/components/content/RichBlock";

function normalizeNode(node) {
  if (!node) return null;

  if (typeof node === "string") {
    return { text: node };
  }

  if (typeof node === "object") {
    if ("text" in node) return { text: node.text ?? "" };
    if ("block-math" in node) return { "block-math": node["block-math"] ?? "" };
    if ("inline-math" in node) return { "inline-math": node["inline-math"] ?? "" };
  }

  return null;
}

function normalizeRichBlock(value) {
  if (!value) {
    return { content: [] };
  }

  if (typeof value === "string") {
    return { content: [{ text: value }] };
  }

  if (typeof value === "object") {
    const possibleNode = normalizeNode(value);
    if (possibleNode) {
      return { content: [possibleNode] };
    }
  }

  if (Array.isArray(value)) {
    return {
      content: value.map(normalizeNode).filter(Boolean),
    };
  }

  if (typeof value === "object" && Array.isArray(value.content)) {
    return {
      content: value.content.map(normalizeNode).filter(Boolean),
    };
  }

  return { content: [] };
}

function getOptionLabel(option, index) {
  if (option?.label) return option.label;
  return String.fromCharCode("A".charCodeAt(0) + index);
}

function normalizeOption(option, index) {
  return {
    id: option?.id ?? String(index),
    label: getOptionLabel(option, index),
    block: normalizeRichBlock(
      option?.block ?? (option?.content ? { content: option.content } : option)
    ),
    correct: Boolean(option?.correct),
    feedback: option?.feedback ? normalizeRichBlock(option.feedback) : null,
  };
}

function normalizeQuestion(item, index) {
  const blockSource =
    item?.question ??
    item?.prompt ??
    item?.block ??
    (item?.content ? { content: item.content } : item);

  return {
    id: item?.id ?? String(index),
    block: normalizeRichBlock(blockSource),
    options: Array.isArray(item?.options) ? item.options.map(normalizeOption) : [],
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
  const sequence = extractSequenceFromValue(value).map(normalizeNode).filter(Boolean);

  if (sequence.length < 3) {
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

  const questionNode = sequence[0];
  const explanationNode = sequence[sequence.length - 1];
  const optionNodes = sequence.slice(1, -1);

  const options = optionNodes.map((node, optionIndex) => ({
    id: `${baseId}-option-${optionIndex}`,
    label: getOptionLabel({}, optionIndex),
    block: normalizeRichBlock([node]),
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
    block: normalizeRichBlock([questionNode]),
    options,
    explanation: normalizeRichBlock([explanationNode]),
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
export default function Quiz({ questions, question, options = [], onAnswer }) {
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
        .filter((item) => item.block.content.length > 0 || item.options.length > 0);
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

  const currentQuestion = normalizedQuestions[currentIndex] ?? null;
  const questionCount = normalizedQuestions.length;

  useEffect(() => {
    setCurrentIndex((prev) => {
      if (questionCount === 0) return 0;
      return prev >= questionCount ? questionCount - 1 : prev;
    });
  }, [questionCount]);

  const selectedId = currentQuestion ? responses[currentQuestion.id] ?? null : null;
  const revealed = currentQuestion ? Boolean(revealedByQuestion[currentQuestion.id]) : false;
  const anyCorrect = currentQuestion ? currentQuestion.options.some((opt) => opt.correct) : false;
  const explanationBlock = currentQuestion?.explanation ?? null;
  const showExplanation =
    revealed && explanationBlock && Array.isArray(explanationBlock.content) && explanationBlock.content.length > 0;

  const handleSelect = useCallback(
    (optionId) => {
      const questionEntry = normalizedQuestions[currentIndex];
      if (!questionEntry) return;

      setResponses((prev) => ({ ...prev, [questionEntry.id]: optionId }));
      setRevealedByQuestion((prev) => ({ ...prev, [questionEntry.id]: true }));

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
    [currentIndex, normalizedQuestions, onAnswer]
  );

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

  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl bg-[var(--surface-2)] p-6 shadow">
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
                const showState = revealed && isSelected;
                const status = showState && anyCorrect ? (opt.correct ? "correct" : "incorrect") : null;

                const baseClass =
                  "relative flex w-full items-start gap-4 rounded-2xl border px-4 py-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";
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
                const badgeSelected = "border-primary bg-primary/20 text-primary";
                const badgeCorrect = "border-emerald-400 bg-emerald-400/20 text-emerald-200";
                const badgeIncorrect = "border-rose-400 bg-rose-400/20 text-rose-200";

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

          {questionCount > 1 ? (
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                className="rounded-full border border-[var(--border-muted)] px-4 py-2 text-sm font-semibold text-[var(--muted-foreground)] transition hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => handleNavigate(-1)}
                disabled={currentIndex === 0}
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded-full border border-[var(--border-muted)] px-4 py-2 text-sm font-semibold text-[var(--muted-foreground)] transition hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => handleNavigate(1)}
                disabled={currentIndex === questionCount - 1}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}