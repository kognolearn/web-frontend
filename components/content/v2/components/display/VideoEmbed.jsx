"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Clock } from "lucide-react";

const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;
const VIMEO_REGEX = /vimeo\.com\/(?:video\/)?(\d+)/i;

function parseVideoUrl(url) {
  if (!url) return { type: "none", src: "" };
  const trimmed = String(url).trim();
  if (!trimmed) return { type: "none", src: "" };

  const ytMatch = trimmed.match(YOUTUBE_REGEX);
  if (ytMatch?.[1]) {
    return {
      type: "youtube",
      videoId: ytMatch[1],
      src: `https://www.youtube.com/embed/${ytMatch[1]}`,
    };
  }

  const vimeoMatch = trimmed.match(VIMEO_REGEX);
  if (vimeoMatch?.[1]) {
    return {
      type: "vimeo",
      videoId: vimeoMatch[1],
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  return {
    type: "direct",
    src: trimmed,
  };
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * VideoEmbed - YouTube/Vimeo embed with chapter support
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {string} props.video_url - Video URL
 * @param {number} [props.start_time] - Start time in seconds
 * @param {number} [props.end_time] - End time in seconds
 * @param {Array<{time: number, label: string}>} [props.chapters] - Video chapters
 */
export default function VideoEmbed({
  id,
  video_url,
  start_time,
  end_time,
  chapters = [],
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const iframeRef = useRef(null);
  const parsed = parseVideoUrl(video_url);

  // Build embed URL with parameters
  const getEmbedUrl = () => {
    if (parsed.type === "youtube") {
      const params = new URLSearchParams({
        rel: "0",
        enablejsapi: "1",
      });
      if (start_time) params.set("start", String(Math.floor(start_time)));
      if (end_time) params.set("end", String(Math.floor(end_time)));
      return `${parsed.src}?${params.toString()}`;
    }
    if (parsed.type === "vimeo") {
      const params = new URLSearchParams();
      if (start_time) params.set("t", `${Math.floor(start_time)}s`);
      return `${parsed.src}?${params.toString()}`;
    }
    return parsed.src;
  };

  const handleChapterClick = (time) => {
    // For YouTube, we can try to use postMessage
    // For now, we'll reload the iframe with the new start time
    if (parsed.type === "youtube" && iframeRef.current) {
      const params = new URLSearchParams({
        rel: "0",
        enablejsapi: "1",
        start: String(Math.floor(time)),
        autoplay: "1",
      });
      if (end_time) params.set("end", String(Math.floor(end_time)));
      iframeRef.current.src = `${parsed.src}?${params.toString()}`;
    }
  };

  if (parsed.type === "none") {
    return (
      <div
        id={id}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-center"
      >
        <p className="text-sm text-[var(--muted-foreground)]">
          No video URL provided
        </p>
      </div>
    );
  }

  return (
    <div id={id} className="v2-video-embed space-y-3">
      {/* Video Player */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-lg">
        {parsed.type === "direct" ? (
          <video
            src={parsed.src}
            className="h-full w-full"
            controls
            playsInline
            preload="metadata"
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <>
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-2)]">
                <div className="flex flex-col items-center gap-2">
                  <Play className="w-12 h-12 text-[var(--muted-foreground)]" />
                  <span className="text-sm text-[var(--muted-foreground)]">
                    Loading video...
                  </span>
                </div>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={getEmbedUrl()}
              title="Video player"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onLoad={() => setIsLoaded(true)}
            />
          </>
        )}
      </div>

      {/* Chapters */}
      {chapters && chapters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mr-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Chapters:
          </span>
          {chapters.map((chapter, index) => (
            <button
              key={index}
              onClick={() => handleChapterClick(chapter.time)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg
                border border-[var(--border)] bg-[var(--surface-2)]
                hover:bg-[var(--surface-1)] hover:border-[var(--primary)]/40
                transition-colors cursor-pointer"
            >
              <span className="text-[var(--primary)] font-mono">
                {formatTime(chapter.time)}
              </span>
              <span className="text-[var(--foreground)]">{chapter.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
