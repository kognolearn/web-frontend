"use client";

import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { V2ContentProvider, useV2Content } from "./V2ContentContext";
import V2SectionRenderer from "./V2SectionRenderer";
import { useV2Grading } from "./useV2Grading";

/**
 * V2ContentRenderer - Main entry point for V2 section-based content
 *
 * This component:
 * 1. Wraps content with V2ContentProvider for state management
 * 2. Renders all sections using V2SectionRenderer
 * 3. Handles grading via useV2Grading hook
 *
 * @param {Object} props
 * @param {import('./types').V2ContentPayload} props.content - The V2 content payload
 * @param {string} props.courseId - Course ID for API calls
 * @param {string} props.nodeId - Node ID for API calls
 * @param {Function} [props.onGradeComplete] - Callback when grading completes
 */
export default function V2ContentRenderer({
  content,
  courseId,
  nodeId,
  onGradeComplete,
}) {
  // Validate content is v2
  if (!content || content.version !== 2) {
    console.error("V2ContentRenderer received non-v2 content:", content);
    return (
      <div className="p-4 rounded-xl border border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300">
        <p className="font-medium">Content Error</p>
        <p className="text-sm mt-1">
          This content requires version 2 format but received version{" "}
          {content?.version || "unknown"}.
        </p>
      </div>
    );
  }

  return (
    <V2ContentProvider initialContent={content}>
      <V2ContentInner
        content={content}
        courseId={courseId}
        nodeId={nodeId}
        onGradeComplete={onGradeComplete}
      />
    </V2ContentProvider>
  );
}

/**
 * Inner component that has access to V2Content context
 */
function V2ContentInner({ content, courseId, nodeId, onGradeComplete }) {
  const { answers, setSectionGraded, setSectionProgress } = useV2Content();
  const [gradingSection, setGradingSection] = useState(null);

  const { gradeSection, isGrading, error } = useV2Grading({
    courseId,
    nodeId,
  });

  // Handle section grading
  const handleGradeSection = useCallback(
    async (sectionId, sectionAnswers) => {
      setGradingSection(sectionId);
      setSectionProgress(sectionId, "submitted");

      try {
        const result = await gradeSection(sectionId, sectionAnswers);

        if (result.success) {
          // Map results to expected format
          const gradeData = {
            passed: result.grade.passed,
            earnedPoints: result.grade.earned_points,
            maxPoints: result.grade.total_points,
            results: result.grade.results || {},
            feedback: result.grade.feedback,
          };

          setSectionGraded(sectionId, gradeData);
          onGradeComplete?.(sectionId, gradeData);
        } else {
          // Handle grading error
          console.error("Grading failed:", result.error);
          setSectionProgress(sectionId, "dirty");
        }
      } catch (err) {
        console.error("Grading error:", err);
        setSectionProgress(sectionId, "dirty");
      } finally {
        setGradingSection(null);
      }
    },
    [gradeSection, setSectionGraded, setSectionProgress, onGradeComplete]
  );

  return (
    <div className="v2-content-renderer">
      {/* Content Title */}
      {content.title && (
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            {content.title}
          </h1>
          {content.description && (
            <p className="mt-2 text-[var(--muted-foreground)]">
              {content.description}
            </p>
          )}
        </motion.header>
      )}

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 rounded-xl border border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300"
        >
          <p className="font-medium">Grading Error</p>
          <p className="text-sm mt-1">{error}</p>
        </motion.div>
      )}

      {/* Sections */}
      <div className="space-y-12">
        {content.sections.map((section, index) => (
          <V2SectionRenderer
            key={section.id}
            section={section}
            sectionIndex={index}
            onGrade={handleGradeSection}
            isGrading={isGrading && gradingSection === section.id}
          />
        ))}
      </div>

      {/* Progress Summary (if multiple gradable sections) */}
      <GradingProgress sections={content.sections} />
    </div>
  );
}

/**
 * Optional progress summary shown at bottom for multi-section content
 */
function GradingProgress({ sections }) {
  const { sectionGrades, sectionProgress } = useV2Content();

  // Count graded sections
  const gradedSections = Object.values(sectionProgress).filter(
    (p) => p === "graded"
  ).length;

  // Count gradable sections (sections with at least one assessment component)
  const gradableSections = sections.filter((section) =>
    section.components.some((comp) =>
      [
        "select_group",
        "multi_select_group",
        "true_false_statement",
        "fill_in_blank",
        "matching_pairs",
        "sortable_list",
        "classification_buckets",
        "short_answer",
        "numeric_answer",
        "table_input",
        "image_hotspot",
        "diagram_labeler",
        "evidence_highlighter",
        "stepwise_derivation",
        "proof_builder",
        "code_question",
        "graph_sketch_answer",
        "long_form_response",
        "argument_builder",
        "oral_response",
      ].includes(comp.type)
    )
  ).length;

  // Don't show if no gradable sections or only one
  if (gradableSections <= 1) return null;

  // Calculate total score across all graded sections
  let totalEarned = 0;
  let totalMax = 0;

  Object.values(sectionGrades).forEach((grade) => {
    if (grade && grade.earnedPoints !== undefined) {
      totalEarned += grade.earnedPoints;
      totalMax += grade.maxPoints || 0;
    }
  });

  const allGraded = gradedSections === gradableSections;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-12 p-6 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-[var(--foreground)]">
            Progress: {gradedSections} / {gradableSections} sections completed
          </h3>
          {totalMax > 0 && (
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Current score: {totalEarned} / {totalMax} points
              {allGraded && (
                <span className="ml-2">
                  ({Math.round((totalEarned / totalMax) * 100)}%)
                </span>
              )}
            </p>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-32 h-2 bg-[var(--surface-1)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${(gradedSections / gradableSections) * 100}%`,
            }}
            className="h-full bg-[var(--primary)] rounded-full"
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Helper function to check if content is V2 format
 * @param {any} content - Content payload to check
 * @returns {boolean}
 */
export function isV2Content(contentPayload) {
  return contentPayload?.version === 2 && Array.isArray(contentPayload?.sections);
}
