"use client";

import { useDroppable } from "@dnd-kit/core";

export default function DropZoneIndicator({ id, isActive = false }) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  // Only show when positioning is active
  if (!isActive) return null;

  // Invisible drop zone that expands when hovered
  return (
    <div
      ref={setNodeRef}
      className={`transition-all duration-200 ${
        isOver
          ? "h-16 my-2 mx-2 rounded-xl bg-[var(--primary)]/20 border-2 border-dashed border-[var(--primary)] flex items-center justify-center"
          : "h-2 my-0.5"
      }`}
    >
      {isOver && (
        <span className="text-xs font-medium text-[var(--primary)]">
          Drop here
        </span>
      )}
    </div>
  );
}
