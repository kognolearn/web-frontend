"use client";

import { useState, useEffect } from "react";
import { authFetch } from "@/lib/api";
import MemberCard from "./MemberCard";
import ShareCourseModal from "./ShareCourseModal";

export default function StudyGroupPanel({ studyGroupId, courseId, currentUserId }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!studyGroupId) {
        setMembers([]);
        setLoading(false);
        return;
      }

      try {
        const res = await authFetch(`/api/community/groups/${studyGroupId}/members`);
        if (!res.ok) throw new Error("Failed to fetch study group");
        const data = await res.json();
        setMembers(data.members || []);
      } catch (err) {
        console.error("Error fetching study group:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [studyGroupId]);

  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-24 rounded bg-[var(--surface-2)]" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--surface-2)]" />
                <div className="h-4 w-24 rounded bg-[var(--surface-2)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty state - no study group yet
  if (!studyGroupId || members.length <= 1) {
    return (
      <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Study Group</h3>
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] mb-3">No one here yet</p>
          <button
            onClick={() => setShowShareModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share Course
          </button>
        </div>

        <ShareCourseModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          courseId={courseId}
        />
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          Study Group ({members.length})
        </h3>
        <button
          onClick={() => setShowShareModal(true)}
          className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
          title="Share course"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        {members.map((member) => (
          <MemberCard
            key={member.userId}
            member={member}
            isCurrentUser={member.userId === currentUserId}
          />
        ))}
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}

      <ShareCourseModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        courseId={courseId}
      />
    </div>
  );
}
