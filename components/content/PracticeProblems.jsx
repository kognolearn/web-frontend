"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MathJax } from "better-react-mathjax";
import { normalizeLatex } from "@/utils/richText";

/**
 * Renders practice problems with collapsible solutions, rubrics, and self-assessment features
 * 
 * @param {Object} props
 * @param {Array} props.problems - Array of PracticeProblem objects
 */
export default function PracticeProblems({ problems = [] }) {
  const [expandedSolutions, setExpandedSolutions] = useState(new Set());
  const [expandedRubrics, setExpandedRubrics] = useState(new Set());
  const [revealedSteps, setRevealedSteps] = useState({}); // { problemIdx: stepIdx }
  const [selfGrades, setSelfGrades] = useState({}); // { problemIdx: { criterionIdx: boolean } }

  const validProblems = useMemo(() => 
    problems.filter(p => p && p.question && (!p._validated || p._validationConfidence !== "low")),
    [problems]
  );

  if (!validProblems.length) {
    return (
      <div className="text-center py-12 text-[var(--muted-foreground)]">
        No practice problems available for this lesson.
      </div>
    );
  }

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

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "Hard": return "bg-red-500/15 text-red-400 border-red-500/30";
      case "Medium": return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
      default: return "bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)]/30";
    }
  };

  return (
    <div className="space-y-8">
      {validProblems.map((problem, idx) => {
        const isSolutionExpanded = expandedSolutions.has(idx);
        const isRubricExpanded = expandedRubrics.has(idx);
        const stepsRevealed = revealedSteps[idx] ?? 0;
        const totalSteps = problem.sample_answer?.solution_steps?.length || 0;
        const selfScore = calculateSelfScore(idx, problem.rubric);

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="backdrop-blur-xl bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-lg"
          >
            {/* Problem Header */}
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="px-3 py-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-sm font-semibold">
                  Problem {idx + 1}
                </span>
                
                {problem.difficulty && (
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getDifficultyColor(problem.difficulty)}`}>
                    {problem.difficulty}
                  </span>
                )}
                
                {problem.estimated_minutes && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-2)] text-[var(--muted-foreground)] text-xs">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {problem.estimated_minutes} min
                  </span>
                )}

                {selfScore && (
                  <span className="ml-auto px-3 py-1 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-sm font-medium">
                    Self-Score: {selfScore.earned}/{selfScore.total}
                  </span>
                )}
              </div>

              {/* Topic Tags */}
              {problem.topic_tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {problem.topic_tags.map((tag, tagIdx) => (
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
                    {normalizeLatex(problem.question)}
                  </div>
                </MathJax>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 py-4 bg-[var(--surface-2)]/50 flex flex-wrap gap-3">
              <button
                onClick={() => toggleSolution(idx)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-[var(--primary-contrast)] text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
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

              {problem.rubric && (
                <button
                  onClick={() => toggleRubric(idx)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] text-[var(--foreground)] text-sm font-medium hover:bg-[var(--surface-2)] transition-colors"
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
            </div>

            {/* Collapsible Solution */}
            <AnimatePresence>
              {isSolutionExpanded && problem.sample_answer && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 border-t border-[var(--border)] space-y-6">
                    {/* Solution Steps - Progressive Reveal */}
                    {problem.sample_answer.solution_steps?.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wide">
                            Solution Steps
                          </h4>
                          <div className="flex gap-2">
                            {stepsRevealed < totalSteps && (
                              <button
                                onClick={() => revealNextStep(idx, totalSteps)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors"
                              >
                                Reveal Next Step
                              </button>
                            )}
                            {stepsRevealed < totalSteps && (
                              <button
                                onClick={() => revealAllSteps(idx, totalSteps)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                              >
                                Show All
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          {problem.sample_answer.solution_steps.map((step, stepIdx) => (
                            <motion.div
                              key={stepIdx}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ 
                                opacity: stepIdx < stepsRevealed ? 1 : 0.3,
                                x: 0,
                                filter: stepIdx < stepsRevealed ? "blur(0px)" : "blur(4px)"
                              }}
                              transition={{ delay: stepIdx * 0.1 }}
                              className={`p-4 rounded-xl ${
                                stepIdx < stepsRevealed 
                                  ? 'bg-[var(--surface-2)] border border-[var(--border)]' 
                                  : 'bg-[var(--surface-2)]/50 border border-transparent cursor-pointer'
                              }`}
                              onClick={() => stepIdx >= stepsRevealed && revealNextStep(idx, totalSteps)}
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
                                      {stepIdx < stepsRevealed ? normalizeLatex(step) : "Click to reveal..."}
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
                    {problem.sample_answer.final_answer && stepsRevealed >= totalSteps && (
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
                              {normalizeLatex(problem.sample_answer.final_answer)}
                            </div>
                          </MathJax>
                        </div>
                      </motion.div>
                    )}

                    {/* Key Insights */}
                    {problem.sample_answer.key_insights?.length > 0 && stepsRevealed >= totalSteps && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <h4 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wide mb-3">
                          💡 Key Insights
                        </h4>
                        <div className="space-y-2">
                          {problem.sample_answer.key_insights.map((insight, insightIdx) => (
                            <div
                              key={insightIdx}
                              className="p-3 rounded-lg bg-[var(--info)]/10 border border-[var(--info)]/30 text-sm text-[var(--foreground)]"
                            >
                              <MathJax dynamic>{normalizeLatex(insight)}</MathJax>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Alternative Approaches */}
                    {problem.sample_answer.alternative_approaches?.length > 0 && stepsRevealed >= totalSteps && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <h4 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
                          Alternative Approaches
                        </h4>
                        <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
                          {problem.sample_answer.alternative_approaches.map((alt, altIdx) => (
                            <li key={altIdx} className="flex items-start gap-2">
                              <span className="text-[var(--primary)]">•</span>
                              <MathJax dynamic>{normalizeLatex(alt)}</MathJax>
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
              {isRubricExpanded && problem.rubric && (
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
                        Grading Rubric ({problem.rubric.total_points} points)
                      </h4>
                      {selfScore && (
                        <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                          selfScore.earned >= problem.rubric.total_points * 0.7
                            ? 'bg-[var(--success)]/15 text-[var(--success)]'
                            : selfScore.earned >= problem.rubric.total_points * 0.4
                            ? 'bg-[var(--warning)]/15 text-[var(--warning)]'
                            : 'bg-[var(--danger)]/15 text-[var(--danger)]'
                        }`}>
                          {selfScore.earned}/{selfScore.total} points
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      {problem.rubric.grading_criteria?.map((criterion, critIdx) => {
                        const isChecked = selfGrades[idx]?.[critIdx] ?? false;
                        
                        return (
                          <div
                            key={critIdx}
                            className={`p-4 rounded-xl border transition-colors ${
                              isChecked 
                                ? 'bg-[var(--success)]/10 border-[var(--success)]/30' 
                                : 'bg-[var(--surface-1)] border-[var(--border)]'
                            }`}
                          >
                            <label className="flex items-start gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleCriterionGrade(idx, critIdx)}
                                className="mt-0.5 w-5 h-5 rounded border-2 border-[var(--border)] bg-[var(--surface-2)] checked:bg-[var(--primary)] checked:border-[var(--primary)] transition-colors cursor-pointer"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-[var(--foreground)]">
                                    {criterion.criterion}
                                  </span>
                                  <span className="text-xs font-semibold text-[var(--primary)]">
                                    {criterion.points} pts
                                  </span>
                                </div>
                                
                                {criterion.common_errors?.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-[var(--border)]/50">
                                    <p className="text-xs text-[var(--warning)] font-medium mb-1">
                                      ⚠️ Watch out for:
                                    </p>
                                    <ul className="text-xs text-[var(--muted-foreground)] space-y-0.5">
                                      {criterion.common_errors.map((err, errIdx) => (
                                        <li key={errIdx}>• {err}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </label>
                          </div>
                        );
                      })}
                    </div>

                    {problem.rubric.partial_credit_policy && (
                      <div className="mt-4 p-3 rounded-lg bg-[var(--info)]/10 border border-[var(--info)]/30">
                        <p className="text-xs text-[var(--info)]">
                          <span className="font-semibold">Partial Credit Policy:</span> {problem.rubric.partial_credit_policy}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
