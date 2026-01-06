"use client";

import { useEffect, useState } from "react";
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
  onNominatePin,
  onPersonalPinToggle,
  isPinVoteActive = false,
  isGroupPinned = false,
  isPersonalPinned = false,
  activePinPostIds,
  groupPinnedPostIds,
  personalPinnedPostIds,
  isReply = false,
  depth = 0,
  highlighted = false,
}) {
  const [localPost, setLocalPost] = useState(post);
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyEditor, setShowReplyEditor] = useState(false);
  const [showEditEditor, setShowEditEditor] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBlocked, setIsBlocked] = useState(post.isBlocked);
  const [showBlockedContent, setShowBlockedContent] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    setLocalPost(post);
    setIsBlocked(post.isBlocked);
  }, [post]);

  const isAuthor = localPost.author?.id === currentUserId;
  const isDeleted = localPost.isDeleted;
  const hasReplies = localPost.replyCount > 0;

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
      const res = await authFetch(`/api/community/groups/${studyGroupId}/posts/${localPost.id}`, {
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

  const handlePostUpdated = (updatedPost) => {
    setLocalPost(prev => ({
      ...prev,
      content: updatedPost?.content ?? prev.content,
      updatedAt: updatedPost?.updatedAt ?? prev.updatedAt,
    }));
    setShowEditEditor(false);
  };

  const handleBlockToggle = async () => {
    const targetUserId = localPost.author?.id;
    if (!targetUserId) return;

    try {
      const res = await authFetch(`/api/blocks/${targetUserId}`, {
        method: isBlocked ? "DELETE" : "POST",
      });
      if (!res.ok) throw new Error("Failed to update block");
      setIsBlocked(!isBlocked);
      if (isBlocked) {
        setShowBlockedContent(true);
      }
    } catch (err) {
      console.error("Error updating block:", err);
      alert("Failed to update block status");
    }
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
    <div className={`p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] ${depth > 0 ? 'ml-8' : ''} ${highlighted ? 'ring-2 ring-[var(--primary)]' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-sm font-semibold text-[var(--primary)]">
            {localPost.author?.displayName?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              {localPost.author?.displayName || "[Former Member]"}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {formatDate(localPost.createdAt)}
              {localPost.updatedAt && localPost.updatedAt !== localPost.createdAt && " (edited)"}
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
                  <>
                    <button
                      onClick={() => { setShowMenu(false); setShowEditEditor(true); }}
                      className="w-full text-left px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); handleDelete(); }}
                      disabled={isDeleting}
                      className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                  </>
                )}
                {!isAuthor && (
                  <>
                    <button
                      onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                      className="w-full text-left px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
                    >
                      Report
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); handleBlockToggle(); }}
                      className="w-full text-left px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
                    >
                      {isBlocked ? "Unblock User" : "Block User"}
                    </button>
                  </>
                )}
                {!isPinVoteActive && !isGroupPinned && (
                  <button
                    onClick={() => { setShowMenu(false); onNominatePin?.(localPost.id); }}
                    className="w-full text-left px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
                  >
                    Nominate for Pinning
                  </button>
                )}
                {isGroupPinned && (
                  <span className="block px-3 py-2 text-xs text-[var(--muted-foreground)]">
                    Pinned for group
                  </span>
                )}
                <button
                  onClick={() => { setShowMenu(false); onPersonalPinToggle?.(localPost.id, isPersonalPinned); }}
                  className="w-full text-left px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  {isPersonalPinned ? "Unpin for Me" : "Pin for Me"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mt-3">
        {showEditEditor ? (
          <PostEditor
            studyGroupId={studyGroupId}
            postId={localPost.id}
            initialContent={localPost.content}
            onPostUpdated={(updated) => handlePostUpdated(updated)}
            onCancel={() => setShowEditEditor(false)}
            mode="edit"
          />
        ) : (
          <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap break-words">
            {localPost.content}
          </p>
        )}

        {/* Images */}
        {localPost.imageUrls?.length > 0 && !showEditEditor && (
          <div className="mt-3 flex flex-wrap gap-2">
            {localPost.imageUrls.map((url, i) => (
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
            postId={localPost.id}
            studyGroupId={studyGroupId}
            score={localPost.score || 0}
            userVote={localPost.userVote}
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
            {localPost.replyCount} {localPost.replyCount === 1 ? "reply" : "replies"}
          </button>
        )}
      </div>

      {/* Reply editor */}
      {showReplyEditor && (
        <div className="mt-4 pl-4 border-l-2 border-[var(--border)]">
          <PostEditor
            studyGroupId={studyGroupId}
            parentPostId={localPost.id}
            onPostCreated={handleReplyCreated}
            onCancel={() => setShowReplyEditor(false)}
            isReply
          />
        </div>
      )}

      {/* Replies */}
      {showReplies && (
        <ReplyThread
          postId={localPost.id}
          studyGroupId={studyGroupId}
          currentUserId={currentUserId}
          onRefresh={onRefresh}
          onNominatePin={onNominatePin}
          onPersonalPinToggle={onPersonalPinToggle}
          activePinPostIds={activePinPostIds}
          groupPinnedPostIds={groupPinnedPostIds}
          personalPinnedPostIds={personalPinnedPostIds}
          depth={depth + 1}
        />
      )}

      {/* Report modal */}
      <ReportPostModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        postId={localPost.id}
        studyGroupId={studyGroupId}
      />
    </div>
  );
}
