"use client";

import { useState } from "react";
import { InfoTooltip } from "@/components/ui/Tooltip";
import DurationInput from "@/components/ui/DurationInput";

export default function TimerControls({ 
  currentSeconds, 
  onTimerUpdate,
  isTimerPaused,
  onPauseToggle
}) {
  const [customDuration, setCustomDuration] = useState({ hours: 0, minutes: 0 });

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return "Not set";
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const h = Math.floor(safeSeconds / 3600);
    const m = Math.floor((safeSeconds % 3600) / 60);
    const s = safeSeconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const handleTimerAdjust = async (adjustment) => {
    const newSeconds = Math.max(0, (currentSeconds || 0) + adjustment);
    await onTimerUpdate(newSeconds);
  };

  const handleCustomTimeSet = async () => {
    const hours = customDuration.hours || 0;
    const minutes = customDuration.minutes || 0;
    const newSeconds = hours * 3600 + minutes * 60;
    
    if (newSeconds >= 0) {
      await onTimerUpdate(newSeconds);
      setCustomDuration({ hours: 0, minutes: 0 });
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Timer Display with Pause Button */}
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-[var(--muted-foreground)]">Current time remaining:</span>
            <span className="text-base sm:text-lg font-bold text-[var(--foreground)]">{formatTime(currentSeconds)}</span>
          </div>
        </div>
        {onPauseToggle && (
          <button
            type="button"
            onClick={onPauseToggle}
            className="flex items-center justify-center h-[50px] w-[50px] sm:h-[58px] sm:w-[58px] rounded-xl border border-[var(--border)] bg-[var(--surface-2)] transition-all hover:bg-[var(--surface-muted)] hover:border-[var(--primary)]/50"
            title={isTimerPaused ? "Resume Timer" : "Pause Timer"}
          >
            {isTimerPaused ? (
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--foreground)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--foreground)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            )}
          </button>
        )}
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
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm font-medium transition-all hover:bg-[var(--surface-muted)] hover:border-[var(--primary)]/50"
          >
            <span className="block text-lg">−1h</span>
          </button>
          <button
            type="button"
            onClick={() => handleTimerAdjust(-15 * 60)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm font-medium transition-all hover:bg-[var(--surface-muted)] hover:border-[var(--primary)]/50"
          >
            <span className="block text-lg">−15m</span>
          </button>
          <button
            type="button"
            onClick={() => handleTimerAdjust(15 * 60)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm font-medium transition-all hover:bg-[var(--surface-muted)] hover:border-[var(--primary)]/50"
          >
            <span className="block text-lg">+15m</span>
          </button>
          <button
            type="button"
            onClick={() => handleTimerAdjust(60 * 60)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm font-medium transition-all hover:bg-[var(--surface-muted)] hover:border-[var(--primary)]/50"
          >
            <span className="block text-lg">+1h</span>
          </button>
        </div>
      </div>

      {/* Custom Time Input */}
      <div>
        <label className="block text-sm font-semibold mb-1.5 text-[var(--foreground)]">
          <span className="flex items-center gap-1.5">
            Set Custom Time
            <InfoTooltip
              content="Enter a specific amount of time to set as your remaining study time. This replaces the current timer value."
              position="right"
            />
          </span>
        </label>
        <DurationInput
          hours={customDuration.hours}
          minutes={customDuration.minutes}
          onChange={setCustomDuration}
          hourStep={1}
          minuteStep={5}
          variant="minimal"
          hideSummary
        />
        <div className="mt-4">
          <button
            type="button"
            onClick={handleCustomTimeSet}
            disabled={(customDuration.hours || 0) === 0 && (customDuration.minutes || 0) === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--primary)]/30 transition hover:bg-[var(--primary)]/90 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l2.5 2.5M12 22a10 10 0 100-20 10 10 0 000 20z" />
            </svg>
            Set Time
          </button>
        </div>
      </div>
    </div>
  );
}
