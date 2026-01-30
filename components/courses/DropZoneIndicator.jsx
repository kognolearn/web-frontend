"use client";

import { useDroppable } from "@dnd-kit/core";

export default function DropZoneIndicator({ id, isActive = false }) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  // Only show when positioning is active
  if (!isActive) return null;

  // Drop zone with larger hitbox for reliable detection
  // The outer div provides the drop target area, inner div handles visual styling
  return (
    <div
      ref={setNodeRef}
      className="py-2 -my-1"
    >
      <div
        className={`transition-all duration-200 ${
          isOver
            ? "h-16 mx-2 rounded-xl bg-[var(--primary)]/20 border-2 border-dashed border-[var(--primary)] flex items-center justify-center"
            : "h-2"
        }`}
      >
        {isOver && (
          <span className="text-xs font-medium text-[var(--primary)]">
            Drop here
          </span>
        )}
      </div>
    </div>
  );
}
