"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/api";
import { useMessagingRealtime } from "@/hooks/useMessagingRealtime";
import ConversationList from "./ConversationList";
import ConversationThread from "./ConversationThread";
import NewConversationModal from "./NewConversationModal";

export default function MessagingPanel({
  studyGroupId,
  currentUserId,
  members: providedMembers = [],
  embedded = false,
  fullPage = false,
  initialConversationId = null,
  isActive = true
}) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [members, setMembers] = useState(providedMembers);
  const [isBanned, setIsBanned] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState(new Set());

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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403 && data.error?.toLowerCase().includes('banned')) {
          setIsBanned(true);
          return;
        }
        throw new Error(data.error || "Failed to fetch conversations");
      }
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoading(false);
    }
  }, [studyGroupId]);

  // Initial fetch only - realtime handles updates
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Handle realtime conversation updates
  const handleRealtimeConversationCreated = useCallback((payload) => {
    // Only add if it's for our study group
    if (payload.studyGroupId !== studyGroupId) return;

    setConversations(prev => {
      const exists = prev.some(c => c.id === payload.conversationId);
      if (exists) return prev;
      // Refetch to get full conversation data with participants
      fetchConversations();
      return prev;
    });
  }, [studyGroupId, fetchConversations]);

  const handleRealtimeConversationUpdated = useCallback((payload) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== payload.conversationId) return conv;
      return {
        ...conv,
        lastMessage: payload.lastMessage || conv.lastMessage,
        updatedAt: payload.updatedAt || conv.updatedAt,
        // Increment unread count if not the selected conversation
        unreadCount: selectedConversation?.id === conv.id
          ? conv.unreadCount
          : (conv.unreadCount || 0) + 1,
      };
    }));
  }, [selectedConversation?.id]);

  // Subscribe to realtime messaging updates
  useMessagingRealtime(currentUserId, {
    onConversationCreated: handleRealtimeConversationCreated,
    onConversationUpdated: handleRealtimeConversationUpdated,
  });

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

  const fetchBlockedUsers = useCallback(async () => {
    try {
      const res = await authFetch('/api/blocks');
      if (!res.ok) throw new Error("Failed to fetch blocked users");
      const data = await res.json();
      // Backend returns { userId, blockedAt, displayName } for each blocked user
      const blockedIds = (data.blockedUsers || []).map(u => u.userId);
      setBlockedUsers(new Set(blockedIds));
    } catch (err) {
      console.error("Error fetching blocked users:", err);
    }
  }, []);

  useEffect(() => {
    if (studyGroupId) {
      fetchMembers();
      fetchBlockedUsers();
    }
  }, [studyGroupId, fetchMembers, fetchBlockedUsers]);

  // Refetch blocked users when tab becomes active (to pick up blocks made from community area)
  useEffect(() => {
    if (isActive && studyGroupId) {
      fetchBlockedUsers();
    }
  }, [isActive, studyGroupId, fetchBlockedUsers]);

  const handleBlockChange = useCallback((userId, isBlocked) => {
    setBlockedUsers(prev => {
      const newSet = new Set(prev);
      if (isBlocked) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  }, []);

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

  // Banned state UI
  if (isBanned) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/10 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-[var(--foreground)] mb-3">Access Restricted</h3>
        <p className="text-[var(--muted-foreground)] max-w-sm mb-6 leading-relaxed">
          You have been restricted from participating in social features for this study group due to a violation of community guidelines.
        </p>
        <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] max-w-sm">
          <p className="text-sm text-[var(--muted-foreground)]">
            If you believe this is a mistake, please contact support at{" "}
            <a href="mailto:team@kognolearn.com" className="text-[var(--primary)] hover:underline">
              team@kognolearn.com
            </a>
          </p>
        </div>
      </div>
    );
  }

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
          blockedUsers={blockedUsers}
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
            blockedUsers={blockedUsers}
            onBlockChange={handleBlockChange}
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
        blockedUsers={blockedUsers}
      />
    </div>
  );
}
