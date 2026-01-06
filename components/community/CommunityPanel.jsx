"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authFetch } from "@/lib/api";
import DiscussionTab from "./DiscussionTab";
import StudyGroupPanel from "./StudyGroupPanel";
import MessagingPanel from "../messaging/MessagingPanel";
import ShareCourseModal from "./ShareCourseModal";

export default function CommunityPanel({
  isOpen,
  onClose,
  courseId,
  userId,
  onOpenDiscussionTab,
  onOpenMessagesTab
}) {
  const [activeTab, setActiveTab] = useState("discussion");
  const [studyGroup, setStudyGroup] = useState(null);
  const [memberCount, setMemberCount] = useState(0);
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
        setMemberCount(data.memberCount || 0);
      } else if (res.status === 404) {
        setStudyGroup(null);
        setMemberCount(0);
      }
    } catch (err) {
      console.error("Error fetching study group:", err);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (isOpen) {
      fetchStudyGroup();
    }
  }, [isOpen, fetchStudyGroup]);

  const tabs = [
    { id: "discussion", label: "Discussion", icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    )},
    { id: "messages", label: "Messages", icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    )},
    { id: "members", label: "Members", icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )},
  ];

  // Empty state when no study group exists
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-4">
        <svg className="w-10 h-10 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
        No one here yet
      </h3>
      <p className="text-sm text-[var(--muted-foreground)] mb-6 max-w-xs">
        No one here yet &mdash; share this course with others to work on it together.
      </p>
      <button
        onClick={() => setIsShareModalOpen(true)}
        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-active)] text-white font-medium shadow-lg shadow-[var(--primary)]/20 hover:shadow-[var(--primary)]/40 transition-all flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Share Course
      </button>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full sm:w-[480px] md:w-[560px] bg-[var(--surface-1)] border-l border-[var(--border)] z-50 flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-[var(--foreground)]">Community</h2>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {studyGroup ? `${studyGroup.memberCount || 0} member${(studyGroup.memberCount || 0) !== 1 ? 's' : ''}` : 'Study together'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {studyGroup && (onOpenDiscussionTab || onOpenMessagesTab) && (
                    <button
                      onClick={() => {
                        if (activeTab === "discussion" && onOpenDiscussionTab) {
                          onOpenDiscussionTab();
                          onClose();
                        } else if (activeTab === "messages" && onOpenMessagesTab) {
                          onOpenMessagesTab();
                          onClose();
                        } else if (onOpenDiscussionTab) {
                          onOpenDiscussionTab();
                          onClose();
                        }
                      }}
                      className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--surface-2)] transition-colors"
                      title="Open in Tab"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                  )}
                  {studyGroup && (
                    <button
                      onClick={() => setIsShareModalOpen(true)}
                      className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--surface-2)] transition-colors"
                      title="Share course"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
                </div>
              ) : !studyGroup ? (
                <EmptyState />
              ) : (
                <>
                  {/* Tab Navigation */}
                  <div className="px-4 pt-3 border-b border-[var(--border)]">
                    <div className="flex gap-1">
                      {tabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                            activeTab === tab.id
                              ? "bg-[var(--surface-2)] text-[var(--foreground)] border-b-2 border-[var(--primary)]"
                              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]/50"
                          }`}
                        >
                          {tab.icon}
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="flex-1 overflow-hidden">
                    {activeTab === "discussion" && (
                      <DiscussionTab
                        studyGroupId={studyGroup.id}
                        currentUserId={userId}
                        memberCount={memberCount}
                        onShareRequested={() => setIsShareModalOpen(true)}
                      />
                    )}
                    {activeTab === "messages" && (
                      <MessagingPanel
                        studyGroupId={studyGroup.id}
                        currentUserId={userId}
                        embedded
                      />
                    )}
                    {activeTab === "members" && (
                      <StudyGroupPanel
                        studyGroupId={studyGroup.id}
                        courseId={courseId}
                        currentUserId={userId}
                        onStartDM={(memberId) => {
                          setActiveTab("messages");
                        }}
                      />
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <ShareCourseModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        courseId={courseId}
        onShareCreated={fetchStudyGroup}
      />
    </>
  );
}
