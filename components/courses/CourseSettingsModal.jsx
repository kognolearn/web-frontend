"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { InfoTooltip } from "@/components/ui/Tooltip";
import OnboardingTooltip from "@/components/ui/OnboardingTooltip";

export default function CourseSettingsModal({ 
  isOpen, 
  onClose, 
  currentSeconds,
  onTimerUpdate,
  courseName
}) {
  const [customHours, setCustomHours] = useState("");
  const [customMinutes, setCustomMinutes] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCustomHours("");
      setCustomMinutes("");
    }
  }, [isOpen]);

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return "Not set";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const handleTimerAdjust = async (adjustment) => {
    const newSeconds = Math.max(0, (currentSeconds || 0) + adjustment);
    await onTimerUpdate(newSeconds);
  };

  const handleCustomTimeSet = async () => {
    const hours = parseInt(customHours) || 0;
    const minutes = parseInt(customMinutes) || 0;
    const newSeconds = hours * 3600 + minutes * 60;
    
    if (newSeconds >= 0) {
      await onTimerUpdate(newSeconds);
      setCustomHours("");
      setCustomMinutes("");
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
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-[var(--surface-1)]/95 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
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
                className="rounded-xl p-2 transition-colors hover:bg-white/10"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-6 space-y-6">
              {/* Onboarding tooltip for first-time users */}
              <OnboardingTooltip
                id="settings-modal-intro"
                content="This is where you can manage your study time. Use the quick buttons to add or subtract time, or set a custom duration. Your progress is automatically saved!"
                position="bottom"
                pointerPosition="center"
                delay={300}
                priority={9}
                showCondition={isOpen}
              >
                <div />
              </OnboardingTooltip>

              {/* Timer Controls Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                    Timer Controls
                    <InfoTooltip content="Adjust your remaining study time. Use quick buttons for common adjustments or set a custom time below." position="right" />
                  </h3>
                </div>

                {/* Current Timer Display */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--muted-foreground)]">Current time remaining:</span>
                    <span className="text-lg font-bold text-[var(--foreground)]">{formatTime(currentSeconds)}</span>
                  </div>
                </div>

                {/* Quick Adjust Buttons */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-[var(--muted-foreground)] flex items-center gap-1.5">
                    Quick Adjust
                    <InfoTooltip content="Click to instantly add or subtract time from your study session." position="right" />
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <button
                      type="button"
                      onClick={() => handleTimerAdjust(-60 * 60)}
                      className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium transition-all hover:bg-white/10 hover:border-[var(--primary)]/50"
                    >
                      <span className="block text-lg">−1h</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTimerAdjust(-15 * 60)}
                      className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium transition-all hover:bg-white/10 hover:border-[var(--primary)]/50"
                    >
                      <span className="block text-lg">−15m</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTimerAdjust(15 * 60)}
                      className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium transition-all hover:bg-white/10 hover:border-[var(--primary)]/50"
                    >
                      <span className="block text-lg">+15m</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTimerAdjust(60 * 60)}
                      className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium transition-all hover:bg-white/10 hover:border-[var(--primary)]/50"
                    >
                      <span className="block text-lg">+1h</span>
                    </button>
                  </div>
                </div>

                {/* Custom Time Input */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-[var(--muted-foreground)] flex items-center gap-1.5">
                    Set Custom Time
                    <InfoTooltip content="Enter a specific amount of time to set as your remaining study time. This replaces the current timer value." position="right" />
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="number"
                        min="0"
                        placeholder="Hours"
                        value={customHours}
                        onChange={(e) => setCustomHours(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        placeholder="Minutes"
                        value={customMinutes}
                        onChange={(e) => setCustomMinutes(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCustomTimeSet}
                      disabled={!customHours && !customMinutes}
                      className="rounded-lg bg-[var(--primary)] px-6 py-3 text-sm font-medium text-[var(--primary-contrast)] transition-all hover:bg-[var(--primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Set
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
