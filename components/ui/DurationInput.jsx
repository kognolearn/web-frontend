"use client";

import { useMemo, useEffect, useState } from "react";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatTotal(hours = 0, minutes = 0) {
  const segments = [];
  if (hours) segments.push(`${hours}h`);
  if (minutes) segments.push(`${minutes}m`);
  if (!segments.length) return "0m";
  return segments.join(" ");
}

export default function DurationInput({
  hours = 0,
  minutes = 0,
  onChange,
  maxHours = 999,
  hourStep = 1,
  minuteStep = 5,
  quickOptions = [],
  className = "",
  hoursLabel = "Hours",
  minutesLabel = "Minutes",
  hoursSuffix,
  minutesSuffix,
  summaryLabel = "Total duration",
  hideSummary = false,
  variant = "card",
}) {
  const totalSummary = useMemo(() => formatTotal(hours, minutes), [hours, minutes]);
  const [hourInput, setHourInput] = useState(String(hours ?? 0));
  const [minuteInput, setMinuteInput] = useState(String(minutes ?? 0));

  useEffect(() => {
    setHourInput((prev) => (prev === "" ? prev : String(hours ?? 0)));
  }, [hours]);

  useEffect(() => {
    setMinuteInput((prev) => (prev === "" ? prev : String(minutes ?? 0)));
  }, [minutes]);

  const emitChange = (nextHours, nextMinutes, { syncInputs = true } = {}) => {
    if (!onChange) return;
    const safeHours = clamp(nextHours, 0, maxHours);
    const safeMinutes = clamp(nextMinutes, 0, 59);
    if (syncInputs) {
      setHourInput(String(safeHours));
      setMinuteInput(String(safeMinutes));
    }
    onChange({ hours: safeHours, minutes: safeMinutes });
  };

  const adjustHours = (delta) => {
    emitChange(hours + delta, minutes);
  };

  const adjustMinutes = (delta) => {
    let totalMinutes = hours * 60 + minutes + delta;
    totalMinutes = Math.max(0, Math.min(maxHours * 60 + 59, totalMinutes));
    const nextHours = Math.floor(totalMinutes / 60);
    const nextMinutes = totalMinutes % 60;
    emitChange(nextHours, nextMinutes);
  };

  const handleHourInput = (value) => {
    setHourInput(value);
    if (value === "") return;
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      emitChange(numeric, minutes, { syncInputs: false });
    }
  };

  const handleHourBlur = () => {
    if (hourInput === "") {
      emitChange(0, minutes);
      return;
    }
    const numeric = Number(hourInput);
    emitChange(Number.isNaN(numeric) ? hours : numeric, minutes);
  };

  const handleMinuteInput = (value) => {
    setMinuteInput(value);
    if (value === "") return;
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      const safeMinutes = clamp(numeric, 0, 59);
      emitChange(hours, safeMinutes, { syncInputs: false });
    }
  };

  const handleMinuteBlur = () => {
    if (minuteInput === "") {
      emitChange(hours, 0);
      return;
    }
    const numeric = Number(minuteInput);
    const safeMinutes = clamp(Number.isNaN(numeric) ? minutes : numeric, 0, 59);
    emitChange(hours, safeMinutes);
  };

  const applyQuickOption = (option) => {
    const totalMinutes = Math.max(0, Math.min(maxHours * 60 + 59, option.minutes));
    const nextHours = Math.floor(totalMinutes / 60);
    const nextMinutes = totalMinutes % 60;
    emitChange(nextHours, nextMinutes);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {!hideSummary && (
        <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
          <span>{summaryLabel}</span>
          <span className="font-semibold text-[var(--foreground)]">{totalSummary}</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Segment
          label={hoursLabel}
          value={hourInput}
          onInputChange={handleHourInput}
          variant={variant}
          onBlur={handleHourBlur}
          onStep={adjustHours}
          step={hourStep}
          suffix={hoursSuffix}
        />
        <Segment
          label={minutesLabel}
          value={minuteInput}
          onInputChange={handleMinuteInput}
          variant={variant}
          onBlur={handleMinuteBlur}
          onStep={adjustMinutes}
          step={minuteStep}
          max={59}
          suffix={minutesSuffix}
        />
      </div>

      {quickOptions.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-[var(--muted-foreground)]">Quick presets</p>
          <div className="flex flex-wrap gap-2">
            {quickOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => applyQuickOption(option)}
                className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--primary)]/70 hover:text-[var(--foreground)]"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Segment({ label, value, onInputChange, onBlur, onStep, step, max, suffix, variant }) {
  const wrapperClass =
    variant === "minimal"
      ? "p-0"
      : "rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4";
  const buttonClass =
    variant === "minimal"
      ? "flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-transparent text-lg font-semibold hover:border-[var(--primary)]/60"
      : "flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/40 text-lg font-semibold hover:border-[var(--primary)]/60";

  return (
    <div className={wrapperClass}>
      <div className={`flex items-center justify-between text-xs text-[var(--muted-foreground)] ${variant === "minimal" ? "mb-1" : ""}`}>
        <span className="font-medium text-[var(--foreground)]">{label}</span>
        {suffix && <span>{suffix}</span>}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onStep(-step)}
          className={buttonClass}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          −
        </button>
        <input
          type="number"
          value={value}
          min={0}
          max={max}
          onChange={(e) => onInputChange(e.target.value)}
          onBlur={onBlur}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-center text-lg font-semibold text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
        />
        <button
          type="button"
          onClick={() => onStep(step)}
          className={buttonClass}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
