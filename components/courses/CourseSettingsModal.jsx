"use client";

import { motion, AnimatePresence } from "framer-motion";
import { InfoTooltip } from "@/components/ui/Tooltip";
import OnboardingTooltip from "@/components/ui/OnboardingTooltip";
import TimerControls from "./TimerControls";

export default function CourseSettingsModal({ 
  isOpen, 
  onClose, 
  currentSeconds,
  onTimerUpdate,
  courseName,
  isTimerPaused,
  onPauseToggle
}) {
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
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[var(--border)] bg-[var(--surface-1)]/95 shadow-2xl backdrop-blur-xl overflow-visible"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                  <svg className="h-5 w-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">Course Settings</h2>
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
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-6 space-y-6">
              {/* Timer Controls Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <OnboardingTooltip
                    id="settings-modal-intro"
                    content="This is where you can manage your study time. Use the quick buttons to add or subtract time, or set a custom duration. Your progress is automatically saved!"
                    position="bottom"
                    pointerPosition="left"
                    delay={300}
                    priority={9}
                    showCondition={isOpen}
                  >
                    <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                      Timer Controls
                      <InfoTooltip content="Adjust your remaining study time. Use quick buttons for common adjustments or set a custom time below." position="right" />
                    </h3>
                  </OnboardingTooltip>
                </div>

                <TimerControls 
                  currentSeconds={currentSeconds}
                  onTimerUpdate={onTimerUpdate}
                  isTimerPaused={isTimerPaused}
                  onPauseToggle={onPauseToggle}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
