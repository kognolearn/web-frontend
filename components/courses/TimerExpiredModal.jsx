"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DurationInput from "@/components/ui/DurationInput";

export default function TimerExpiredModal({ isOpen, onClose, onAddTime }) {
  const [duration, setDuration] = useState({ hours: 0, minutes: 30 });

  const handleAddTime = () => {
    const totalSeconds = (duration.hours || 0) * 3600 + (duration.minutes || 0) * 60;
    if (totalSeconds > 0) {
      onAddTime(totalSeconds);
      setDuration({ hours: 0, minutes: 30 });
    }
  };

  const handleQuickAdd = (minutes) => {
    const totalSeconds = minutes * 60;
    onAddTime(totalSeconds);
    setDuration({ hours: 0, minutes: 30 });
  };

  if (!isOpen) return null;

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
              <div className="w-16 h-16 rounded-full bg-[var(--primary)]/10 flex items-center justify-center mb-4">
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
              </div>
              <h2 className="text-xl font-bold text-[var(--foreground)] text-center">
                Time's Up!
              </h2>
              <p className="mt-2 text-sm text-[var(--muted-foreground)] text-center">
                Your study session timer has reached zero. Would you like to continue studying?
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
                  I'm Done
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
