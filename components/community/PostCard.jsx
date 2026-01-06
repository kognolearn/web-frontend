"use client";

import { useState } from "react";
import { authFetch } from "@/lib/api";
import VoteButtons from "./VoteButtons";
import ReplyThread from "./ReplyThread";
import PostEditor from "./PostEditor";
import ReportPostModal from "./ReportPostModal";
import BlockedPostPlaceholder from "./BlockedPostPlaceholder";

export default function PostCard({
  post,
  studyGroupId,
  currentUserId,
  onDeleted,
  onVoteUpdate,
  onRefresh,
  isReply = false,
  depth = 0,
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyEditor, setShowReplyEditor] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBlocked, setIsBlocked] = useState(post.isBlocked);
  const [showBlockedContent, setShowBlockedContent] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isAuthor = post.author?.id === currentUserId;
  const isDeleted = post.isDeleted;
  const hasReplies = post.replyCount > 0;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    setIsDeleting(true);
    try {
      const res = await authFetch(`/api/community/groups/${studyGroupId}/posts/${post.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete post");
      onDeleted?.();
    } catch (err) {
      console.error("Error deleting post:", err);
      alert("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReplyCreated = (newReply) => {
    setShowReplyEditor(false);
    setShowReplies(true);
    onRefresh?.();
  };

  if (isBlocked && !showBlockedContent) {
    return (
      <BlockedPostPlaceholder
        onShowContent={() => setShowBlockedContent(true)}
        depth={depth}
      />
    );
  }

  if (isDeleted) {
    return (
      <div className={`p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] ${depth > 0 ? 'ml-8 border-l-2 border-l-[var(--border)]' : ''}`}>
        <p className="text-sm text-[var(--muted-foreground)] italic">
          [This post has been deleted]
        </p>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] ${depth > 0 ? 'ml-8' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-sm font-semibold text-[var(--primary)]">
            {post.author?.displayName?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              {post.author?.displayName || "[Former Member]"}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {formatDate(post.createdAt)}
              {post.updatedAt && post.updatedAt !== post.createdAt && " (edited)"}
            </p>
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] shadow-lg z-20">
                {isAuthor && (
                  <button
                    onClick={() => { setShowMenu(false); handleDelete(); }}
                    disabled={isDeleting}
                    className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                )}
                {!isAuthor && (
                  <button
                    onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                    className="w-full text-left px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
                  >
                    Report
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mt-3">
        <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap break-words">
          {post.content}
        </p>

        {/* Images */}
        {post.imageUrls?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {post.imageUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="max-w-xs max-h-48 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(url, "_blank")}
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-4">
        <VoteButtons
          postId={post.id}
          studyGroupId={studyGroupId}
          score={post.score || 0}
          userVote={post.userVote}
          onVoteUpdate={onVoteUpdate}
        />

        <button
          onClick={() => setShowReplyEditor(!showReplyEditor)}
          className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          Reply
        </button>

        {hasReplies && (
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
          >
            <svg className={`w-4 h-4 transition-transform ${showReplies ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {post.replyCount} {post.replyCount === 1 ? "reply" : "replies"}
          </button>
        )}
      </div>

      {/* Reply editor */}
      {showReplyEditor && (
        <div className="mt-4 pl-4 border-l-2 border-[var(--border)]">
          <PostEditor
            studyGroupId={studyGroupId}
            parentPostId={post.id}
            onPostCreated={handleReplyCreated}
            onCancel={() => setShowReplyEditor(false)}
            isReply
          />
        </div>
      )}

      {/* Replies */}
      {showReplies && (
        <ReplyThread
          postId={post.id}
          studyGroupId={studyGroupId}
          currentUserId={currentUserId}
          onRefresh={onRefresh}
          depth={depth + 1}
        />
      )}

      {/* Report modal */}
      <ReportPostModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        postId={post.id}
        studyGroupId={studyGroupId}
      />
    </div>
  );
}
