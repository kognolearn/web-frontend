"use client";

import { useState } from "react";
import { authFetch } from "@/lib/api";

export default function NewConversationModal({
  isOpen,
  onClose,
  studyGroupId,
  members = [],
  onConversationCreated,
  blockedUsers = new Set(),
}) {
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  const isGroupDm = selectedMembers.length > 1;

  const handleToggleMember = (memberId) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleCreate = async () => {
    if (selectedMembers.length === 0) {
      setError("Please select at least one member");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const res = await authFetch("/api/messaging/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studyGroupId,
          participantIds: selectedMembers,
          isGroupDm,
          name: isGroupDm ? groupName || null : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create conversation");
      }

      const data = await res.json();
      onConversationCreated?.(data.conversation);
      handleClose();
    } catch (err) {
      console.error("Error creating conversation:", err);
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setSelectedMembers([]);
    setGroupName("");
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] shadow-2xl max-w-md w-full p-6">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">New Conversation</h3>

        {/* Group name (only for group DMs) */}
        {isGroupDm && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
              Group Name (optional)
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Study Squad"
              className="w-full px-4 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>
        )}

        {/* Member selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Select Members ({selectedMembers.length} selected)
          </label>
          <div className="max-h-60 overflow-y-auto space-y-1 border border-[var(--border)] rounded-lg p-2">
            {members.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-4">
                No other members in the study group yet.
              </p>
            ) : (
              members.map((member) => {
                const isSelected = selectedMembers.includes(member.userId);
                const isBlocked = blockedUsers.has(member.userId);
                return (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() => !isBlocked && handleToggleMember(member.userId)}
                    disabled={isBlocked}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      isBlocked
                        ? "opacity-50 cursor-not-allowed bg-red-500/5"
                        : isSelected
                        ? "bg-[var(--primary)]/10 border border-[var(--primary)]/30"
                        : "hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      isBlocked
                        ? "border-red-500/50 bg-red-500/10"
                        : isSelected
                        ? "bg-[var(--primary)] border-[var(--primary)]"
                        : "border-[var(--muted-foreground)]"
                    }`}>
                      {isBlocked ? (
                        <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      ) : isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                      isBlocked
                        ? "bg-red-500/10 text-red-500"
                        : "bg-[var(--primary)]/20 text-[var(--primary)]"
                    }`}>
                      {member.displayName?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className={`text-sm ${isBlocked ? "text-[var(--muted-foreground)]" : "text-[var(--foreground)]"}`}>
                        {member.displayName || "Unknown"}
                      </span>
                      {isBlocked && (
                        <span className="text-xs text-red-500">Blocked</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-500 mb-4">{error}</p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || selectedMembers.length === 0}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </>
            ) : (
              "Start Conversation"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
