import React from "react";

const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;
const VIMEO_REGEX = /vimeo\.com\/(?:video\/)?(\d+)/i;

function normalizeUrl(url) {
  if (!url) return { type: "none", src: "" };
  const trimmed = String(url).trim();
  if (!trimmed) return { type: "none", src: "" };

  const ytMatch = trimmed.match(YOUTUBE_REGEX);
  if (ytMatch?.[1]) {
    return {
      type: "iframe",
      src: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`,
      title: "YouTube video player",
    };
  }

  const vimeoMatch = trimmed.match(VIMEO_REGEX);
  if (vimeoMatch?.[1]) {
    return {
      type: "iframe",
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      title: "Vimeo video player",
    };
  }

  return {
    type: "video",
    src: trimmed,
    title: "Video player",
  };
}

export default function VideoBlock({ url, title, description, className = "" }) {
  const normalized = normalizeUrl(url);

  if (normalized.type === "none") {
    return (
      <div className="card rounded-2xl px-6 py-4 text-sm text-[var(--muted-foreground)]">
        No video URL provided.
      </div>
    );
  }

  const computedTitle = title || normalized.title || "Video player";

  return (
    <div className={`w-full ${className}`}>
      {/* Video title and description */}
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Video player */}
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-lg">
        {normalized.type === "iframe" ? (
          <iframe
            src={normalized.src}
            title={computedTitle}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <video
            src={normalized.src}
            title={computedTitle}
            className="h-full w-full"
            controls
            playsInline
            preload="metadata"
          >
            Your browser does not support the video tag.
          </video>
        )}
      </div>
    </div>
  );
}
