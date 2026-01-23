"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * MusicNotation - Music notation display/input (ABC)
 *
 * @param {Object} props
 * @param {string} props.id
 * @param {'display' | 'input'} [props.mode='display']
 * @param {string} [props.abc_notation]
 * @param {string} [props.clef='treble']
 * @param {string} [props.time_signature='4/4']
 * @param {string} [props.key_signature='C']
 * @param {number} [props.num_measures=4]
 * @param {boolean} [props.playback=true]
 */
export default function MusicNotation({
  id,
  mode = "display",
  abc_notation = "",
  clef = "treble",
  time_signature = "4/4",
  key_signature = "C",
  num_measures = 4,
  playback = true,
  value,
  onChange,
}) {
  const [notation, setNotation] = useState(value || abc_notation);
  const [isPlaying, setIsPlaying] = useState(false);
  const renderRef = useRef(null);
  const synthRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (!renderRef.current) return () => {
      active = false;
    };
    const render = async () => {
      const abcjs = await import("abcjs");
      if (!active || !renderRef.current) return;
      renderRef.current.innerHTML = "";
      const header = `X:1\nM:${time_signature}\nL:1/4\nK:${key_signature}\n`;
      const clefHeader = clef ? `V:1 clef=${clef}\n` : "";
      const content = notation || "C D E F";
      abcjs.renderAbc(renderRef.current, `${header}${clefHeader}${content}`);
    };
    render();
    return () => {
      active = false;
    };
  }, [notation, clef, time_signature, key_signature]);

  const handleChange = (event) => {
    setNotation(event.target.value);
    onChange?.(event.target.value);
  };

  const handlePlay = async () => {
    if (isPlaying) return;
    try {
      setIsPlaying(true);
      const abcjs = await import("abcjs");
      const synth = new abcjs.synth.CreateSynth();
      synthRef.current = synth;
      const visualObj = abcjs.renderAbc(
        document.createElement("div"),
        `X:1\nM:${time_signature}\nL:1/4\nK:${key_signature}\n${notation || "C D E F"}`
      )[0];
      await synth.init({ visualObj });
      await synth.prime();
      await synth.start();
    } catch (err) {
      console.error("Playback failed:", err);
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <div id={id} className="v2-music-notation space-y-3">
      <div className="text-xs text-[var(--muted-foreground)]">
        {clef} clef · {time_signature} · key {key_signature} · {num_measures} measures
      </div>

      {mode === "input" && (
        <textarea
          value={notation}
          onChange={handleChange}
          rows={6}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
          placeholder="Enter ABC notation..."
        />
      )}

      <div
        ref={renderRef}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
      />

      {playback && (
        <button
          type="button"
          onClick={handlePlay}
          className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/50 transition-colors disabled:opacity-60"
          disabled={isPlaying}
        >
          {isPlaying ? "Playing..." : "Play"}
        </button>
      )}
    </div>
  );
}
