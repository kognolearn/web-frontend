"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Circle, HelpCircle } from "lucide-react";

/**
 * QuestionCard - Wrapper component for assessment questions
 * Provides consistent styling, numbering, and status indicators
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The question component
 * @param {number} [props.questionNumber] - Question number for display
 * @param {number} [props.totalQuestions] - Total questions in section
 * @param {boolean} [props.isGraded] - Whether the question has been graded
 * @param {boolean} [props.isCorrect] - Whether the answer is correct (only relevant if graded)
 * @param {boolean} [props.hasAnswer] - Whether the user has provided an answer
 * @param {boolean} [props.isGradable] - Whether this is a gradable component
 * @param {string} [props.points] - Points value for this question
 * @param {number} [props.index] - Animation index for staggered animations
 */
export default function QuestionCard({
  children,
  questionNumber,
  totalQuestions,
  isGraded = false,
  isCorrect = false,
  hasAnswer = false,
  isGradable = true,
  points,
  index = 0,
}) {
  // Determine status for styling
  const getStatus = () => {
    if (!isGradable) return "display";
    if (isGraded) return isCorrect ? "correct" : "incorrect";
    if (hasAnswer) return "answered";
    return "unanswered";
  };

  const status = getStatus();

  // Status-based styling
  const statusStyles = {
    display: {
      border: "border-transparent",
      bg: "bg-transparent",
      indicator: null,
    },
    unanswered: {
      border: "border-[var(--border)]",
      bg: "bg-[var(--surface-1)]",
      indicator: (
        <Circle className="w-5 h-5 text-[var(--muted-foreground)]" />
      ),
    },
    answered: {
      border: "border-[var(--primary)]/30",
      bg: "bg-[var(--primary)]/5",
      indicator: (
        <HelpCircle className="w-5 h-5 text-[var(--primary)]" />
      ),
    },
    correct: {
      border: "border-success/50",
      bg: "bg-success/5",
      indicator: (
        <CheckCircle2 className="w-5 h-5 text-success" />
      ),
    },
    incorrect: {
      border: "border-danger/50",
      bg: "bg-danger/5",
      indicator: (
        <XCircle className="w-5 h-5 text-danger" />
      ),
    },
  };

  const currentStyle = statusStyles[status];

  // Don't wrap non-gradable (display) components in a card
  if (!isGradable) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`
        relative rounded-2xl border ${currentStyle.border} ${currentStyle.bg}
        p-5 transition-all duration-300
      `}
    >
      {/* Question header with number and status */}
      {(questionNumber || currentStyle.indicator) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Question number badge */}
            {questionNumber && (
              <div className={`
                flex items-center justify-center min-w-[28px] h-7 px-2
                rounded-full text-xs font-semibold
                ${status === "correct"
                  ? "bg-success/20 text-success"
                  : status === "incorrect"
                  ? "bg-danger/20 text-danger"
                  : status === "answered"
                  ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                  : "bg-[var(--surface-2)] text-[var(--muted-foreground)]"
                }
              `}>
                {questionNumber}
                {totalQuestions && (
                  <span className="text-[var(--muted-foreground)] font-normal ml-0.5">
                    /{totalQuestions}
                  </span>
                )}
              </div>
            )}

            {/* Points badge */}
            {points && (
              <span className="text-xs text-[var(--muted-foreground)] bg-[var(--surface-2)] px-2 py-1 rounded-full">
                {points} {parseInt(points) === 1 ? "pt" : "pts"}
              </span>
            )}
          </div>

          {/* Status indicator */}
          {currentStyle.indicator && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {currentStyle.indicator}
            </motion.div>
          )}
        </div>
      )}

      {/* Question content */}
      <div className="question-content">
        {children}
      </div>
    </motion.div>
  );
}
