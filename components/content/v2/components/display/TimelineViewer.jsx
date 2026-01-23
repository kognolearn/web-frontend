"use client";

import React, { useMemo, useState } from "react";
import { ZoomIn, ZoomOut, Calendar } from "lucide-react";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * TimelineViewer - Timeline of events
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {Array<{id: string, date: string, title: string, description?: string, image_url?: string}>} props.events
 * @param {'horizontal' | 'vertical'} [props.orientation='horizontal']
 * @param {boolean} [props.zoomable=true]
 */
export default function TimelineViewer({
  id,
  events = [],
  orientation = "horizontal",
  zoomable = true,
}) {
  const [zoom, setZoom] = useState(1);
  const isHorizontal = orientation !== "vertical";
  const safeEvents = useMemo(() => events.filter(Boolean), [events]);

  const handleZoomIn = () => setZoom((prev) => clamp(prev + 0.1, 0.6, 2));
  const handleZoomOut = () => setZoom((prev) => clamp(prev - 0.1, 0.6, 2));

  if (!safeEvents.length) {
    return (
      <div
        id={id}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-center"
      >
        <p className="text-sm text-[var(--muted-foreground)]">
          No timeline events provided
        </p>
      </div>
    );
  }

  return (
    <div id={id} className="v2-timeline-viewer space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <Calendar className="h-4 w-4" />
          <span>{safeEvents.length} events</span>
        </div>
        {zoomable && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleZoomOut}
              className="rounded-lg border border-[var(--border)] p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/40 transition-colors"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className="rounded-lg border border-[var(--border)] p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/40 transition-colors"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div
        className={`relative rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 ${
          isHorizontal ? "overflow-x-auto" : "overflow-y-auto"
        }`}
      >
        <div
          className={`relative flex ${isHorizontal ? "flex-row" : "flex-col"} ${
            isHorizontal ? "gap-6" : "gap-8"
          }`}
          style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
        >
          <div
            className={`absolute ${
              isHorizontal
                ? "left-4 right-4 top-5 h-px"
                : "left-6 top-2 bottom-2 w-px"
            } bg-[var(--border)]`}
          />
          {safeEvents.map((event) => (
            <div
              key={event.id}
              className={`relative ${
                isHorizontal ? "min-w-[240px] pt-4" : "pl-10"
              }`}
            >
              <div
                className={`absolute ${
                  isHorizontal
                    ? "left-2 top-2"
                    : "left-4 top-1"
                } h-3 w-3 rounded-full bg-[var(--primary)] shadow shadow-[var(--primary)]/30`}
              />
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-2">
                <div className="text-xs font-semibold text-[var(--muted-foreground)]">
                  {event.date}
                </div>
                <div className="text-sm font-semibold text-[var(--foreground)]">
                  {event.title}
                </div>
                {event.description && (
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                    {event.description}
                  </p>
                )}
                {event.image_url && (
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="mt-2 w-full max-h-40 rounded-lg object-cover"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
