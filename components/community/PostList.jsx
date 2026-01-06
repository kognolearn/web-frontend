"use client";

import PostCard from "./PostCard";

export default function PostList({
  posts,
  loading,
  studyGroupId,
  currentUserId,
  onPostDeleted,
  onVoteUpdate,
  onRefresh,
  onNominatePin,
  onPersonalPinToggle,
  activePinPostIds,
  groupPinnedPostIds,
  personalPinnedPostIds,
  highlightedPostId,
}) {
  if (loading && posts.length === 0) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--surface-2)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-[var(--surface-2)]" />
                <div className="h-3 w-24 rounded bg-[var(--surface-2)]" />
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-4 w-full rounded bg-[var(--surface-2)]" />
              <div className="h-4 w-3/4 rounded bg-[var(--surface-2)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          studyGroupId={studyGroupId}
          currentUserId={currentUserId}
          onDeleted={() => onPostDeleted(post.id)}
          onVoteUpdate={onVoteUpdate}
          onRefresh={onRefresh}
          onNominatePin={onNominatePin}
          onPersonalPinToggle={onPersonalPinToggle}
          isPinVoteActive={activePinPostIds?.has(post.id)}
          isGroupPinned={groupPinnedPostIds?.has(post.id)}
          isPersonalPinned={personalPinnedPostIds?.has(post.id)}
          activePinPostIds={activePinPostIds}
          groupPinnedPostIds={groupPinnedPostIds}
          personalPinnedPostIds={personalPinnedPostIds}
          highlighted={highlightedPostId === post.id}
        />
      ))}
    </div>
  );
}
