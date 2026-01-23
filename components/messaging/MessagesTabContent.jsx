"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/api";
import MessagingPanel from "./MessagingPanel";
import ShareCourseModal from "../community/ShareCourseModal";

export default function MessagesTabContent({
  isActive,
  courseId,
  userId,
  onClose,
  onOpenDiscussionTab,
  initialConversationId
}) {
  const [studyGroup, setStudyGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const fetchStudyGroup = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/courses/${courseId}/study-group`);
      if (res.ok) {
        const data = await res.json();
        setStudyGroup(data.studyGroup);
      } else if (res.status === 404) {
        setStudyGroup(null);
      }
    } catch (err) {
      console.error("Error fetching study group:", err);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (isActive) {
      fetchStudyGroup();
    }
  }, [isActive, fetchStudyGroup]);

  // Empty state when no study group exists
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-24 h-24 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-6">
        <svg className="w-12 h-12 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
        No Study Group Yet
      </h3>
      <p className="text-sm text-[var(--muted-foreground)] mb-6 max-w-md">
        Share this course with classmates to create a study group. Once shared, you can send direct messages to other members.
      </p>
      <button
        onClick={() => setIsShareModalOpen(true)}
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-active)] text-white font-medium shadow-lg shadow-[var(--primary)]/20 hover:shadow-[var(--primary)]/40 transition-all flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Share Course
      </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-[var(--background)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-1)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-[var(--foreground)]">Messages</h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              {studyGroup ? 'Direct messages with study group members' : 'Share to start messaging'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {studyGroup && onOpenDiscussionTab && (
            <button
              onClick={onOpenDiscussionTab}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
              Discussion
            </button>
          )}
          {studyGroup && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Invite
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
          </div>
        ) : !studyGroup ? (
          <EmptyState />
        ) : (
          <MessagingPanel
            studyGroupId={studyGroup.id}
            currentUserId={userId}
            initialConversationId={initialConversationId}
            fullPage
          />
        )}
      </div>

      {/* Share Modal */}
      <ShareCourseModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        courseId={courseId}
        onShareCreated={fetchStudyGroup}
      />
    </div>
  );
}
