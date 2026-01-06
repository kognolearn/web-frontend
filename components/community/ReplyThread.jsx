"use client";

import { useState, useEffect } from "react";
import { authFetch } from "@/lib/api";
import PostCard from "./PostCard";

export default function ReplyThread({
  postId,
  studyGroupId,
  currentUserId,
  onRefresh,
  depth = 1,
}) {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const maxDepth = 3; // Limit nesting depth

  useEffect(() => {
    const fetchReplies = async () => {
      try {
        setLoading(true);
        const res = await authFetch(`/api/community/groups/${studyGroupId}/posts/${postId}`);
        if (!res.ok) throw new Error("Failed to fetch replies");
        const data = await res.json();
        setReplies(data.post?.replies || []);
      } catch (err) {
        console.error("Error fetching replies:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReplies();
  }, [postId, studyGroupId]);

  const handleReplyDeleted = (replyId) => {
    setReplies(prev => prev.filter(r => r.id !== replyId));
    onRefresh?.();
  };

  const handleVoteUpdate = (replyId, newScore, userVote) => {
    setReplies(prev => prev.map(r =>
      r.id === replyId ? { ...r, score: newScore, userVote } : r
    ));
  };

  if (loading) {
    return (
      <div className="mt-4 space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="ml-8 p-3 rounded-lg bg-[var(--surface-2)] animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[var(--surface-muted)]" />
              <div className="h-3 w-24 rounded bg-[var(--surface-muted)]" />
            </div>
            <div className="mt-2 h-3 w-full rounded bg-[var(--surface-muted)]" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 ml-8 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-500">
        Failed to load replies
      </div>
    );
  }

  if (replies.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      {replies.map((reply) => (
        <PostCard
          key={reply.id}
          post={reply}
          studyGroupId={studyGroupId}
          currentUserId={currentUserId}
          onDeleted={() => handleReplyDeleted(reply.id)}
          onVoteUpdate={handleVoteUpdate}
          onRefresh={onRefresh}
          isReply
          depth={depth < maxDepth ? depth : maxDepth}
        />
      ))}
    </div>
  );
}
