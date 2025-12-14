"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DurationInput from "@/components/ui/DurationInput";

export default function TimerExpiredModal({ isOpen, onClose, onAddTime, variant = "expired" }) {
  const [duration, setDuration] = useState({ hours: 0, minutes: 30 });

  const handleAddTime = () => {
    const totalSeconds = (duration.hours || 0) * 3600 + (duration.minutes || 0) * 60;
    if (totalSeconds > 0) {
      onAddTime(totalSeconds);
      setDuration({ hours: 0, minutes: 30 });
      onClose();
    }
  };

  const handleQuickAdd = (minutes) => {
    const totalSeconds = minutes * 60;
    onAddTime(totalSeconds);
    setDuration({ hours: 0, minutes: 30 });
    onClose();
  };

  if (!isOpen) return null;

  // Content varies based on variant
  const isHiddenContent = variant === "hidden-content";
  const title = isHiddenContent ? "Content Hidden" : "Time's Up!";
  const description = isHiddenContent 
    ? "Some content has been hidden so you are able to finish within the remaining time. Add more time if you'd like to access the hidden content again."
    : "Your study session timer has reached zero. Would you like to continue studying?";
  const closeButtonText = isHiddenContent ? "Continue" : "I'm Done";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-md mx-4 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)] shadow-2xl overflow-hidden"
          >
            {/* Header with icon */}
            <div className="flex flex-col items-center pt-8 pb-4 px-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                isHiddenContent ? "bg-amber-500/10" : "bg-[var(--primary)]/10"
              }`}>
                {isHiddenContent ? (
                  <svg
                    className="w-8 h-8 text-amber-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg
                    className="w-8 h-8 text-[var(--primary)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </div>
              <h2 className="text-xl font-bold text-[var(--foreground)] text-center">
                {title}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted-foreground)] text-center">
                {description}
              </p>
            </div>

            {/* Content */}
            <div className="px-6 pb-6 space-y-4">
              {/* Quick Add Buttons */}
              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                  Quick Add
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(15)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm font-medium transition-all hover:bg-[var(--surface-muted)] hover:border-[var(--primary)]/50"
                  >
                    +15m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(30)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm font-medium transition-all hover:bg-[var(--surface-muted)] hover:border-[var(--primary)]/50"
                  >
                    +30m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(60)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm font-medium transition-all hover:bg-[var(--surface-muted)] hover:border-[var(--primary)]/50"
                  >
                    +1h
                  </button>
                </div>
              </div>

              {/* Custom Duration Input */}
              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                  Or set custom time
                </label>
                <DurationInput
                  hours={duration.hours}
                  minutes={duration.minutes}
                  onChange={setDuration}
                  hourStep={1}
                  minuteStep={5}
                  variant="minimal"
                  hideSummary
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm font-medium text-[var(--foreground)] transition-all hover:bg-[var(--surface-muted)]"
                >
                  {closeButtonText}
                </button>
                <button
                  type="button"
                  onClick={handleAddTime}
                  disabled={(duration.hours || 0) === 0 && (duration.minutes || 0) === 0}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--primary)]/30 transition hover:bg-[var(--primary)]/90 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22a10 10 0 100-20 10 10 0 000 20z" />
                  </svg>
                  Add Time
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
