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
      <div className={`px-5 py-4 rounded-2xl bg-[var(--surface-1)]/50 border border-[var(--border)]/50 ${depth > 0 ? 'ml-10' : ''}`}>
        <p className="text-sm text-[var(--muted-foreground)] italic flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          This post has been deleted
        </p>
      </div>
    );
  }

  return (
    <div className={`group rounded-2xl bg-[var(--surface-1)] border transition-all duration-200 ${
      highlighted
        ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20 shadow-lg shadow-[var(--primary)]/5'
        : 'border-[var(--border)] hover:border-[var(--border-hover)] hover:shadow-sm'
    } ${depth > 0 ? 'ml-10' : ''}`}>
      {/* Pinned indicator */}
      {(isGroupPinned || isPersonalPinned) && (
        <div className="px-5 py-2 border-b border-[var(--border)] bg-gradient-to-r from-amber-500/5 to-transparent flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
          </svg>
          <span className="text-xs font-medium text-amber-600">
            {isGroupPinned ? "Pinned by group" : "Pinned by you"}
          </span>
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)]/30 to-[var(--primary)]/10 flex items-center justify-center text-sm font-bold text-[var(--primary)] ring-2 ring-[var(--primary)]/10">
              {localPost.author?.displayName?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {localPost.author?.displayName || "[Former Member]"}
              </p>
              <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1.5">
                <span>{formatDate(localPost.createdAt)}</span>
                {localPost.updatedAt && localPost.updatedAt !== localPost.createdAt && (
                  <>
                    <span className="text-[var(--border)]">·</span>
                    <span className="italic">edited</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-xl z-20 py-1 overflow-hidden">
                  {isAuthor && (
                    <>
                      <button
                        onClick={() => { setShowMenu(false); setShowEditEditor(true); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors flex items-center gap-3"
                      >
                        <svg className="w-4 h-4 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Post
                      </button>
                      <button
                        onClick={() => { setShowMenu(false); handleDelete(); }}
                        disabled={isDeleting}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-3"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        {isDeleting ? "Deleting..." : "Delete Post"}
                      </button>
                      <div className="h-px bg-[var(--border)] my-1" />
                    </>
                  )}
                  {!isAuthor && (
                    <>
                      <button
                        onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors flex items-center gap-3"
                      >
                        <svg className="w-4 h-4 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Report Post
                      </button>
                      <button
                        onClick={() => { setShowMenu(false); handleBlockToggle(); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors flex items-center gap-3"
                      >
                        <svg className="w-4 h-4 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        {isBlocked ? "Unblock User" : "Block User"}
                      </button>
                      <div className="h-px bg-[var(--border)] my-1" />
                    </>
                  )}
                  {!isPinVoteActive && !isGroupPinned && (
                    <button
                      onClick={() => { setShowMenu(false); onNominatePin?.(localPost.id); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors flex items-center gap-3"
                    >
                      <svg className="w-4 h-4 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      Nominate for Pinning
                    </button>
                  )}
                  <button
                    onClick={() => { setShowMenu(false); onPersonalPinToggle?.(localPost.id, isPersonalPinned); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors flex items-center gap-3"
                  >
                    <svg className={`w-4 h-4 ${isPersonalPinned ? 'text-amber-500' : 'text-[var(--muted-foreground)]'}`} fill={isPersonalPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    {isPersonalPinned ? "Unpin for Me" : "Pin for Me"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="mt-4">
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
            <p className="text-[15px] text-[var(--foreground)] whitespace-pre-wrap break-words leading-relaxed">
              {localPost.content}
            </p>
          )}

          {/* Images */}
          {localPost.imageUrls?.length > 0 && !showEditEditor && (
            <div className="mt-4 flex flex-wrap gap-2">
              {localPost.imageUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="max-w-sm max-h-64 rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity border border-[var(--border)]"
                  onClick={() => window.open(url, "_blank")}
                />
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 pt-3 border-t border-[var(--border)]/50 flex items-center gap-1">
          <VoteButtons
            postId={localPost.id}
            studyGroupId={studyGroupId}
            score={localPost.score || 0}
            userVote={localPost.userVote}
            onVoteUpdate={onVoteUpdate}
          />

          <div className="w-px h-5 bg-[var(--border)] mx-2" />

          <button
            onClick={() => setShowReplyEditor(!showReplyEditor)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showReplyEditor
                ? 'text-[var(--primary)] bg-[var(--primary)]/10'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Reply
          </button>

          {hasReplies && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showReplies
                  ? 'text-[var(--primary)] bg-[var(--primary)]/10'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]'
              }`}
            >
              <svg className={`w-4 h-4 transition-transform duration-200 ${showReplies ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {localPost.replyCount} {localPost.replyCount === 1 ? "reply" : "replies"}
            </button>
          )}
        </div>
      </div>

      {/* Reply editor */}
      {showReplyEditor && (
        <div className="px-5 pb-5 pt-0">
          <div className="pl-5 border-l-2 border-[var(--primary)]/30">
            <PostEditor
              studyGroupId={studyGroupId}
              parentPostId={localPost.id}
              onPostCreated={handleReplyCreated}
              onCancel={() => setShowReplyEditor(false)}
              isReply
            />
          </div>
        </div>
      )}

      {/* Replies */}
      {showReplies && (
        <div className="px-5 pb-5">
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
        </div>
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
