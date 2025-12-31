"use client";

import { useCallback, useRef } from "react";
import { authFetch } from "@/lib/api";
import { resolveAsyncJobResponse } from "@/utils/asyncJobs";
import { useV2Content } from "./V2ContentContext";

/**
 * Hook for V2 section grading with async polling support
 * @param {Object} options
 * @param {string} options.courseId - Course ID
 * @param {string} options.nodeId - Node/Lesson ID
 * @returns {Object} Grading functions
 */
export function useV2Grading({ courseId, nodeId }) {
  const {
    setSectionGrading,
    setSectionGraded,
    setSectionError,
    getSectionAnswers,
  } = useV2Content();

  const abortControllerRef = useRef(null);

  /**
   * Grade a section
   * @param {string} sectionId - Section to grade
   * @param {import('./types').V2GradingRule[]} gradingLogic - Grading rules
   * @param {Object} [options]
   * @param {boolean} [options.sync=false] - Use sync mode for immediate response
   * @returns {Promise<import('./types').V2GradeResult|null>}
   */
  const gradeSection = useCallback(async (sectionId, gradingLogic, options = {}) => {
    const { sync = false } = options;

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const answers = getSectionAnswers(sectionId);

    // Filter to only gradable component answers
    const gradableIds = new Set(gradingLogic.map(g => g.component_id));
    const gradableAnswers = {};
    for (const [componentId, value] of Object.entries(answers)) {
      if (gradableIds.has(componentId)) {
        gradableAnswers[componentId] = value;
      }
    }

    if (Object.keys(gradableAnswers).length === 0) {
      setSectionError(sectionId, 'No answers to grade');
      return null;
    }

    setSectionGrading(sectionId);

    try {
      const response = await authFetch(
        `/api/courses/${courseId}/nodes/${nodeId}/grade`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionId,
            answers: gradableAnswers,
            sync,
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      // Use resolveAsyncJobResponse to handle both sync and async responses
      const { result } = await resolveAsyncJobResponse(response, {
        signal: abortControllerRef.current.signal,
        errorLabel: 'grade section',
      });

      if (!result) {
        throw new Error('Grading completed but no result was returned.');
      }

      // Handle the grade response structure
      const grade = result.grade || result;

      // Convert results array to map by component_id
      const gradesMap = {};
      if (Array.isArray(grade.results)) {
        for (const r of grade.results) {
          gradesMap[r.component_id] = {
            status: r.passed ? 'correct' : 'incorrect',
            passed: r.passed,
            points: r.points,
            earnedPoints: r.earned_points,
            feedback: r.details?.feedback,
            expected: r.details?.expected,
            received: r.details?.received,
          };
        }
      }

      const totalScore = grade.earned_points ?? 0;
      const maxScore = grade.total_points ?? 0;

      setSectionGraded(sectionId, gradesMap, totalScore, maxScore);

      return {
        passed: grade.passed,
        totalScore,
        maxScore,
        grades: gradesMap,
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        return null; // Cancelled, don't update state
      }
      console.error('[useV2Grading] Grading failed:', error);
      setSectionError(sectionId, error.message || 'Grading failed');
      throw error;
    }
  }, [courseId, nodeId, getSectionAnswers, setSectionGrading, setSectionGraded, setSectionError]);

  /**
   * Cancel any in-flight grading request
   */
  const cancelGrading = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    gradeSection,
    cancelGrading,
  };
}
