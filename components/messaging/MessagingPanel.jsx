"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/api";
import ConversationList from "./ConversationList";
import ConversationThread from "./ConversationThread";
import NewConversationModal from "./NewConversationModal";

export default function MessagingPanel({
  studyGroupId,
  currentUserId,
  members: providedMembers = [],
  embedded = false,
  fullPage = false,
  initialConversationId = null
}) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [members, setMembers] = useState(providedMembers);

  // Auto-select initial conversation if provided
  useEffect(() => {
    if (initialConversationId && conversations.length > 0 && !selectedConversation) {
      const conv = conversations.find(c => c.id === initialConversationId);
      if (conv) {
        setSelectedConversation(conv);
      }
    }
  }, [initialConversationId, conversations, selectedConversation]);

  const fetchConversations = useCallback(async () => {
    if (!studyGroupId) return;

    try {
      const res = await authFetch(`/api/messaging/conversations?studyGroupId=${studyGroupId}`);
      if (!res.ok) throw new Error("Failed to fetch conversations");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoading(false);
    }
  }, [studyGroupId]);

  useEffect(() => {
    fetchConversations();
    // Poll for new conversations every 10 seconds
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const fetchMembers = useCallback(async () => {
    if (!studyGroupId) return;
    try {
      const res = await authFetch(`/api/community/groups/${studyGroupId}/members`);
      if (!res.ok) throw new Error("Failed to fetch members");
      const data = await res.json();
      setMembers(Array.isArray(data.members) ? data.members : []);
    } catch (err) {
      console.error("Error fetching members:", err);
    }
  }, [studyGroupId]);

  useEffect(() => {
    if (studyGroupId) {
      fetchMembers();
    }
  }, [studyGroupId, fetchMembers]);

  const handleConversationCreated = (conversation) => {
    setConversations(prev => {
      const exists = prev.some(c => c.id === conversation.id);
      if (exists) return prev;
      return [conversation, ...prev];
    });
    setSelectedConversation(conversation);
    setShowNewConversation(false);
  };

  const markConversationLeft = (conversation) => {
    if (!conversation) return conversation;
    const updatedParticipants = Array.isArray(conversation.participants)
      ? conversation.participants.map((participant) => (
          participant.userId === currentUserId
            ? { ...participant, leftAt: new Date().toISOString(), isActive: false }
            : participant
        ))
      : conversation.participants;
    return { ...conversation, participants: updatedParticipants };
  };

  const handleConversationLeft = (conversationId) => {
    setConversations(prev => prev.map(c => (
      c.id === conversationId ? markConversationLeft(c) : c
    )));
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation(prev => markConversationLeft(prev));
    }
  };

  if (!studyGroupId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No messages yet</h3>
        <p className="text-[var(--muted-foreground)] max-w-sm">
          Share this course to start messaging with your study group members.
        </p>
      </div>
    );
  }

  const containerClasses = fullPage || embedded
    ? "flex h-full overflow-hidden"
    : "flex h-[500px] rounded-xl overflow-hidden border border-[var(--border)]";

  return (
    <div className={containerClasses}>
      {/* Conversation list */}
      <div className={`${fullPage ? 'w-80' : 'w-72'} border-r border-[var(--border)] bg-[var(--surface-1)] flex flex-col`}>
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="font-semibold text-[var(--foreground)]">Messages</h3>
          <button
            onClick={() => setShowNewConversation(true)}
            className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
            title="New conversation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <ConversationList
          conversations={conversations}
          loading={loading}
          selectedId={selectedConversation?.id}
          onSelect={setSelectedConversation}
          currentUserId={currentUserId}
        />
      </div>

      {/* Conversation thread */}
      <div className="flex-1 bg-[var(--background)]">
        {selectedConversation ? (
          <ConversationThread
            conversation={selectedConversation}
            currentUserId={currentUserId}
            studyGroupId={studyGroupId}
            onLeft={() => handleConversationLeft(selectedConversation.id)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Select a conversation</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              Choose a conversation from the list or start a new one.
            </p>
          </div>
        )}
      </div>

      {/* New conversation modal */}
      <NewConversationModal
        isOpen={showNewConversation}
        onClose={() => setShowNewConversation(false)}
        studyGroupId={studyGroupId}
        members={members.filter(m => m.userId !== currentUserId)}
        onConversationCreated={handleConversationCreated}
      />
    </div>
  );
}
