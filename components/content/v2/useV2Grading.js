"use client";

import { useState, useCallback, useRef } from "react";
import { authFetch } from "@/lib/api";
import { resolveAsyncJobResponse } from "@/utils/asyncJobs";

/**
 * Hook for V2 section grading with async polling support
 * @param {Object} options
 * @param {string} options.courseId - Course ID
 * @param {string} options.nodeId - Node/Lesson ID
 * @returns {Object} Grading functions and state
 */
export function useV2Grading({ courseId, nodeId }) {
  const [isGrading, setIsGrading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  /**
   * Grade a section
   * @param {string} sectionId - Section to grade
   * @param {Object.<string, *>} answers - Answers for the section { componentId: value }
   * @param {Array} [gradingLogic] - Grading rules for the section
   * @returns {Promise<{success: boolean, grade?: Object, error?: string}>}
   */
  const gradeSection = useCallback(async (sectionId, answers, gradingLogic) => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (!answers || Object.keys(answers).length === 0) {
      return { success: false, error: 'No answers to grade' };
    }

    setIsGrading(true);
    setError(null);

    try {
      const requestBody = {
        sectionId,
        answers,
        ...(gradingLogic && { grading_logic: gradingLogic }),
      };
      console.log('[useV2Grading] Sending grade request:', JSON.stringify(requestBody, null, 2));

      const response = await authFetch(
        `/api/courses/${courseId}/nodes/${nodeId}/grade`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
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

      // Convert results array to map by component_id if needed
      let resultsMap = {};
      if (Array.isArray(grade.results)) {
        for (const r of grade.results) {
          const details = r.details || {};

          // Build component grade object with all relevant fields
          const componentGrade = {
            status: r.passed ? 'correct' : 'incorrect',
            passed: r.passed,
            score: r.score,
            points: r.points_possible,
            earnedPoints: r.points_earned,
            evaluator: r.evaluator,
            // Feedback from LLM evaluator or other sources
            feedback: details.feedback || null,
            // Expected/actual for comparison evaluators
            expected: details.expected,
            actual: details.actual,
            // For code_runner: test case results
            testResults: details.results || null,
            passedCount: details.passed_count,
            totalCount: details.total_count,
            // Execution details (stdout, stderr, error)
            stdout: details.stdout || null,
            stderr: details.stderr || null,
            error: details.error || null,
            executionTimeMs: details.execution_time_ms || null,
            // Preserve full details for specialized displays
            details: details,
          };

          resultsMap[r.component_id] = componentGrade;
        }
      } else if (grade.results && typeof grade.results === 'object') {
        resultsMap = grade.results;
      }

      return {
        success: true,
        grade: {
          passed: grade.passed,
          earned_points: grade.earned_points ?? 0,
          total_points: grade.total_points ?? 0,
          results: resultsMap,
          feedback: grade.feedback,
        },
      };

    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: false, error: 'Request cancelled' };
      }
      console.error('[useV2Grading] Grading failed:', err);
      const errorMessage = err.message || 'Grading failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsGrading(false);
    }
  }, [courseId, nodeId]);

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
    isGrading,
    error,
  };
}
