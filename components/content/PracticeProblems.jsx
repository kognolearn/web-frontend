"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MathJax } from "better-react-mathjax";
import { normalizeLatex } from "@/utils/richText";

/**
 * Decodes HTML entities in text (e.g., &amp; -> &, &gt; -> >, &lt; -> <)
 */
function decodeHtmlEntities(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Normalizes text by decoding HTML entities and then normalizing LaTeX
 */
function normalizeText(text) {
  return normalizeLatex(decodeHtmlEntities(text));
}

/**
 * Renders practice problems with one-at-a-time navigation, collapsible solutions,
 * rubrics, and self-assessment features
 * 
 * @param {Object} props
 * @param {Array} props.problems - Array of PracticeProblem objects
 */
export default function PracticeProblems({ problems = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedSolutions, setExpandedSolutions] = useState(new Set());
  const [expandedRubrics, setExpandedRubrics] = useState(new Set());
  const [revealedSteps, setRevealedSteps] = useState({}); // { problemIdx: stepIdx }
  const [selfGrades, setSelfGrades] = useState({}); // { problemIdx: { criterionIdx: boolean } }
  const [completedProblems, setCompletedProblems] = useState(new Set());
  const [isReviewMode, setIsReviewMode] = useState(false);

  const validProblems = useMemo(() => 
    problems.filter(p => p && p.question && (!p._validated || p._validationConfidence !== "low")),
    [problems]
  );

  const problemCount = validProblems.length;
  const currentProblem = validProblems[currentIndex] ?? null;

  const toggleSolution = (idx) => {
    setExpandedSolutions(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleRubric = (idx) => {
    setExpandedRubrics(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const revealNextStep = (problemIdx, currentStepCount) => {
    setRevealedSteps(prev => ({
      ...prev,
      [problemIdx]: Math.min((prev[problemIdx] ?? 0) + 1, currentStepCount)
    }));
  };

  const revealAllSteps = (problemIdx, totalSteps) => {
    setRevealedSteps(prev => ({
      ...prev,
      [problemIdx]: totalSteps
    }));
  };

  const revealToStep = (problemIdx, stepIndex) => {
    setRevealedSteps(prev => ({
      ...prev,
      [problemIdx]: Math.max((prev[problemIdx] ?? 0), stepIndex + 1)
    }));
  };

  const toggleCriterionGrade = (problemIdx, criterionIdx) => {
    setSelfGrades(prev => ({
      ...prev,
      [problemIdx]: {
        ...(prev[problemIdx] || {}),
        [criterionIdx]: !prev[problemIdx]?.[criterionIdx]
      }
    }));
  };

  const calculateSelfScore = (problemIdx, rubric) => {
    if (!rubric?.grading_criteria) return null;
    const grades = selfGrades[problemIdx] || {};
    let earned = 0;
    rubric.grading_criteria.forEach((c, i) => {
      if (grades[i]) earned += c.points;
    });
    return { earned, total: rubric.total_points };
  };

  const markCompleted = (idx) => {
    setCompletedProblems(prev => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  };

  const handleNavigate = useCallback((direction) => {
    setCurrentIndex(prev => {
      const next = prev + direction;
      if (next < 0) return 0;
      if (next >= problemCount) return problemCount - 1;
      return next;
    });
  }, [problemCount]);

  const handleFinishReview = () => {
    setIsReviewMode(true);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "Hard": return "bg-red-500/15 text-red-400 border-red-500/30";
      case "Medium": return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
      default: return "bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)]/30";
    }
  };

  // Calculate overall progress
  const progressStats = useMemo(() => {
    let totalPoints = 0;
    let earnedPoints = 0;
    let gradedCount = 0;
    
    validProblems.forEach((problem, idx) => {
      const score = calculateSelfScore(idx, problem.rubric);
      if (score && Object.keys(selfGrades[idx] || {}).length > 0) {
        totalPoints += score.total;
        earnedPoints += score.earned;
        gradedCount++;
      }
    });
    
    return { 
      totalPoints, 
      earnedPoints, 
      gradedCount,
      completedCount: completedProblems.size
    };
  }, [validProblems, selfGrades, completedProblems]);

  if (!validProblems.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-[var(--muted-foreground)]">No practice problems available for this lesson.</p>
      </div>
    );
  }

  const isSolutionExpanded = expandedSolutions.has(currentIndex);
  const isRubricExpanded = expandedRubrics.has(currentIndex);
  const stepsRevealed = revealedSteps[currentIndex] ?? 0;
  const totalSteps = currentProblem?.sample_answer?.solution_steps?.length || 0;
  const selfScore = calculateSelfScore(currentIndex, currentProblem?.rubric);
  const isCurrentCompleted = completedProblems.has(currentIndex);

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Progress bar and navigation */}
      <div className="mb-8">
        <div className="flex flex-col gap-1 mb-3">
          <span className="text-sm font-medium text-[var(--foreground)]">
            Problem {currentIndex + 1} of {problemCount}
          </span>
          {progressStats.gradedCount > 0 && (
            <span className="text-sm font-medium text-emerald-500">
              {progressStats.earnedPoints}/{progressStats.totalPoints} points ({progressStats.gradedCount} graded)
            </span>
          )}
        </div>
        <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[var(--primary)] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${((currentIndex + 1) / problemCount) * 100}%` }}
          />
        </div>
        
        {/* Problem navigation dots */}
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
          {validProblems.map((problem, idx) => {
            const isCurrent = idx === currentIndex;
            const isCompleted = completedProblems.has(idx);
            const hasGraded = Object.keys(selfGrades[idx] || {}).length > 0;
            const score = calculateSelfScore(idx, problem.rubric);
            const hasSolutionViewed = expandedSolutions.has(idx);
            
            let statusClass = "bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]";
            let icon = null;
            
            if (isCompleted && hasGraded && score) {
              const percentage = score.earned / score.total;
              if (percentage >= 0.7) {
                statusClass = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
                icon = (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                );
              } else if (percentage >= 0.4) {
                statusClass = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
                icon = (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
                  </svg>
                );
              } else {
                statusClass = "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
                icon = (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                );
              }
            } else if (hasSolutionViewed) {
              statusClass = "bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)]/30";
            }
            
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`
                  w-8 h-8 rounded-lg border text-sm font-medium
                  transition-all duration-200 cursor-pointer
                  flex items-center justify-center
                  ${statusClass}
                  ${isCurrent ? "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--background)] scale-110" : "hover:scale-105"}
                `}
                aria-label={`Go to problem ${idx + 1}`}
                aria-current={isCurrent ? "true" : undefined}
              >
                {icon || (idx + 1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Problem */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="backdrop-blur-xl bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-lg"
        >
          {/* Problem Header */}
          <div className="p-6 border-b border-[var(--border)]">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="px-3 py-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-sm font-semibold">
                Problem {currentIndex + 1}
              </span>
              
              {currentProblem.difficulty && (
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getDifficultyColor(currentProblem.difficulty)}`}>
                  {currentProblem.difficulty}
                </span>
              )}
              
              {currentProblem.estimated_minutes && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-2)] text-[var(--muted-foreground)] text-xs">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {currentProblem.estimated_minutes} min
                </span>
              )}

              {selfScore && Object.keys(selfGrades[currentIndex] || {}).length > 0 && (
                <span className={`ml-auto px-3 py-1 rounded-lg text-sm font-medium ${
                  selfScore.earned >= selfScore.total * 0.7
                    ? 'bg-[var(--success)]/15 text-[var(--success)]'
                    : selfScore.earned >= selfScore.total * 0.4
                    ? 'bg-[var(--warning)]/15 text-[var(--warning)]'
                    : 'bg-[var(--danger)]/15 text-[var(--danger)]'
                }`}>
                  {selfScore.earned}/{selfScore.total} pts
                </span>
              )}
            </div>

            {/* Topic Tags */}
            {currentProblem.topic_tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {currentProblem.topic_tags.map((tag, tagIdx) => (
                  <span 
                    key={tagIdx}
                    className="px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--muted-foreground)] text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Problem Question */}
            <div className="prose prose-invert max-w-none">
              <MathJax dynamic>
                <div className="whitespace-pre-wrap text-[var(--foreground)] leading-relaxed">
                  {normalizeText(currentProblem.question)}
                </div>
              </MathJax>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-4 bg-[var(--surface-2)]/50 flex flex-wrap gap-3">
            <button
              onClick={() => toggleSolution(currentIndex)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-[var(--primary-contrast)] text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors cursor-pointer"
            >
              <svg 
                className={`w-4 h-4 transition-transform ${isSolutionExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {isSolutionExpanded ? 'Hide Solution' : 'Show Solution'}
            </button>

            {currentProblem.rubric && (
              <button
                onClick={() => toggleRubric(currentIndex)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] text-[var(--foreground)] text-sm font-medium hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
              >
                <svg 
                  className={`w-4 h-4 transition-transform ${isRubricExpanded ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                {isRubricExpanded ? 'Hide Rubric' : 'Self-Grade'}
              </button>
            )}

            {!isCurrentCompleted && (isSolutionExpanded || isRubricExpanded) && (
              <button
                onClick={() => markCompleted(currentIndex)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-sm font-medium hover:bg-emerald-500/25 transition-colors cursor-pointer ml-auto"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Mark Complete
              </button>
            )}

            {isCurrentCompleted && (
              <span className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-sm font-medium ml-auto">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Completed
              </span>
            )}
          </div>

          {/* Collapsible Solution */}
          <AnimatePresence>
            {isSolutionExpanded && currentProblem.sample_answer && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-6 border-t border-[var(--border)] space-y-6">
                  {/* Solution Steps - Progressive Reveal */}
                  {currentProblem.sample_answer.solution_steps?.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wide">
                          Solution Steps ({stepsRevealed}/{totalSteps})
                        </h4>
                        <div className="flex gap-2">
                          {stepsRevealed < totalSteps && (
                            <button
                              onClick={() => revealNextStep(currentIndex, totalSteps)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors cursor-pointer"
                            >
                              Reveal Next Step
                            </button>
                          )}
                          {stepsRevealed < totalSteps && (
                            <button
                              onClick={() => revealAllSteps(currentIndex, totalSteps)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                            >
                              Show All
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {currentProblem.sample_answer.solution_steps.map((step, stepIdx) => (
                          <motion.div
                            key={stepIdx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ 
                              opacity: stepIdx < stepsRevealed ? 1 : 0.3,
                              x: 0,
                              filter: stepIdx < stepsRevealed ? "blur(0px)" : "blur(4px)"
                            }}
                            transition={{ 
                              duration: 0.2,
                              delay: stepIdx < stepsRevealed ? 0 : stepIdx * 0.03 
                            }}
                            className={`p-4 rounded-xl ${
                              stepIdx < stepsRevealed 
                                ? 'bg-[var(--surface-2)] border border-[var(--border)]' 
                                : 'bg-[var(--surface-2)]/50 border border-transparent cursor-pointer'
                            }`}
                            onClick={() => stepIdx >= stepsRevealed && revealToStep(currentIndex, stepIdx)}
                          >
                            <div className="flex items-start gap-3">
                              <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                stepIdx < stepsRevealed 
                                  ? 'bg-[var(--primary)] text-[var(--primary-contrast)]' 
                                  : 'bg-[var(--surface-1)] text-[var(--muted-foreground)]'
                              }`}>
                                {stepIdx + 1}
                              </span>
                              <div className="flex-1 prose prose-invert prose-sm max-w-none">
                                <MathJax dynamic>
                                  <span className="text-[var(--foreground)]">
                                    {stepIdx < stepsRevealed ? normalizeText(step) : "Click to reveal..."}
                                  </span>
                                </MathJax>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Final Answer */}
                  {currentProblem.sample_answer.final_answer && stepsRevealed >= totalSteps && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/30"
                    >
                      <h4 className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide mb-2">
                        Final Answer
                      </h4>
                      <div className="prose prose-invert max-w-none">
                        <MathJax dynamic>
                          <div className="text-[var(--foreground)] font-medium">
                            {normalizeText(currentProblem.sample_answer.final_answer)}
                          </div>
                        </MathJax>
                      </div>
                    </motion.div>
                  )}

                    {/* Key Insights */}
                  {currentProblem.sample_answer.key_insights?.length > 0 && stepsRevealed >= totalSteps && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <h4 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wide mb-3">
                        💡 Key Insights
                      </h4>
                      <div className="space-y-2">
                        {currentProblem.sample_answer.key_insights.map((insight, insightIdx) => (
                          <div
                            key={insightIdx}
                            className="p-3 rounded-lg bg-[var(--info)]/10 border border-[var(--info)]/30 text-sm text-[var(--foreground)]"
                          >
                            <MathJax dynamic>{normalizeText(insight)}</MathJax>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Alternative Approaches */}
                  {currentProblem.sample_answer.alternative_approaches?.length > 0 && stepsRevealed >= totalSteps && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <h4 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
                        Alternative Approaches
                      </h4>
                      <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
                        {currentProblem.sample_answer.alternative_approaches.map((alt, altIdx) => (
                          <li key={altIdx} className="flex items-start gap-2">
                            <span className="text-[var(--primary)]">•</span>
                            <MathJax dynamic>{normalizeText(alt)}</MathJax>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapsible Rubric for Self-Grading */}
          <AnimatePresence>
            {isRubricExpanded && currentProblem.rubric && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-6 border-t border-[var(--border)] bg-[var(--surface-2)]/30">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wide">
                      Grading Rubric ({currentProblem.rubric.total_points} points)
                    </h4>
                    {selfScore && Object.keys(selfGrades[currentIndex] || {}).length > 0 && (
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        selfScore.earned >= currentProblem.rubric.total_points * 0.7
                          ? 'bg-[var(--success)]/15 text-[var(--success)]'
                          : selfScore.earned >= currentProblem.rubric.total_points * 0.4
                          ? 'bg-[var(--warning)]/15 text-[var(--warning)]'
                          : 'bg-[var(--danger)]/15 text-[var(--danger)]'
                      }`}>
                        {selfScore.earned}/{selfScore.total} points
                      </span>
                    )}
                  </div>

                  {/* Visual score bar */}
                  {selfScore && Object.keys(selfGrades[currentIndex] || {}).length > 0 && (
                    <div className="mb-4">
                      <div className="h-2 bg-[var(--surface-1)] rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(selfScore.earned / selfScore.total) * 100}%` }}
                          className={`h-full rounded-full ${
                            selfScore.earned >= selfScore.total * 0.7
                              ? 'bg-emerald-500'
                              : selfScore.earned >= selfScore.total * 0.4
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {currentProblem.rubric.grading_criteria?.map((criterion, critIdx) => {
                      const isChecked = selfGrades[currentIndex]?.[critIdx] ?? false;
                      
                      return (
                        <motion.div
                          key={critIdx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: critIdx * 0.05 }}
                          className={`p-4 rounded-xl border transition-all duration-200 ${
                            isChecked 
                              ? 'bg-[var(--success)]/10 border-[var(--success)]/30' 
                              : 'bg-[var(--surface-1)] border-[var(--border)] hover:border-[var(--border-hover)]'
                          }`}
                        >
                          <label className="flex items-start gap-3 cursor-pointer">
                            <div className="relative flex-shrink-0 mt-0.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleCriterionGrade(currentIndex, critIdx)}
                                className="sr-only"
                              />
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                isChecked 
                                  ? 'bg-[var(--success)] border-[var(--success)]' 
                                  : 'border-[var(--border)] bg-[var(--surface-2)]'
                              }`}>
                                {isChecked && (
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-[var(--foreground)]">
                                  {decodeHtmlEntities(criterion.criterion)}
                                </span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                  isChecked 
                                    ? 'bg-[var(--success)]/20 text-[var(--success)]' 
                                    : 'bg-[var(--surface-2)] text-[var(--muted-foreground)]'
                                }`}>
                                  {isChecked ? '+' : ''}{criterion.points} pts
                                </span>
                              </div>
                              
                              {criterion.common_errors?.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-[var(--border)]/50">
                                  <p className="text-xs text-[var(--warning)] font-medium mb-1">
                                    ⚠️ Watch out for:
                                  </p>
                                  <ul className="text-xs text-[var(--muted-foreground)] space-y-0.5">
                                    {criterion.common_errors.map((err, errIdx) => (
                                      <li key={errIdx}>• {decodeHtmlEntities(err)}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </label>
                        </motion.div>
                      );
                    })}
                  </div>

                  {currentProblem.rubric.partial_credit_policy && (
                    <div className="mt-4 p-3 rounded-lg bg-[var(--info)]/10 border border-[var(--info)]/30">
                      <p className="text-xs text-[var(--info)]">
                        <span className="font-semibold">Partial Credit Policy:</span> {decodeHtmlEntities(currentProblem.rubric.partial_credit_policy)}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6 gap-4">
        <button
          type="button"
          onClick={() => handleNavigate(-1)}
          disabled={currentIndex === 0}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
            transition-all duration-200 cursor-pointer
            ${currentIndex === 0
              ? "opacity-50 cursor-not-allowed bg-[var(--surface-2)] text-[var(--muted-foreground)]"
              : "bg-[var(--surface-1)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-2)]"
            }
          `}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        {currentIndex < problemCount - 1 ? (
          <button
            type="button"
            onClick={() => handleNavigate(1)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-[var(--primary-contrast)] text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors cursor-pointer"
          >
            Next
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinishReview}
            disabled={isReviewMode}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer
              ${isReviewMode
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-[var(--primary)] text-[var(--primary-contrast)] hover:bg-[var(--primary-hover)]"
              }
            `}
          >
            {isReviewMode ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Review Complete
              </>
            ) : (
              <>
                Finish Review
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </>
            )}
          </button>
        )}
      </div>

      {/* Summary panel when in review mode */}
      <AnimatePresence>
        {isReviewMode && progressStats.gradedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-6 p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)]"
          >
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Practice Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[var(--surface-2)]">
                <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Problems Graded</p>
                <p className="text-2xl font-bold text-[var(--foreground)]">{progressStats.gradedCount}/{problemCount}</p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--surface-2)]">
                <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Total Score</p>
                <p className={`text-2xl font-bold ${
                  progressStats.earnedPoints >= progressStats.totalPoints * 0.7
                    ? 'text-emerald-500'
                    : progressStats.earnedPoints >= progressStats.totalPoints * 0.4
                    ? 'text-amber-500'
                    : 'text-rose-500'
                }`}>
                  {progressStats.earnedPoints}/{progressStats.totalPoints}
                </p>
              </div>
            </div>
            {progressStats.gradedCount < problemCount && (
              <p className="text-sm text-[var(--muted-foreground)] mt-4">
                💡 Click on any problem number above to review or grade the remaining problems.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}