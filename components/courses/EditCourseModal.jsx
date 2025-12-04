"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { InfoTooltip } from "@/components/ui/Tooltip";
import OnboardingTooltip from "@/components/ui/OnboardingTooltip";
import { authFetch } from "@/lib/api";

export default function EditCourseModal({ 
  isOpen, 
  onClose, 
  courseId,
  userId,
  courseName,
  studyPlan,
  onRefetch
}) {
  const [modificationText, setModificationText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedLessons, setSelectedLessons] = useState(new Set());
  const [expandedModules, setExpandedModules] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Extract all lessons from study plan
  const allLessons = useMemo(() => {
    if (!studyPlan?.modules) return [];
    return studyPlan.modules.flatMap((module, moduleIdx) => 
      (module.lessons || []).map(lesson => ({
        ...lesson,
        moduleName: module.title,
        moduleIdx
      }))
    );
  }, [studyPlan]);

  // Filter lessons by search query
  const filteredModules = useMemo(() => {
    if (!studyPlan?.modules) return [];
    if (!searchQuery.trim()) return studyPlan.modules;
    
    const query = searchQuery.toLowerCase();
    return studyPlan.modules
      .map(module => ({
        ...module,
        lessons: (module.lessons || []).filter(lesson => 
          lesson.title.toLowerCase().includes(query) ||
          module.title.toLowerCase().includes(query)
        )
      }))
      .filter(module => module.lessons.length > 0);
  }, [studyPlan, searchQuery]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setModificationText("");
      setSubmitStatus(null);
      setErrorMessage("");
      setSelectedLessons(new Set());
      setExpandedModules(new Set());
      setSearchQuery("");
    }
  }, [isOpen]);

  const toggleLesson = (lessonId) => {
    const newSelected = new Set(selectedLessons);
    if (newSelected.has(lessonId)) {
      newSelected.delete(lessonId);
    } else {
      newSelected.add(lessonId);
    }
    setSelectedLessons(newSelected);
  };

  const toggleModule = (moduleIdx) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleIdx)) {
      newExpanded.delete(moduleIdx);
    } else {
      newExpanded.add(moduleIdx);
    }
    setExpandedModules(newExpanded);
  };

  const selectAllInModule = (moduleLessons) => {
    const newSelected = new Set(selectedLessons);
    const lessonIds = moduleLessons.map(l => l.id);
    const allSelected = lessonIds.every(id => newSelected.has(id));
    
    if (allSelected) {
      lessonIds.forEach(id => newSelected.delete(id));
    } else {
      lessonIds.forEach(id => newSelected.add(id));
    }
    setSelectedLessons(newSelected);
  };

  const clearSelection = () => {
    setSelectedLessons(new Set());
  };

  const handleModificationSubmit = async () => {
    if (!modificationText.trim()) return;
    
    setIsSubmitting(true);
    setSubmitStatus(null);
    setErrorMessage("");
    
    try {
      const response = await authFetch(`/api/courses/${courseId}/restructure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          prompt: modificationText,
          lessonIds: selectedLessons.size > 0 ? Array.from(selectedLessons) : undefined
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || 'Failed to submit modification request');
      }
      
      const result = await response.json();
      setSubmitStatus('success');
      setModificationText("");
      setSelectedLessons(new Set());
      
      // Refetch study plan to show updates
      if (onRefetch) {
        await onRefetch();
      }
      
      // Auto-close modal after success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error submitting modification:', error);
      setSubmitStatus('error');
      setErrorMessage(error.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[var(--border)] bg-[var(--surface-1)]/95 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                  <svg className="h-5 w-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">Edit Course</h2>
                  <p className="text-xs text-[var(--muted-foreground)]">{courseName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl p-2 transition-colors hover:bg-[var(--surface-muted)] disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto overflow-x-visible p-6 pt-4 space-y-5">
              {/* Intro Text */}
              <OnboardingTooltip
                id="edit-modal-intro"
                content="Describe any changes you'd like to make to your course in natural language. You can also select specific lessons to target!"
                position="bottom"
                pointerPosition="center"
                delay={300}
                priority={10}
                showCondition={isOpen}
              >
                <p className="text-sm text-[var(--muted-foreground)] flex items-start gap-2">
                  <span>Describe what changes you'd like to make. Optionally select specific lessons to target.</span>
                  <InfoTooltip content="Use natural language to describe changes like adding topics, adjusting content difficulty, or changing analogies. If you select lessons, only those will be modified." position="bottom" />
                </p>
              </OnboardingTooltip>

              {/* Modification Request Input */}
              <div>
                <label className="mb-2 block text-xs font-medium text-[var(--muted-foreground)] flex items-center gap-1.5">
                  What would you like to change?
                  <InfoTooltip content="Be specific! For example: 'Use speedometer analogies for limits' or 'Add more visual examples to the derivatives section'." position="right" />
                </label>
                <textarea
                  value={modificationText}
                  onChange={(e) => setModificationText(e.target.value)}
                  placeholder="E.g., 'Change the analogy in the limits lesson to use speedometers' or 'Add more practice problems for integration'"
                  rows={4}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none disabled:opacity-50"
                />
              </div>

              {/* Lesson Selection Section */}
              {studyPlan?.modules && studyPlan.modules.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[var(--muted-foreground)] flex items-center gap-1.5">
                      Target Specific Lessons
                      <span className="text-[10px] font-normal text-[var(--muted-foreground)]/70">(optional)</span>
                      <InfoTooltip content="If no lessons are selected, the AI will automatically identify which lessons need to change based on your request." position="right" />
                    </label>
                    {selectedLessons.size > 0 && (
                      <button
                        type="button"
                        onClick={clearSelection}
                        disabled={isSubmitting}
                        className="text-xs text-[var(--primary)] hover:underline disabled:opacity-50"
                      >
                        Clear ({selectedLessons.size} selected)
                      </button>
                    )}
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search lessons..."
                      disabled={isSubmitting}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-50"
                    />
                  </div>

                  {/* Module/Lesson List */}
                  <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 divide-y divide-[var(--border)]">
                    {filteredModules.length === 0 ? (
                      <div className="p-4 text-center text-sm text-[var(--muted-foreground)]">
                        No lessons found matching "{searchQuery}"
                      </div>
                    ) : (
                      filteredModules.map((module, moduleIdx) => {
                        const moduleLessons = module.lessons || [];
                        const selectedCount = moduleLessons.filter(l => selectedLessons.has(l.id)).length;
                        const isExpanded = expandedModules.has(moduleIdx) || searchQuery.trim() !== '';
                        const allSelected = moduleLessons.length > 0 && selectedCount === moduleLessons.length;
                        
                        return (
                          <div key={moduleIdx}>
                            {/* Module Header */}
                            <button
                              type="button"
                              onClick={() => toggleModule(moduleIdx)}
                              disabled={isSubmitting}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-muted)]/50 transition-colors disabled:opacity-50"
                            >
                              <div className="flex items-center gap-3">
                                <svg 
                                  className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <div className="flex items-center gap-2">
                                  <span className="flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-md bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-semibold">
                                    {moduleIdx + 1}
                                  </span>
                                  <span className="text-sm font-medium text-[var(--foreground)] text-left">
                                    {module.title}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {selectedCount > 0 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-medium">
                                    {selectedCount} selected
                                  </span>
                                )}
                                <span className="text-xs text-[var(--muted-foreground)]">
                                  {moduleLessons.length} lessons
                                </span>
                              </div>
                            </button>

                            {/* Lessons */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="bg-[var(--surface-1)]/50 border-t border-[var(--border)]">
                                    {/* Select All in Module */}
                                    <button
                                      type="button"
                                      onClick={() => selectAllInModule(moduleLessons)}
                                      disabled={isSubmitting}
                                      className="w-full flex items-center gap-3 px-4 py-2 text-xs text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors border-b border-[var(--border)]/50 disabled:opacity-50"
                                    >
                                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                        allSelected 
                                          ? 'bg-[var(--primary)] border-[var(--primary)]' 
                                          : selectedCount > 0 
                                            ? 'border-[var(--primary)] bg-[var(--primary)]/20'
                                            : 'border-[var(--border)]'
                                      }`}>
                                        {allSelected && (
                                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                        {!allSelected && selectedCount > 0 && (
                                          <div className="w-2 h-2 bg-[var(--primary)] rounded-sm" />
                                        )}
                                      </div>
                                      {allSelected ? 'Deselect all in module' : 'Select all in module'}
                                    </button>

                                    {/* Individual Lessons */}
                                    {moduleLessons.map((lesson, lessonIdx) => {
                                      const isSelected = selectedLessons.has(lesson.id);
                                      return (
                                        <button
                                          key={lesson.id}
                                          type="button"
                                          onClick={() => toggleLesson(lesson.id)}
                                          disabled={isSubmitting}
                                          className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors disabled:opacity-50 ${
                                            isSelected 
                                              ? 'bg-[var(--primary)]/10' 
                                              : 'hover:bg-[var(--surface-muted)]/30'
                                          }`}
                                        >
                                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                            isSelected 
                                              ? 'bg-[var(--primary)] border-[var(--primary)]' 
                                              : 'border-[var(--border)]'
                                          }`}>
                                            {isSelected && (
                                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                              </svg>
                                            )}
                                          </div>
                                          <span className="text-xs text-[var(--muted-foreground)] w-5">
                                            {lessonIdx + 1}.
                                          </span>
                                          <span className={`text-sm text-left flex-1 ${isSelected ? 'text-[var(--foreground)] font-medium' : 'text-[var(--foreground)]'}`}>
                                            {lesson.title}
                                          </span>
                                          {lesson.duration && (
                                            <span className="text-[10px] text-[var(--muted-foreground)]">
                                              {lesson.duration}m
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Selection Summary */}
                  {selectedLessons.size > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(selectedLessons).slice(0, 5).map(lessonId => {
                        const lesson = allLessons.find(l => l.id === lessonId);
                        if (!lesson) return null;
                        return (
                          <span
                            key={lessonId}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-xs"
                          >
                            {lesson.title.length > 25 ? lesson.title.slice(0, 25) + '...' : lesson.title}
                            <button
                              type="button"
                              onClick={() => toggleLesson(lessonId)}
                              disabled={isSubmitting}
                              className="hover:bg-[var(--primary)]/20 rounded p-0.5 disabled:opacity-50"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        );
                      })}
                      {selectedLessons.size > 5 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-lg bg-[var(--surface-muted)] text-[var(--muted-foreground)] text-xs">
                          +{selectedLessons.size - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Submit Status */}
              <AnimatePresence mode="wait">
                {submitStatus === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Course updated successfully! Refreshing...</span>
                  </motion.div>
                )}
                
                {submitStatus === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-start gap-2"
                  >
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{errorMessage || 'Failed to update course. Please try again.'}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleModificationSubmit}
                disabled={!modificationText.trim() || isSubmitting}
                className="w-full rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-active)] px-6 py-3.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-[var(--primary)]/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Updating Course...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>
                      Apply Changes
                      {selectedLessons.size > 0 && ` to ${selectedLessons.size} lesson${selectedLessons.size > 1 ? 's' : ''}`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
