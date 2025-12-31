"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from "lucide-react";

/**
 * AudioPlayer - HTML5 audio player with optional transcript and playback controls
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {string} props.audio_url - Audio file URL
 * @param {string} [props.transcript] - Optional transcript text
 * @param {boolean} [props.waveform] - Show waveform visualization (placeholder)
 * @param {boolean} [props.playback_rate_control] - Show playback rate control
 */
export default function AudioPlayer({
  id,
  audio_url,
  transcript,
  waveform = false,
  playback_rate_control = true,
}) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * duration;
  };

  const skip = (seconds) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
  };

  const changePlaybackRate = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!audio_url) {
    return (
      <div
        id={id}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-center"
      >
        <p className="text-sm text-[var(--muted-foreground)]">
          No audio URL provided
        </p>
      </div>
    );
  }

  return (
    <div id={id} className="v2-audio-player space-y-3">
      <audio ref={audioRef} src={audio_url} preload="metadata" />

      {/* Player Controls */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
        <div className="flex items-center gap-4">
          {/* Skip Back */}
          <button
            onClick={() => skip(-10)}
            className="p-2 rounded-lg hover:bg-[var(--surface-1)] transition-colors"
            title="Skip back 10s"
          >
            <SkipBack className="w-4 h-4 text-[var(--muted-foreground)]" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="p-3 rounded-full bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          {/* Skip Forward */}
          <button
            onClick={() => skip(10)}
            className="p-2 rounded-lg hover:bg-[var(--surface-1)] transition-colors"
            title="Skip forward 10s"
          >
            <SkipForward className="w-4 h-4 text-[var(--muted-foreground)]" />
          </button>

          {/* Progress Bar */}
          <div className="flex-1 flex items-center gap-3">
            <span className="text-xs text-[var(--muted-foreground)] font-mono w-10">
              {formatTime(currentTime)}
            </span>
            <div
              className="flex-1 h-2 bg-[var(--surface-1)] rounded-full cursor-pointer relative"
              onClick={handleSeek}
            >
              <div
                className="h-full bg-[var(--primary)] rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
              {waveform && (
                <div className="absolute inset-0 opacity-20">
                  {/* Placeholder waveform visualization */}
                </div>
              )}
            </div>
            <span className="text-xs text-[var(--muted-foreground)] font-mono w-10">
              {formatTime(duration)}
            </span>
          </div>

          {/* Playback Rate */}
          {playback_rate_control && (
            <button
              onClick={changePlaybackRate}
              className="px-2 py-1 text-xs font-medium rounded-lg border border-[var(--border)] hover:bg-[var(--surface-1)] transition-colors"
            >
              {playbackRate}x
            </button>
          )}

          {/* Mute */}
          <button
            onClick={toggleMute}
            className="p-2 rounded-lg hover:bg-[var(--surface-1)] transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-[var(--muted-foreground)]" />
            ) : (
              <Volume2 className="w-4 h-4 text-[var(--muted-foreground)]" />
            )}
          </button>
        </div>
      </div>

      {/* Transcript */}
      {transcript && (
        <div>
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="text-sm text-[var(--primary)] hover:underline"
          >
            {showTranscript ? "Hide Transcript" : "Show Transcript"}
          </button>
          {showTranscript && (
            <div className="mt-2 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] max-h-48 overflow-y-auto">
              <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">
                {transcript}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
