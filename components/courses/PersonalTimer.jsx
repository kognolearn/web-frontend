"use client";

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";

const POMODORO_PRESETS = {
  classic: { work: 25 * 60, break: 5 * 60, longBreak: 15 * 60, sessionsBeforeLongBreak: 4, label: "25/5" },
  short: { work: 15 * 60, break: 3 * 60, longBreak: 10 * 60, sessionsBeforeLongBreak: 4, label: "15/3" },
  long: { work: 50 * 60, break: 10 * 60, longBreak: 30 * 60, sessionsBeforeLongBreak: 2, label: "50/10" },
};

// Controls component that uses timerRef to control the always-mounted timer
export function PersonalTimerControls({ timerRef, timerState }) {
  const state = timerState || timerRef?.current?.getState?.() || { seconds: 0, isRunning: false, mode: "custom", pomodoroPhase: "work", completedSessions: 0, pomodoroPreset: "classic", customInput: { hours: 0, minutes: 25 } };
  
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getPhaseLabel = () => {
    if (state.mode === "custom") return "Focus";
    switch (state.pomodoroPhase) {
      case "work": return "Focus";
      case "break": return "Break";
      case "longBreak": return "Long Break";
      default: return "";
    }
  };

  const getPhaseOpacity = () => {
    if (state.mode === "custom") return "";
    if (state.pomodoroPhase === "work") return "";
    return "opacity-80";
  };

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--surface-2)]">
        <button
          onClick={() => timerRef.current?.setMode("custom")}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
            state.mode === "custom" 
              ? "bg-[var(--primary)] text-white shadow-sm" 
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          Custom
        </button>
        <button
          onClick={() => timerRef.current?.setMode("pomodoro")}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
            state.mode === "pomodoro" 
              ? "bg-[var(--primary)] text-white shadow-sm" 
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          Pomodoro
        </button>
      </div>

      {/* Timer Display */}
      <div 
        className={`relative rounded-xl border-2 border-[var(--primary)] bg-[var(--primary)]/10 p-4 text-center ${getPhaseOpacity()}`}
      >
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--primary)] mb-1">
          {getPhaseLabel()}
        </div>
        <div className="text-3xl font-bold tabular-nums text-[var(--foreground)]">
          {formatTime(state.seconds)}
        </div>
        {state.mode === "pomodoro" && (
          <div className="mt-2 flex items-center justify-center gap-1">
            {Array.from({ length: POMODORO_PRESETS[state.pomodoroPreset].sessionsBeforeLongBreak }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i < (state.completedSessions % POMODORO_PRESETS[state.pomodoroPreset].sessionsBeforeLongBreak)
                    ? "bg-[var(--primary)]"
                    : "bg-[var(--border)]"
                }`}
              />
            ))}
            <span className="ml-1.5 text-[10px] text-[var(--muted-foreground)]">
              {state.completedSessions} done
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      {state.seconds > 0 || state.isRunning ? (
        <div className="flex gap-1.5">
          <button
            onClick={() => timerRef.current?.togglePause()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[var(--primary)] text-white font-medium text-sm transition-colors hover:bg-[var(--primary)]/90"
          >
            {state.isRunning ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
                Pause
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Resume
              </>
            )}
          </button>
          <button
            onClick={() => timerRef.current?.reset()}
            className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
            title="Reset"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {state.mode === "pomodoro" && (
            <button
              onClick={() => timerRef.current?.skipPhase()}
              className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
              title="Skip to next phase"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Setup UI */}
          {state.mode === "custom" ? (
            <CustomTimerSetup timerRef={timerRef} customInput={state.customInput} />
          ) : (
            <PomodoroSetup timerRef={timerRef} pomodoroPreset={state.pomodoroPreset} />
          )}
        </>
      )}
    </div>
  );
}

function CustomTimerSetup({ timerRef, customInput }) {
  const [hours, setHours] = useState(customInput.hours);
  const [minutes, setMinutes] = useState(customInput.minutes);

  useEffect(() => {
    timerRef.current?.setCustomInput({ hours, minutes });
  }, [hours, minutes, timerRef]);

  return (
    <div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-[10px] text-[var(--muted-foreground)] mb-0.5">Hours</label>
          <input
            type="number"
            min="0"
            max="23"
            value={hours}
            onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-center text-sm font-semibold"
          />
        </div>
        <div className="flex-1">
          <label className="block text-[10px] text-[var(--muted-foreground)] mb-0.5">Minutes</label>
          <input
            type="number"
            min="0"
            max="59"
            value={minutes}
            onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
            className="w-full px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-center text-sm font-semibold"
          />
        </div>
      </div>
      <div className="mt-4">
        <button
          onClick={() => timerRef.current?.startCustomTimer()}
          disabled={hours === 0 && minutes === 0}
          className="w-full py-2 rounded-xl bg-[var(--primary)] text-white font-medium text-sm hover:bg-[var(--primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Start Timer
        </button>
      </div>
    </div>
  );
}

function PomodoroSetup({ timerRef, pomodoroPreset }) {
  const [preset, setPreset] = useState(pomodoroPreset);

  useEffect(() => {
    timerRef.current?.setPomodoroPreset(preset);
  }, [preset, timerRef]);

  return (
    <div>
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-1.5">
          {Object.entries(POMODORO_PRESETS).map(([key, presetData]) => (
            <button
              key={key}
              onClick={() => setPreset(key)}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                preset === key
                  ? "bg-[var(--primary)] text-white"
                  : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
              }`}
            >
              {presetData.label}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-[var(--muted-foreground)] text-center">
          {POMODORO_PRESETS[preset].work / 60}m focus, {POMODORO_PRESETS[preset].break / 60}m break
        </div>
      </div>
      <div className="mt-4">
        <button
          onClick={() => timerRef.current?.startPomodoro()}
          className="w-full py-2 rounded-xl bg-[var(--primary)] text-white font-medium text-sm hover:bg-[var(--primary)]/90 transition-colors inline-flex items-center justify-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Start Pomodoro
        </button>
      </div>
    </div>
  );
}

