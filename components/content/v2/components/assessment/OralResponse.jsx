"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Play, Pause, Trash2, RotateCcw } from "lucide-react";

/**
 * OralResponse - Voice recording submission
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {*} [props.value] - Current audio blob/URL
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {number} props.max_duration - Maximum recording duration in seconds
 * @param {string[]} [props.expected_keywords] - Keywords hint for display
 */
export default function OralResponse({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  max_duration = 120,
  expected_keywords = [],
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(value || null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const streamRef = useRef(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioUrl && audioUrl.startsWith("blob:")) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        onChange?.(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= max_duration - 1) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError("Could not access microphone. Please check permissions.");
    }
  }, [max_duration, onChange]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const deleteRecording = () => {
    if (audioUrl && audioUrl.startsWith("blob:")) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setRecordingTime(0);
    onChange?.(null);
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  // Determine border
  let borderClass = "border-[var(--border)]";
  if (isGraded && grade) {
    if (grade.passed) {
      borderClass = "border-emerald-500";
    } else {
      borderClass = "border-rose-500";
    }
  }

  return (
    <div id={id} className="v2-oral-response space-y-3">
      {/* Keywords hint */}
      {expected_keywords.length > 0 && !isGraded && (
        <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
          <p className="text-xs text-[var(--muted-foreground)] mb-2">
            Try to include these concepts in your response:
          </p>
          <div className="flex flex-wrap gap-1">
            {expected_keywords.map((keyword, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs rounded-lg bg-[var(--surface-1)] text-[var(--foreground)]"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recording interface */}
      <div className={`rounded-xl border ${borderClass} bg-[var(--surface-2)] p-4`}>
        {error && (
          <div className="mb-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm">
            {error}
          </div>
        )}

        {isRecording ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-sm font-medium text-[var(--foreground)]">
                Recording...
              </span>
            </div>
            <span className="font-mono text-lg text-[var(--foreground)]">
              {formatTime(recordingTime)} / {formatTime(max_duration)}
            </span>
            <button
              onClick={stopRecording}
              className="ml-auto p-3 rounded-full bg-rose-500 text-white hover:bg-rose-600 transition-colors"
            >
              <Square className="w-5 h-5" />
            </button>
          </div>
        ) : audioUrl ? (
          <div className="flex items-center gap-4">
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={handleAudioEnded}
              className="hidden"
            />
            <button
              onClick={togglePlayback}
              disabled={disabled || isGraded}
              className="p-3 rounded-full bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--foreground)]">
                Recording saved
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Duration: {formatTime(recordingTime)}
              </p>
            </div>
            {!disabled && !isGraded && (
              <div className="flex gap-2">
                <button
                  onClick={startRecording}
                  className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg
                    border border-[var(--border)] bg-[var(--surface-1)]
                    hover:bg-[var(--surface-2)] transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Re-record
                </button>
                <button
                  onClick={deleteRecording}
                  className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg
                    border border-rose-500/30 bg-rose-500/10 text-rose-600
                    hover:bg-rose-500/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            <button
              onClick={startRecording}
              disabled={disabled || isGraded}
              className="p-4 rounded-full bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Mic className="w-6 h-6" />
            </button>
            <p className="text-sm text-[var(--muted-foreground)]">
              Click to start recording (max {formatTime(max_duration)})
            </p>
          </div>
        )}
      </div>

      {/* Transcript / AI feedback */}
      {isGraded && grade?.transcript && (
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
          <h4 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
            Transcript
          </h4>
          <p className="text-sm text-[var(--foreground)]">{grade.transcript}</p>
        </div>
      )}

      {/* Keywords found */}
      {isGraded && grade?.keywordsFound && expected_keywords.length > 0 && (
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
          <h4 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
            Keywords Mentioned
          </h4>
          <div className="flex flex-wrap gap-1">
            {expected_keywords.map((keyword, index) => {
              const found = grade.keywordsFound.includes(keyword.toLowerCase());
              return (
                <span
                  key={index}
                  className={`px-2 py-1 text-xs rounded-lg ${
                    found
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      : "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                  }`}
                >
                  {keyword}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Grade feedback */}
      {isGraded && grade?.feedback && (
        <p className={`text-sm ${
          grade.passed
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400"
        }`}>
          {grade.feedback}
        </p>
      )}
    </div>
  );
}
