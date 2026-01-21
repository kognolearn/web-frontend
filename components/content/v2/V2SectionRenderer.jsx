"use client";

import React, { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Loader2, Trophy, ChevronLeft, ChevronRight, Check, X, Circle } from "lucide-react";
import { useV2Content } from "./V2ContentContext";
import { getComponent, isGradableType, isInputType, isDisplayType } from "./ComponentRegistry";

/**
 * V2SectionRenderer - Renders a single section with its components
 *
 * Features:
 * - One-question-at-a-time navigation for gradable components
 * - Progress dots showing answered/unanswered status
 * - Display components shown as header content
 * - Visual feedback for grading results
 *
 * @param {Object} props
 * @param {import('./types').V2Section} props.section - Section data
 * @param {number} props.sectionIndex - Index of section in content
 * @param {Function} props.onGrade - Callback to trigger grading
 * @param {boolean} props.isGrading - Whether grading is in progress
 */
export default function V2SectionRenderer({
  section,
  sectionIndex,
  onGrade,
  isGrading = false,
  isAdmin = false,
}) {
  const {
    answers,
    sectionGrades,
    sectionProgress,
    setAnswer,
  } = useV2Content();
  const [rawComponents, setRawComponents] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const sectionId = section.id;
  const sectionAnswers = answers[sectionId] || {};
  const sectionGrade = sectionGrades[sectionId];
  const progress = sectionProgress[sectionId] || "pristine";
  const isGraded = progress === "graded";

  // In V2 payload, components are in section.layout array
  // Ensure each component has a unique ID by checking for duplicates
  const components = useMemo(() => {
    const rawComponents = section.layout || [];
    const seenIds = new Set();

    return rawComponents.map((component, index) => {
      // Generate a stable unique ID if missing or duplicate
      let uniqueId = component.id;

      if (!uniqueId || seenIds.has(uniqueId)) {
        // Create unique ID using section ID, type, and index
        uniqueId = `${sectionId}_${component.type || 'component'}_${index}`;
      }

      seenIds.add(uniqueId);

      // Return component with guaranteed unique ID
      if (uniqueId !== component.id) {
        return { ...component, id: uniqueId, _originalId: component.id };
      }
      return component;
    });
  }, [section.layout, sectionId]);

  // Group components into question blocks: each block has leading context + a gradable component
  // Display components before a question become context for that question
  // Display components at the end (after all questions) are shown as footer content
  const { questionBlocks, footerComponents } = useMemo(() => {
    const blocks = [];
    let currentContext = [];

    components.forEach((comp) => {
      if (isGradableType(comp.type)) {
        // Create a block with accumulated context and this question
        blocks.push({
          context: currentContext,
          question: comp,
        });
        currentContext = [];
      } else {
        // Display components accumulate as context for the next question
        currentContext.push(comp);
      }
    });

    // Any remaining display components after the last question are footer
    return {
      questionBlocks: blocks,
      footerComponents: currentContext,
    };
  }, [components]);

  // Extract gradable components for progress tracking
  const gradableComponents = useMemo(() => {
    return questionBlocks.map(block => block.question);
  }, [questionBlocks]);

  // Check if section has any gradable components
  const hasGradableComponents = gradableComponents.length > 0;
  const totalQuestions = gradableComponents.length;

  // Calculate progress stats
  const progressStats = useMemo(() => {
    const total = gradableComponents.length;
    const answered = gradableComponents.filter((comp) => {
      const value = sectionAnswers[comp.id];
      if (value === undefined || value === null) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    }).length;

    let correct = 0;
    if (isGraded && sectionGrade?.results) {
      correct = Object.values(sectionGrade.results).filter(
        (result) => result?.passed
      ).length;
    }

    return { total, answered, correct };
  }, [gradableComponents, sectionAnswers, isGraded, sectionGrade]);

  // Check if all required inputs have values
  const isSubmittable = useMemo(() => {
    if (!hasGradableComponents) return false;
    return progressStats.answered > 0;
  }, [hasGradableComponents, progressStats.answered]);

  // Handle answer changes
  const handleAnswerChange = (componentId, value) => {
    setAnswer(sectionId, componentId, value);
  };

  // Create mapping from unique IDs back to original IDs for submission
  const idMapping = useMemo(() => {
    const mapping = {};
    components.forEach((comp) => {
      if (comp._originalId) {
        mapping[comp.id] = comp._originalId;
      }
    });
    return mapping;
  }, [components]);

  // Handle submit
  const handleSubmit = () => {
    if (isGrading || isGraded || !isSubmittable) return;

    // Map answers back to original IDs for backend compatibility
    const submissionAnswers = {};
    for (const [uniqueId, value] of Object.entries(sectionAnswers)) {
      const originalId = idMapping[uniqueId] || uniqueId;
      submissionAnswers[originalId] = value;
    }

    console.log('[V2SectionRenderer] Submitting answers:', JSON.stringify(submissionAnswers, null, 2));
    onGrade?.(sectionId, submissionAnswers);
  };

  // Check if component has an answer
  const hasAnswer = useCallback((componentId) => {
    const value = sectionAnswers[componentId];
    if (value === undefined || value === null) return false;
    if (typeof value === "string" && value.trim() === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }, [sectionAnswers]);

  // Navigation handlers
  const goToQuestion = (index) => {
    if (index >= 0 && index < totalQuestions) {
      setCurrentQuestionIndex(index);
    }
  };

  const goToPrevious = () => goToQuestion(currentQuestionIndex - 1);
  const goToNext = () => goToQuestion(currentQuestionIndex + 1);

  // Toggle raw component view
  const toggleRawComponent = (componentKey) => {
    setRawComponents((prev) => ({
      ...prev,
      [componentKey]: !prev[componentKey],
    }));
  };

  // Render a single component
  const renderComponent = (component, index, showQuestionNumber = true) => {
    const componentKey = component.id || `${component.type || "component"}-${index}`;
    const Component = getComponent(component.type);

    if (!Component) {
      console.warn(`Unknown component type: ${component.type}`);
      return (
        <div
          key={component.id || index}
          className="p-4 rounded-xl border border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        >
          <p className="text-sm">
            Unknown component type: <code>{component.type}</code>
          </p>
        </div>
      );
    }

    // Get component grade if section is graded
    const componentGrade = sectionGrade?.results?.[component.id];
    const isGradable = isGradableType(component.type);
    const isInput = isInputType(component.type);

    const showRaw = isAdmin && Boolean(rawComponents[componentKey]);
    const componentPayload = component ? JSON.stringify(component, null, 2) : "";

    return (
      <div key={component.id || index} className="space-y-3">
        {isAdmin && (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => toggleRawComponent(componentKey)}
              className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--foreground)] hover:border-[var(--primary)]/60 hover:text-[var(--primary)] transition-colors"
              aria-pressed={showRaw}
            >
              {showRaw ? "Hide raw component" : "Show raw component"}
            </button>
          </div>
        )}
        {showRaw && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/50">
            <div className="border-b border-[var(--border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Raw component
            </div>
            <pre className="whitespace-pre-wrap break-words px-4 py-3 text-xs text-[var(--muted-foreground)]">
              {componentPayload || "No raw content available."}
            </pre>
          </div>
        )}
        <Component
          id={component.id}
          value={sectionAnswers[component.id]}
          onChange={
            isGradable || isInput
              ? (value) => handleAnswerChange(component.id, value)
              : undefined
          }
          disabled={isGrading}
          grade={componentGrade}
          isGraded={isGraded}
          isGradable={isGradable}
          {...component.props}
        />
      </div>
    );
  };

  // Calculate score display
  const scoreDisplay = useMemo(() => {
    if (!isGraded || !sectionGrade) return null;

    const { earnedPoints, maxPoints, passed } = sectionGrade;
    if (earnedPoints === undefined || maxPoints === undefined) return null;

    const percentage = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;

    return {
      earned: earnedPoints,
      max: maxPoints,
      percentage,
      passed,
    };
  }, [isGraded, sectionGrade]);

  // Get current question block data (includes context + question)
  const currentBlock = questionBlocks[currentQuestionIndex];
  const currentQuestion = currentBlock?.question;
  const currentContext = currentBlock?.context || [];
  const currentQuestionGrade = currentQuestion ? sectionGrade?.results?.[currentQuestion.id] : null;

  return (
    <motion.section
      id={`section-${sectionId}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: sectionIndex * 0.1 }}
      className="v2-section"
    >
      {/* Section Header */}
      {section.title && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">
            {section.title}
          </h2>
          {section.description && (
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {section.description}
            </p>
          )}
        </div>
      )}

      {/* Gradable Components - One at a time with navigation */}
      {hasGradableComponents && (
        <div className="space-y-6">
          {/* Question Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className={`
                relative rounded-2xl border p-6
                ${isGraded
                  ? currentQuestionGrade?.passed
                    ? "border-success/50 bg-success/5"
                    : "border-danger/50 bg-danger/5"
                  : hasAnswer(currentQuestion?.id)
                    ? "border-[var(--primary)]/30 bg-[var(--primary)]/5"
                    : "border-[var(--border)] bg-[var(--surface-1)]"
                }
              `}
            >
              {/* Question Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className={`
                    flex items-center justify-center min-w-[32px] h-8 px-3
                    rounded-full text-sm font-semibold
                    ${isGraded
                      ? currentQuestionGrade?.passed
                        ? "bg-success/20 text-success"
                        : "bg-danger/20 text-danger"
                      : hasAnswer(currentQuestion?.id)
                        ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                        : "bg-[var(--surface-2)] text-[var(--muted-foreground)]"
                    }
                  `}>
                    {currentQuestionIndex + 1}
                    <span className="text-[var(--muted-foreground)] font-normal ml-0.5">
                      /{totalQuestions}
                    </span>
                  </span>

                  {currentQuestion?.props?.points && (
                    <span className="text-xs text-[var(--muted-foreground)] bg-[var(--surface-2)] px-2 py-1 rounded-full">
                      {currentQuestion.props.points} {parseInt(currentQuestion.props.points) === 1 ? "pt" : "pts"}
                    </span>
                  )}
                </div>

                {/* Status indicator */}
                {isGraded && (
                  <div className={`flex items-center gap-2 text-sm font-medium ${
                    currentQuestionGrade?.passed ? "text-success" : "text-danger"
                  }`}>
                    {currentQuestionGrade?.passed ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Correct
                      </>
                    ) : (
                      <>
                        <X className="w-5 h-5" />
                        Incorrect
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Context for this question (markdown, images, etc.) */}
              {currentContext.length > 0 && (
                <div className="mb-4 space-y-3 pb-4 border-b border-[var(--border)]/50">
                  {currentContext.map((comp, idx) => renderComponent(comp, idx, false))}
                </div>
              )}

              {/* Question Content */}
              {currentQuestion && renderComponent(currentQuestion, currentQuestionIndex)}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            {/* Previous Button */}
            <button
              onClick={goToPrevious}
              disabled={currentQuestionIndex === 0}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                transition-all
                ${currentQuestionIndex === 0
                  ? "text-[var(--muted-foreground)]/50 cursor-not-allowed"
                  : "text-[var(--foreground)] hover:bg-[var(--surface-2)] active:scale-[0.98]"
                }
              `}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            {/* Progress Dots */}
            <div className="flex items-center gap-1.5">
              {gradableComponents.map((comp, index) => {
                const isActive = index === currentQuestionIndex;
                const isAnswered = hasAnswer(comp.id);
                const grade = sectionGrade?.results?.[comp.id];

                return (
                  <button
                    key={comp.id}
                    onClick={() => goToQuestion(index)}
                    className={`
                      relative w-3 h-3 rounded-full transition-all duration-200
                      ${isActive ? "scale-125" : "hover:scale-110"}
                      ${isGraded
                        ? grade?.passed
                          ? "bg-success"
                          : "bg-danger"
                        : isAnswered
                          ? "bg-[var(--primary)]"
                          : "bg-[var(--surface-2)] border border-[var(--border)]"
                      }
                    `}
                    title={`Question ${index + 1}${isAnswered ? " (answered)" : ""}`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeQuestion"
                        className="absolute inset-[-3px] rounded-full border-2 border-[var(--primary)]"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Next Button */}
            <button
              onClick={goToNext}
              disabled={currentQuestionIndex === totalQuestions - 1}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                transition-all
                ${currentQuestionIndex === totalQuestions - 1
                  ? "text-[var(--muted-foreground)]/50 cursor-not-allowed"
                  : "text-[var(--foreground)] hover:bg-[var(--surface-2)] active:scale-[0.98]"
                }
              `}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Submit Section */}
          <div className="border-t border-[var(--border)] pt-6">
            <AnimatePresence mode="wait">
              {isGraded && scoreDisplay ? (
                <motion.div
                  key="score"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`relative overflow-hidden rounded-2xl border ${
                    scoreDisplay.passed
                      ? "border-success/50 bg-gradient-to-br from-[var(--success)]/10 to-[var(--success)]/5"
                      : "border-danger/50 bg-gradient-to-br from-[var(--danger)]/10 to-[var(--danger)]/5"
                  }`}
                >
                  {/* Decorative background */}
                  <div className={`absolute inset-0 opacity-30 ${
                    scoreDisplay.passed
                      ? "bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[var(--success)]/20 to-transparent"
                      : "bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[var(--danger)]/20 to-transparent"
                  }`} />

                  <div className="relative flex items-center gap-4 p-5">
                    <div className={`flex items-center justify-center w-14 h-14 rounded-xl ${
                      scoreDisplay.passed
                        ? "bg-success/20"
                        : "bg-danger/20"
                    }`}>
                      {scoreDisplay.passed ? (
                        <Trophy className="w-7 h-7 text-success" />
                      ) : (
                        <AlertCircle className="w-7 h-7 text-danger" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`text-2xl font-bold ${
                          scoreDisplay.passed
                            ? "text-success"
                            : "text-danger"
                        }`}
                      >
                        {scoreDisplay.earned} / {scoreDisplay.max}
                        <span className="ml-2 text-lg font-normal opacity-80">
                          ({scoreDisplay.percentage}%)
                        </span>
                      </p>
                      <p
                        className={`text-sm mt-0.5 ${
                          scoreDisplay.passed
                            ? "text-success opacity-80"
                            : "text-danger opacity-80"
                        }`}
                      >
                        {scoreDisplay.passed
                          ? progressStats.correct === progressStats.total
                            ? "Perfect score! Excellent work!"
                            : "Great job! You passed this section."
                          : "Review your answers and try again."}
                      </p>
                    </div>

                    {/* Quick stats */}
                    <div className="hidden sm:flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/20">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span className="text-success font-medium">
                          {progressStats.correct}
                        </span>
                      </div>
                      {progressStats.total - progressStats.correct > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger/20">
                          <AlertCircle className="w-4 h-4 text-danger" />
                          <span className="text-danger font-medium">
                            {progressStats.total - progressStats.correct}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="submit"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="flex items-center gap-1">
                        {gradableComponents.map((comp, index) => {
                          const isAnswered = hasAnswer(comp.id);
                          return (
                            <div
                              key={comp.id}
                              className={`
                                w-2 h-2 rounded-full transition-colors
                                ${isAnswered ? "bg-[var(--primary)]" : "bg-[var(--surface-2)] border border-[var(--border)]"}
                              `}
                            />
                          );
                        })}
                      </div>
                      <span className="text-sm text-[var(--muted-foreground)]">
                        {progressStats.answered} of {progressStats.total} answered
                      </span>
                    </div>
                    {progressStats.total > progressStats.answered && progressStats.answered > 0 && (
                      <p className="text-xs text-[var(--muted-foreground)] opacity-70">
                        {progressStats.total - progressStats.answered} {progressStats.total - progressStats.answered === 1 ? "question" : "questions"} remaining
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={isGrading || !isSubmittable}
                    className={`
                      flex items-center gap-2 px-6 py-3 rounded-xl
                      font-medium transition-all
                      ${
                        isGrading
                          ? "bg-[var(--primary)]/50 text-white cursor-wait"
                          : isSubmittable
                          ? "bg-[var(--primary)] text-white hover:opacity-90 active:scale-[0.98] shadow-lg shadow-[var(--primary)]/25"
                          : "bg-[var(--surface-2)] text-[var(--muted-foreground)] cursor-not-allowed"
                      }
                    `}
                  >
                    {isGrading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      "Submit Answers"
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Section feedback */}
            {isGraded && sectionGrade?.feedback && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 text-sm p-4 rounded-xl ${
                  sectionGrade.passed
                    ? "bg-success/10 text-success"
                    : "bg-danger/10 text-danger"
                }`}
              >
                {sectionGrade.feedback}
              </motion.p>
            )}
          </div>
        </div>
      )}

      {/* Footer Components (after last question) */}
      {footerComponents.length > 0 && (
        <div className="mt-6 space-y-4">
          {footerComponents.map((component, index) => renderComponent(component, index, false))}
        </div>
      )}

      {/* No content available */}
      {!hasGradableComponents && footerComponents.length === 0 && (
        <div className="p-4 text-center text-[var(--muted-foreground)]">
          No content available
        </div>
      )}
    </motion.section>
  );
}
