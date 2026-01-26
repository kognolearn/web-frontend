"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { V2ContentProvider, useV2Content } from "./V2ContentContext";
import V2SectionRenderer from "./V2SectionRenderer";
import { useV2Grading } from "./useV2Grading";
import { mapSectionAnswers, mapSectionResults } from "./sectionUtils";
import { useSeeds } from "@/components/seeds/SeedsProvider";

/**
 * V2ContentRenderer - Main entry point for V2 section-based content
 *
 * This component:
 * 1. Wraps content with V2ContentProvider for state management
 * 2. Renders the active section using V2SectionRenderer
 * 3. Handles grading via useV2Grading hook
 *
 * @param {Object} props
 * @param {import('./types').V2ContentPayload} props.content - The V2 content payload
 * @param {string} props.courseId - Course ID for API calls
 * @param {string} props.nodeId - Node ID for API calls
 * @param {number} [props.activeSectionIndex=0] - Index of the section to display
 * @param {Function} [props.onGradeComplete] - Callback when grading completes
 * @param {boolean} [props.isAdmin=false] - Whether to enable admin-only UI
 */
export default function V2ContentRenderer({
  content,
  courseId,
  nodeId,
  activeSectionIndex = 0,
  onGradeComplete,
  isAdmin = false,
  initialAnswers = {},
  initialGrades = {},
  initialProgress = {},
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

  const sections = content.sections || [];
  const normalizedInitialAnswers = useMemo(() => {
    if (!sections.length || !initialAnswers || typeof initialAnswers !== "object") {
      return {};
    }
    const mapped = {};
    sections.forEach((section) => {
      const sectionId = section?.id;
      if (!sectionId) return;
      const rawAnswers = initialAnswers[sectionId];
      const sectionMapped = mapSectionAnswers(section, rawAnswers);
      if (Object.keys(sectionMapped).length > 0) {
        mapped[sectionId] = sectionMapped;
      }
    });
    return mapped;
  }, [sections, initialAnswers]);

  const normalizedInitialGrades = useMemo(() => {
    if (!sections.length || !initialGrades || typeof initialGrades !== "object") {
      return {};
    }
    const mapped = {};
    sections.forEach((section) => {
      const sectionId = section?.id;
      if (!sectionId) return;
      const rawGrade = initialGrades[sectionId];
      if (!rawGrade || typeof rawGrade !== "object") return;
      let rawResults = rawGrade.results || {};
      if (Array.isArray(rawResults)) {
        rawResults = rawResults.reduce((acc, entry) => {
          if (entry?.component_id) {
            acc[entry.component_id] = entry;
          }
          return acc;
        }, {});
      }
      const mappedResults = mapSectionResults(section, rawResults);
      mapped[sectionId] = {
        ...rawGrade,
        results: mappedResults,
      };
    });
    return mapped;
  }, [sections, initialGrades]);

  const normalizedInitialProgress = useMemo(() => {
    if (!sections.length) return {};
    const mapped = {};
    sections.forEach((section) => {
      const sectionId = section?.id;
      if (!sectionId) return;
      if (initialProgress?.[sectionId]) {
        mapped[sectionId] = initialProgress[sectionId];
      } else if (normalizedInitialGrades[sectionId]) {
        mapped[sectionId] = "graded";
      } else if (normalizedInitialAnswers[sectionId]) {
        mapped[sectionId] = "dirty";
      }
    });
    return mapped;
  }, [sections, initialProgress, normalizedInitialGrades, normalizedInitialAnswers]);

  const storageKey = courseId && nodeId ? `v2_section_state:${courseId}:${nodeId}` : null;

  return (
    <V2ContentProvider
      initialAnswers={normalizedInitialAnswers}
      initialGrades={normalizedInitialGrades}
      initialProgress={normalizedInitialProgress}
      storageKey={storageKey}
    >
      <V2ContentInner
        content={content}
        courseId={courseId}
        nodeId={nodeId}
        activeSectionIndex={activeSectionIndex}
        onGradeComplete={onGradeComplete}
        isAdmin={isAdmin}
      />
    </V2ContentProvider>
  );
}

/**
 * Inner component that has access to V2Content context
 */
function V2ContentInner({ content, courseId, nodeId, activeSectionIndex, onGradeComplete, isAdmin }) {
  const { setSectionGraded, setSectionProgress } = useV2Content();
  const [gradingSection, setGradingSection] = useState(null);
  const sections = content.sections || [];

  // Seeds context for sounds and notifications
  const { playSeedEarnedSound, playWrongAnswerSound, showSeedNotification } = useSeeds();

  const { gradeSection, isGrading, error } = useV2Grading({
    courseId,
    nodeId,
  });

  // Handle section grading
  const handleGradeSection = useCallback(
    async (sectionId, sectionAnswers) => {
      setGradingSection(sectionId);
      setSectionProgress(sectionId, "submitted");

      // Find the section to get its grading_logic
      const section = sections.find(s => s.id === sectionId);
      const gradingLogic = section?.grading_logic;

      try {
        const result = await gradeSection(sectionId, sectionAnswers, gradingLogic);

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

          // Play sound and show notification based on results
          if (result.seedsAwarded > 0) {
            playSeedEarnedSound?.();
            showSeedNotification?.(result.seedsAwarded, 'Correct answers!', courseId);
          } else if (!gradeData.passed) {
            playWrongAnswerSound?.();
          }
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
    [gradeSection, setSectionGraded, setSectionProgress, onGradeComplete, sections, playSeedEarnedSound, playWrongAnswerSound, showSeedNotification, courseId]
  );

  const currentSection = sections[activeSectionIndex];

  if (!currentSection) {
    return (
      <div className="p-4 text-center text-[var(--muted-foreground)]">
        Section not found
      </div>
    );
  }

  return (
    <div className="v2-content-renderer">
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

      {/* Active Section Content */}
      <V2SectionRenderer
        section={currentSection}
        sectionIndex={activeSectionIndex}
        onGrade={handleGradeSection}
        isGrading={isGrading && gradingSection === currentSection.id}
        isAdmin={isAdmin}
        courseId={courseId}
        nodeId={nodeId}
      />
    </div>
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
