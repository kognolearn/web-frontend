"use client";

import { motion, AnimatePresence } from "framer-motion";
import TimerControls from "@/components/courses/TimerControls";
import { PersonalTimerControls } from "@/components/courses/PersonalTimer";

export default function TimerControlsModal({
  isOpen,
  onClose,
  secondsRemaining,
  onTimerUpdate,
  minSeconds = 0,
  isCourseGenerating = false,
  isTimerPaused,
  onPauseToggle,
  focusTimerRef,
  focusTimerState
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] sm:w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[var(--border)] bg-[var(--surface-1)]/95 shadow-2xl backdrop-blur-xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 pb-3 sm:p-6 sm:pb-4 border-b border-[var(--border)]">
              <h3 className="text-lg font-semibold">Timer Controls</h3>
              <button onClick={onClose} className="p-1 hover:bg-[var(--surface-2)] rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            {/* Study Timer Section */}
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="text-sm font-semibold text-[var(--foreground)]">Study Timer</h4>
              </div>
              <TimerControls 
                currentSeconds={secondsRemaining}
                onTimerUpdate={onTimerUpdate}
                minSeconds={minSeconds}
                isLocked={isCourseGenerating}
                isTimerPaused={isTimerPaused}
                onPauseToggle={onPauseToggle}
              />
            </div>

            {/* Focus Timer Section */}
            {focusTimerRef && (
              <div className="p-4 pt-0 sm:p-6 sm:pt-0 space-y-4 border-t border-[var(--border)] mt-2">
                <div className="flex items-center gap-2 pt-4">
                  <svg className="h-5 w-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <h4 className="text-sm font-semibold text-[var(--foreground)]">Focus Timer</h4>
                </div>
                <PersonalTimerControls timerRef={focusTimerRef} timerState={focusTimerState} />
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
