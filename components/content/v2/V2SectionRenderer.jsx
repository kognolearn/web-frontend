"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useV2Content } from "./V2ContentContext";
import { getComponent, isGradableType, isInputType } from "./ComponentRegistry";

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
}) {
  const {
    answers,
    sectionGrades,
    sectionProgress,
    setAnswer,
  } = useV2Content();

  const sectionId = section.id;
  const sectionAnswers = answers[sectionId] || {};
  const sectionGrade = sectionGrades[sectionId];
  const progress = sectionProgress[sectionId] || "pristine";
  const isGraded = progress === "graded";

  // Check if section has any gradable components
  const hasGradableComponents = useMemo(() => {
    return section.components.some((comp) => isGradableType(comp.type));
  }, [section.components]);

  // Check if all required inputs have values
  const isSubmittable = useMemo(() => {
    if (!hasGradableComponents) return false;

    // Check if at least one gradable component has a value
    const gradableComponents = section.components.filter((comp) =>
      isGradableType(comp.type) || isInputType(comp.type)
    );

    return gradableComponents.some((comp) => {
      const value = sectionAnswers[comp.id];
      if (value === undefined || value === null) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    });
  }, [section.components, sectionAnswers, hasGradableComponents]);

  // Handle answer changes
  const handleAnswerChange = (componentId, value) => {
    setAnswer(sectionId, componentId, value);
  };

  // Handle submit
  const handleSubmit = () => {
    if (isGrading || isGraded || !isSubmittable) return;
    onGrade?.(sectionId, sectionAnswers);
  };

  // Render components based on layout
  const renderComponents = () => {
    const layout = section.layout || "stack";
    const components = section.components;

    const renderedComponents = components.map((component, index) => {
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

      // Spread all component props from spec, plus standard props
      return (
        <div key={component.id || index} className="v2-component">
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
    });

    // Apply layout styles
    switch (layout) {
      case "two_column":
        return (
          <div className="grid md:grid-cols-2 gap-6">
            {renderedComponents}
          </div>
        );

      case "side_by_side":
        return (
          <div className="flex flex-wrap gap-6 items-start">
            {renderedComponents}
          </div>
        );

      case "stack":
      default:
        return (
          <div className="space-y-6">
            {renderedComponents}
          </div>
        );
    }
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
                className={`flex items-center gap-4 p-4 rounded-xl border ${
                  scoreDisplay.passed
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-rose-500 bg-rose-500/10"
                }`}
              >
                {scoreDisplay.passed ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-rose-500" />
                )}
                <div>
                  <p
                    className={`text-lg font-semibold ${
                      scoreDisplay.passed
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {scoreDisplay.earned} / {scoreDisplay.max} points ({scoreDisplay.percentage}%)
                  </p>
                  <p
                    className={`text-sm ${
                      scoreDisplay.passed
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    {scoreDisplay.passed ? "Great job!" : "Review your answers above"}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="submit"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between"
              >
                <p className="text-sm text-[var(--muted-foreground)]">
                  {progress === "pristine"
                    ? "Answer the questions above, then submit"
                    : progress === "dirty"
                    ? "Ready to submit"
                    : "Checking your answers..."}
                </p>
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
                        ? "bg-[var(--primary)] text-white hover:opacity-90 active:scale-[0.98]"
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
              className={`mt-4 text-sm ${
                sectionGrade.passed
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
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
