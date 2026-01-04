"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Loader2, Trophy, Target } from "lucide-react";
import { useV2Content } from "./V2ContentContext";
import { getComponent, isGradableType, isInputType } from "./ComponentRegistry";
import QuestionCard from "./components/QuestionCard";

/**
 * V2SectionRenderer - Renders a single section with its components
 *
 * Handles:
 * - Component rendering based on layout type
 * - Answer state management for gradable components
 * - Section grading with submit button
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

  const sectionId = section.id;
  const sectionAnswers = answers[sectionId] || {};
  const sectionGrade = sectionGrades[sectionId];
  const progress = sectionProgress[sectionId] || "pristine";
  const isGraded = progress === "graded";

  // In V2 payload, components are in section.layout array
  const components = section.layout || [];

  // Get only gradable components for numbering
  const gradableComponents = useMemo(() => {
    return components.filter((comp) => isGradableType(comp.type));
  }, [components]);

  // Check if section has any gradable components
  const hasGradableComponents = gradableComponents.length > 0;

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

  // Handle submit
  const handleSubmit = () => {
    if (isGrading || isGraded || !isSubmittable) return;
    console.log('[V2SectionRenderer] Submitting answers:', JSON.stringify(sectionAnswers, null, 2));
    onGrade?.(sectionId, sectionAnswers);
  };

  // Get question number for a component
  const getQuestionNumber = (componentId) => {
    const index = gradableComponents.findIndex((c) => c.id === componentId);
    return index >= 0 ? index + 1 : null;
  };

  // Check if component has an answer
  const hasAnswer = (componentId) => {
    const value = sectionAnswers[componentId];
    if (value === undefined || value === null) return false;
    if (typeof value === "string" && value.trim() === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  };

  // Render components
  const toggleRawComponent = (componentKey) => {
    setRawComponents((prev) => ({
      ...prev,
      [componentKey]: !prev[componentKey],
    }));
  };

  const renderComponents = () => {
    const renderedComponents = components.map((component, index) => {
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
      const questionNumber = isGradable ? getQuestionNumber(component.id) : null;

      // Spread all component props from spec, plus standard props
      const showRaw = isAdmin && Boolean(rawComponents[componentKey]);
      const componentPayload = component ? JSON.stringify(component, null, 2) : "";
      const componentElement = (
        <div className="space-y-3">
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

      // Wrap gradable components in QuestionCard
      return (
        <QuestionCard
          key={component.id || index}
          questionNumber={questionNumber}
          totalQuestions={hasGradableComponents ? gradableComponents.length : null}
          isGraded={isGraded}
          isCorrect={componentGrade?.passed}
          hasAnswer={hasAnswer(component.id)}
          isGradable={isGradable}
          points={component.props?.points}
          index={index}
        >
          {componentElement}
        </QuestionCard>
      );
    });

    // Stack layout
    return (
      <div className="space-y-4">
        {renderedComponents}
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

      {/* Progress Indicator */}
      {hasGradableComponents && progressStats.total > 1 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Target className="w-4 h-4" />
              <span>
                {isGraded
                  ? `${progressStats.correct} of ${progressStats.total} correct`
                  : `${progressStats.answered} of ${progressStats.total} answered`
                }
              </span>
            </div>
            {isGraded && scoreDisplay && (
              <div className="flex items-center gap-2">
                <Trophy className={`w-4 h-4 ${scoreDisplay.passed ? "text-success" : "text-danger"}`} />
                <span className={`text-sm font-medium ${
                  scoreDisplay.passed
                    ? "text-success"
                    : "text-danger"
                }`}>
                  {scoreDisplay.percentage}%
                </span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: isGraded
                  ? `${(progressStats.correct / progressStats.total) * 100}%`
                  : `${(progressStats.answered / progressStats.total) * 100}%`,
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`h-full rounded-full ${
                isGraded
                  ? scoreDisplay?.passed
                    ? "bg-success"
                    : "bg-gradient-to-r from-[var(--success)] via-[var(--warning)] to-[var(--danger)]"
                  : "bg-[var(--primary)]"
              }`}
              style={{
                backgroundSize: isGraded && !scoreDisplay?.passed ? "200% 100%" : undefined,
              }}
            />
          </div>
        </motion.div>
      )}

      {/* Components */}
      <div className="mb-6">
        {renderComponents()}
      </div>

      {/* Submit Button & Score Display */}
      {hasGradableComponents && (
        <div className="mt-8 border-t border-[var(--border)] pt-6">
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
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {progress === "pristine"
                      ? "Answer the questions above to continue"
                      : progress === "dirty"
                      ? `Ready to submit ${progressStats.answered} ${progressStats.answered === 1 ? "answer" : "answers"}`
                      : "Checking your answers..."}
                  </p>
                  {progressStats.total > progressStats.answered && progressStats.answered > 0 && (
                    <p className="text-xs text-[var(--muted-foreground)] mt-1 opacity-70">
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
      )}
    </motion.section>
  );
}
