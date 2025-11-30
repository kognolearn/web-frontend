"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { InfoTooltip } from "@/components/ui/Tooltip";
import OnboardingTooltip from "@/components/ui/OnboardingTooltip";

export default function EditCourseModal({ 
  isOpen, 
  onClose, 
  courseId,
  userId,
  courseName
}) {
  const [modificationText, setModificationText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setModificationText("");
      setSubmitStatus(null);
    }
  }, [isOpen]);

  const handleModificationSubmit = async () => {
    if (!modificationText.trim()) return;
    
    setIsSubmitting(true);
    setSubmitStatus(null);
    
    try {
      // This will call the backend API to modify the course
      const response = await fetch(`/api/courses/${courseId}/modify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          modificationRequest: modificationText
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit modification request');
      }
      
      setSubmitStatus('success');
      setModificationText("");
      
      // Auto-close success message after 3 seconds
      setTimeout(() => {
        setSubmitStatus(null);
      }, 3000);
    } catch (error) {
      console.error('Error submitting modification:', error);
      setSubmitStatus('error');
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
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[var(--border)] bg-[var(--surface-1)]/95 shadow-2xl backdrop-blur-xl"
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
                className="rounded-xl p-2 transition-colors hover:bg-[var(--surface-muted)]"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto overflow-x-visible p-6 pt-4 space-y-4">
              {/* Onboarding tooltip for first-time users */}
              <OnboardingTooltip
                id="edit-modal-intro"
                content="Describe any changes you'd like to make to your course in natural language. For example: 'Add more practice problems' or 'Focus less on theory'. We'll update your course accordingly!"
                position="bottom"
                pointerPosition="center"
                delay={300}
                priority={10}
                showCondition={isOpen}
              >
                <p className="text-sm text-[var(--muted-foreground)] flex items-start gap-2">
                  <span>Describe what you'd like to change or add to the course. We'll process your request and update the course structure accordingly.</span>
                  <InfoTooltip content="Use natural language to describe changes like adding topics, adjusting content difficulty, including more examples, or restructuring modules. We'll interpret your request and make appropriate modifications." position="bottom" />
                </p>
              </OnboardingTooltip>

              {/* Text Input */}
              <div>
                <label className="mb-2 block text-xs font-medium text-[var(--muted-foreground)] flex items-center gap-1.5">
                  Modification Request
                  <InfoTooltip content="Be specific about what you want changed. For example: 'Add more practice problems for derivatives' or 'Remove the section on advanced recursion since I already know it well'." position="right" />
                </label>
                <textarea
                  value={modificationText}
                  onChange={(e) => setModificationText(e.target.value)}
                  placeholder="E.g., 'Add more examples about recursion' or 'Include a section on async/await patterns'"
                  rows={6}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none"
                />
              </div>

              {/* Submit Status */}
              {submitStatus === 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400"
                >
                  ✓ Modification request submitted successfully!
                </motion.div>
              )}
              
              {submitStatus === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
                >
                  ✗ Failed to submit modification request. Please try again.
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleModificationSubmit}
                disabled={!modificationText.trim() || isSubmitting}
                className="w-full rounded-lg bg-[var(--primary)] px-6 py-3 text-sm font-medium text-[var(--primary-contrast)] transition-all hover:bg-[var(--primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Submit Modification Request
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
