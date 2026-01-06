"use client";

import { useState } from "react";

export default function PinnedPostsBanner({ posts, studyGroupId, currentUserId }) {
  const [expanded, setExpanded] = useState(false);

  if (!posts || posts.length === 0) return null;

  const displayPosts = expanded ? posts : posts.slice(0, 2);

  return (
    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2zm-3 2H9.4l1.6-1.6V4h2v8.4l1.6 1.6H13z" />
        </svg>
        <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
          Pinned Posts ({posts.length})
        </h3>
      </div>

      <div className="space-y-2">
        {displayPosts.map((pin) => (
          <div
            key={pin.id}
            className="p-3 rounded-lg bg-[var(--surface-1)] border border-[var(--border)]"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-xs font-semibold text-[var(--primary)] shrink-0">
                {pin.post?.author?.displayName?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {pin.post?.author?.displayName || "[Former Member]"}
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    pinned by {pin.pinnedBy?.displayName || "Unknown"}
                  </span>
                </div>
                <p className="text-sm text-[var(--foreground)] line-clamp-2">
                  {pin.post?.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {posts.length > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-sm text-amber-700 dark:text-amber-400 hover:underline"
        >
          {expanded ? "Show less" : `Show ${posts.length - 2} more`}
        </button>
      )}
    </div>
  );
}