// Compact display component for the timer (always visible)
export function FocusTimerDisplay({ seconds, isRunning, phase, isCompleted, onTogglePause, onClick, onDismissComplete }) {
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return { minutes: String(m).padStart(2, '0'), seconds: String(s).padStart(2, '0') };
  };

  const time = formatTime(seconds);
  const hasTimer = seconds > 0 || isRunning;

  // Show completion celebration
  if (isCompleted) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={onDismissComplete}
          className="flex items-center gap-2 rounded-xl border-2 border-[var(--primary)] bg-[var(--primary)]/20 px-3 py-1.5 shadow-md backdrop-blur-xl transition-all hover:bg-[var(--primary)]/30 animate-pulse"
        >
          <svg className="w-4 h-4 text-[var(--primary)]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          <span className="text-sm font-semibold text-[var(--primary)]">Complete</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Pause/Play Button for Focus Timer */}
      {hasTimer && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onTogglePause?.(); }}
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/90 shadow-md backdrop-blur-xl transition-all hover:bg-[var(--surface-2)] hover:border-[var(--primary)]/50"
          title={isRunning ? "Pause Focus Timer" : "Resume Focus Timer"}
        >
          {isRunning ? (
            <svg className="w-4 h-4 text-[var(--foreground)]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-[var(--foreground)]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      )}

      {/* Timer Display (Clickable to open settings) */}
      <button
        onClick={onClick}
        className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/90 px-3 py-1.5 shadow-md backdrop-blur-xl transition-all hover:bg-[var(--surface-2)] hover:border-[var(--primary)]/50"
      >
        <svg className="w-3.5 h-3.5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex items-baseline gap-0.5">
          <span className="text-sm font-bold tabular-nums text-[var(--foreground)]">{time.minutes}</span>
          <span className="text-[9px] text-[var(--muted-foreground)]">:</span>
          <span className="text-sm font-bold tabular-nums text-[var(--foreground)]">{time.seconds}</span>
          {phase && phase !== "work" && (
            <span className="ml-1 text-[9px] text-[var(--primary)] font-medium uppercase">{phase === "longBreak" ? "Long" : "Break"}</span>
          )}
        </div>
      </button>
    </div>
  );
}

