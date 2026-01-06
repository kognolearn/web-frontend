"use client";

import { useState } from "react";
import { authFetch } from "@/lib/api";

export default function VoteButtons({
  postId,
  studyGroupId,
  score = 0,
  userVote = 0,
  onVoteUpdate,
}) {
  const [currentScore, setCurrentScore] = useState(score);
  const [currentUserVote, setCurrentUserVote] = useState(userVote);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (voteType) => {
    if (isVoting) return;

    // Determine new vote: if clicking same vote, remove it; otherwise set new vote
    const newVote = currentUserVote === voteType ? 0 : voteType;

    // Calculate optimistic score change
    let scoreDelta = 0;
    if (currentUserVote === 1) scoreDelta -= 1; // Remove previous upvote
    if (currentUserVote === -1) scoreDelta += 1; // Remove previous downvote
    if (newVote === 1) scoreDelta += 1; // Add new upvote
    if (newVote === -1) scoreDelta -= 1; // Add new downvote

    const newScore = currentScore + scoreDelta;

    // Optimistic update
    setCurrentScore(newScore);
    setCurrentUserVote(newVote);
    onVoteUpdate?.(postId, newScore, newVote);

    setIsVoting(true);
    try {
      // Use DELETE to remove vote, POST to add/change vote
      const res = newVote === 0
        ? await authFetch(`/api/community/groups/${studyGroupId}/posts/${postId}/vote`, {
            method: "DELETE",
          })
        : await authFetch(`/api/community/groups/${studyGroupId}/posts/${postId}/vote`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voteType: newVote }),
          });

      if (!res.ok) {
        // Revert on error
        setCurrentScore(currentScore);
        setCurrentUserVote(currentUserVote);
        onVoteUpdate?.(postId, currentScore, currentUserVote);
        throw new Error("Failed to vote");
      }
    } catch (err) {
      console.error("Error voting:", err);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleVote(1)}
        disabled={isVoting}
        className={`p-1.5 rounded-lg transition-colors ${
          currentUserVote === 1
            ? 'text-green-500 bg-green-500/10'
            : 'text-[var(--muted-foreground)] hover:text-green-500 hover:bg-green-500/10'
        }`}
        title="Upvote"
      >
        <svg className="w-4 h-4" fill={currentUserVote === 1 ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      <span className={`text-sm font-medium min-w-[2ch] text-center ${
        currentScore > 0 ? 'text-green-500' :
        currentScore < 0 ? 'text-red-500' :
        'text-[var(--muted-foreground)]'
      }`}>
        {currentScore}
      </span>

      <button
        onClick={() => handleVote(-1)}
        disabled={isVoting}
        className={`p-1.5 rounded-lg transition-colors ${
          currentUserVote === -1
            ? 'text-red-500 bg-red-500/10'
            : 'text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10'
        }`}
        title="Downvote"
      >
        <svg className="w-4 h-4" fill={currentUserVote === -1 ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}
