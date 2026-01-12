"use client";

import React, { useEffect, useRef } from "react";
import { authFetch } from "@/lib/api";

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

/**
 * VideoBlock component
 * 
 * @param {string} url - Video URL (YouTube, Vimeo, or direct)
 * @param {string} title - Video title
 * @param {string} description - Video description
 * @param {string} className - Additional CSS classes
 * @param {string} courseId - Course ID for tracking
 * @param {string} lessonId - Lesson/node ID for tracking
 * @param {string} userId - User ID for tracking
 * @param {boolean} videoCompleted - Whether video is already completed (from backend)
 * @param {Function} onVideoViewed - Callback when video is viewed/completed
 */
export default function VideoBlock({ 
  url, 
  title, 
  description, 
  className = "",
  courseId,
  lessonId,
  userId,
  videoCompleted: initialVideoCompleted = false,
  onVideoViewed,
  isPreview = false
}) {
  const normalized = normalizeUrl(url);
  const hasMarkedCompleted = useRef(false);
  const refreshTimeoutRef = useRef(null);

  // Mark video as completed when component mounts (video page is viewed)
  useEffect(() => {
    if (isPreview) {
      if (normalized.type === "none") return;
      if (hasMarkedCompleted.current) return;
      hasMarkedCompleted.current = true;
      let didNotify = false;
      const notifyViewed = () => {
        if (didNotify) return;
        didNotify = true;
        if (onVideoViewed) {
          onVideoViewed();
        }
      };

      if (courseId && lessonId && userId) {
        (async () => {
          try {
            const response = await fetch(`/api/onboarding/preview/nodes/${lessonId}/video`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                courseId,
                anonUserId: userId,
                completed: true
              }),
            });

            if (response.ok) {
              notifyViewed();
            }
          } catch (error) {
            console.error('Failed to mark preview video as completed:', error);
          }
        })();
      }

      if (onVideoViewed) {
        refreshTimeoutRef.current = setTimeout(() => {
          notifyViewed();
        }, 1000);
      }
      return () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
          refreshTimeoutRef.current = null;
        }
      };
    }

    // Skip if already marked completed or if already completed from backend
    if (hasMarkedCompleted.current || initialVideoCompleted) {
      if (initialVideoCompleted && onVideoViewed && !hasMarkedCompleted.current) {
        hasMarkedCompleted.current = true;
        // Still notify parent that video is completed
        onVideoViewed();
      }
      return;
    }
    
    // Only mark as completed if we have the necessary tracking info
    if (!courseId || !lessonId || !userId) return;
    if (normalized.type === "none") return;
    
    hasMarkedCompleted.current = true;
    
    // Mark video as completed via backend API
    (async () => {
      try {
        const response = await authFetch(`/api/courses/${courseId}/nodes/${lessonId}/video`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            completed: true
          }),
        });
        
        if (response.ok && onVideoViewed) {
          onVideoViewed();
        }
      } catch (error) {
        console.error('Failed to mark video as completed:', error);
      }
    })();
    
    if (onVideoViewed) {
      refreshTimeoutRef.current = setTimeout(() => {
        onVideoViewed();
      }, 3000);
    }
    
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [courseId, lessonId, userId, normalized.type, initialVideoCompleted, onVideoViewed, isPreview]);

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