// Main PersonalTimer component with full controls
const PersonalTimer = forwardRef(function PersonalTimer({ onStateChange }, ref) {
  const [mode, setMode] = useState("custom"); // "custom" | "pomodoro"
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Custom timer state
  const [customInput, setCustomInput] = useState({ hours: 0, minutes: 25 });
  
  // Pomodoro state
  const [pomodoroPreset, setPomodoroPreset] = useState("classic");
  const [pomodoroPhase, setPomodoroPhase] = useState("work"); // "work" | "break" | "longBreak"
  const [completedSessions, setCompletedSessions] = useState(0);
  
  const audioRef = useRef(null);

  // Expose state and controls via ref
  useImperativeHandle(ref, () => ({
    getState: () => ({ seconds, isRunning, mode, pomodoroPhase, completedSessions, pomodoroPreset, customInput, isCompleted }),
    togglePause: () => setIsRunning(prev => !prev),
    reset: resetTimer,
    dismissComplete: () => setIsCompleted(false),
    setMode: (newMode) => { setMode(newMode); resetTimer(); },
    setCustomInput: (input) => setCustomInput(input),
    setPomodoroPreset: (preset) => setPomodoroPreset(preset),
    startCustomTimer: () => {
      setIsCompleted(false);
      const totalSeconds = (customInput.hours * 3600) + (customInput.minutes * 60);
      if (totalSeconds > 0) {
        setSeconds(totalSeconds);
        setIsRunning(true);
      }
    },
    startPomodoro: () => {
      setIsCompleted(false);
      const preset = POMODORO_PRESETS[pomodoroPreset];
      setPomodoroPhase("work");
      setCompletedSessions(0);
      setSeconds(preset.work);
      setIsRunning(true);
    },
    skipPhase: () => {
      if (mode !== "pomodoro") return;
      const preset = POMODORO_PRESETS[pomodoroPreset];
      if (pomodoroPhase === "work") {
        const newCompleted = completedSessions + 1;
        setCompletedSessions(newCompleted);
        if (newCompleted % preset.sessionsBeforeLongBreak === 0) {
          setPomodoroPhase("longBreak");
          setSeconds(preset.longBreak);
        } else {
          setPomodoroPhase("break");
          setSeconds(preset.break);
        }
      } else {
        setPomodoroPhase("work");
        setSeconds(preset.work);
      }
      setIsRunning(false);
    },
  }), [seconds, isRunning, mode, pomodoroPhase, completedSessions, pomodoroPreset, customInput, isCompleted]);

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.({ seconds, isRunning, phase: mode === "pomodoro" ? pomodoroPhase : null, mode, pomodoroPreset, customInput, completedSessions, isCompleted });
  }, [seconds, isRunning, mode, pomodoroPhase, pomodoroPreset, customInput, completedSessions, isCompleted, onStateChange]);

  // Play notification sound
  const playNotification = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  // Timer countdown effect
  useEffect(() => {
    if (!isRunning || seconds <= 0) return;

    const intervalId = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          setIsRunning(false);
          playNotification();
          
          // Auto-advance pomodoro phases
          if (mode === "pomodoro") {
            const preset = POMODORO_PRESETS[pomodoroPreset];
            if (pomodoroPhase === "work") {
              const newCompleted = completedSessions + 1;
              setCompletedSessions(newCompleted);
              if (newCompleted % preset.sessionsBeforeLongBreak === 0) {
                setPomodoroPhase("longBreak");
                return preset.longBreak;
              } else {
                setPomodoroPhase("break");
                return preset.break;
              }
            } else {
              setPomodoroPhase("work");
              return preset.work;
            }
          } else {
            // Custom timer completed - show completion state
            setIsCompleted(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isRunning, seconds, mode, pomodoroPreset, pomodoroPhase, completedSessions, playNotification]);

  const resetTimer = () => {
    setIsRunning(false);
    setSeconds(0);
    setIsCompleted(false);
    if (mode === "pomodoro") {
      setPomodoroPhase("work");
      setCompletedSessions(0);
    }
  };

  return (
    <>
      {/* Hidden audio element for notifications */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleUkjVrHV6M6DUhkVeNb/6aqNRgMAtPf/ubN4JwAA3P/cmHQ0AADl/6WOZDsAANz/tZVjNwAA5P+NfV4/AADa/4R2W0YAAN3/fnBPUAAA1P90cVdVAACw/3VwVVYAAKj/bGxZWAAAfv9xblZWAAB5/3VxVlgAAJb/bWxaVgAAlv9ra1taAACV/2lrXFoAAI7/aGxdWgAAkP9ma11aAACO/2ZsXloAAI//ZmxfWgAAkP9mbGBaAACR/2ZsYFoAAJL/ZmxgWgAAkv9mbGBaAACT/2ZsYFoAAJT/ZmxhWgAAlf9mbGFaAACW/2ZsYVoAAJf/ZmxhWgAAmP9mbGFaAACZ/2ZsYVoAAJn/ZmxhWgAAmv9mbGFaAACb/2ZsYVoAAJz/ZmxhWgAAnP9mbGFaAACd/2ZsYVoAAJ7/ZmxhWgAAn/9mbGFaAACg/2ZsYVoAAKH/ZmxhWgAAof9mbGFaAACi/2ZsYVoAAKP/ZmxhWgAApP9mbGFaAAA=" type="audio/wav" />
      </audio>
    </>
  );
});

export default PersonalTimer;
