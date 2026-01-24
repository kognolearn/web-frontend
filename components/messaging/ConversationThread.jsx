"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { authFetch } from "@/lib/api";
import { useMessagingRealtime } from "@/hooks/useMessagingRealtime";
import MessageComposer from "./MessageComposer";

export default function ConversationThread({
  conversation,
  currentUserId,
  studyGroupId,
  onLeft,
  blockedUsers: parentBlockedUsers = new Set(),
  onBlockChange,
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [canSend, setCanSend] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [localBlockedUsers, setLocalBlockedUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  // Merge parent and local blocked users
  const blockedUsers = new Set([...parentBlockedUsers, ...localBlockedUsers]);

  const fetchMessages = useCallback(async (pageNum = 1, append = false) => {
    if (!conversation?.id) return;

    try {
      setLoading(true);
      const res = await authFetch(
        `/api/messaging/conversations/${conversation.id}?page=${pageNum}&limit=50`
      );
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();

      const newMessages = data.messages || [];
      if (append) {
        setMessages(prev => [...newMessages, ...prev]);
      } else {
        setMessages(newMessages);
      }
      setHasMore(data.hasMore);
      setPage(pageNum);
      setCanSend(data.canSend !== false);

      // Mark as read
      await authFetch(`/api/messaging/conversations/${conversation.id}/read`, {
        method: "PATCH",
      });
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  }, [conversation?.id]);

  // Initial fetch only - realtime handles new messages
  useEffect(() => {
    fetchMessages(1);
  }, [fetchMessages]);

  // Handle realtime new messages
  const handleRealtimeNewMessage = useCallback((payload) => {
    // Only handle messages for this conversation
    if (payload.conversationId !== conversation?.id) return;

    // Don't add duplicate messages (e.g., if sender is current user and message was already added)
    setMessages(prev => {
      const exists = prev.some(m => m.id === payload.message.id);
      if (exists) return prev;
      return [...prev, payload.message];
    });

    // Mark as read since we're viewing this conversation
    authFetch(`/api/messaging/conversations/${conversation.id}/read`, {
      method: "PATCH",
    }).catch(() => {});
  }, [conversation?.id]);

  // Subscribe to realtime messaging updates
  useMessagingRealtime(currentUserId, {
    onNewMessage: handleRealtimeNewMessage,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (content) => {
    try {
      const res = await authFetch(
        `/api/messaging/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send message");
      }

      const data = await res.json();
      setMessages(prev => [...prev, data.message]);
    } catch (err) {
      console.error("Error sending message:", err);
      throw err;
    }
  };

  const handleLeaveConversation = async () => {
    if (!confirm("Are you sure you want to leave this conversation?")) return;

    try {
      const res = await authFetch(
        `/api/messaging/conversations/${conversation.id}/leave`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to leave conversation");
      setCanSend(false);
      onLeft?.();
    } catch (err) {
      console.error("Error leaving conversation:", err);
      alert("Failed to leave conversation");
    }
  };

  const handleBlockUser = async (userId, displayName) => {
    if (!confirm(`Are you sure you want to block ${displayName}? You won't be able to message them.`)) return;

    try {
      const res = await authFetch(`/api/blocks/${userId}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to block user");
      setLocalBlockedUsers(prev => new Set([...prev, userId]));
      onBlockChange?.(userId, true);
      alert(`${displayName} has been blocked.`);
    } catch (err) {
      console.error("Error blocking user:", err);
      alert("Failed to block user");
    }
  };

  const handleUnblockUser = async (userId, displayName) => {
    try {
      const res = await authFetch(`/api/blocks/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to unblock user");
      setLocalBlockedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      onBlockChange?.(userId, false);
      alert(`${displayName} has been unblocked.`);
    } catch (err) {
      console.error("Error unblocking user:", err);
      alert("Failed to unblock user");
    }
  };

  const handleReportUser = async (userId, displayName) => {
    const reason = prompt(`Why are you reporting ${displayName}?`);
    if (!reason) return;

    try {
      const res = await authFetch(`/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedUserId: userId,
          reason,
          context: `DM conversation: ${conversation.id}`,
          studyGroupId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to report user");
      }
      alert(`Report submitted. Thank you for helping keep our community safe.`);
    } catch (err) {
      console.error("Error reporting user:", err);
      alert(err.message || "Failed to report user");
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  const getConversationName = () => {
    if (conversation.name) return conversation.name;
    if (conversation.isGroupDm) return "Group Chat";
    const other = conversation.participants?.find(p => p.userId !== currentUserId);
    return other?.displayName || "Chat";
  };

  const getOtherParticipants = () => {
    return conversation.participants?.filter(p => p.userId !== currentUserId) || [];
  };

  // Group messages by date and then by consecutive sender
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.createdAt);
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {});

  // Check if messages are within 5 minutes of each other
  const isWithinTimeThreshold = (date1, date2) => {
    const diff = Math.abs(new Date(date1) - new Date(date2));
    return diff < 5 * 60 * 1000; // 5 minutes
  };

  // Check if any other participant is blocked (for 1:1 DMs, this blocks messaging)
  const otherParticipants = getOtherParticipants();
  const isOtherParticipantBlocked = !conversation.isGroupDm && otherParticipants.some(p => blockedUsers.has(p.userId));

  const canSendMessage = canSend && !isOtherParticipantBlocked;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-1)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)]/30 to-[var(--primary)]/10 flex items-center justify-center text-sm font-bold text-[var(--primary)]">
            {conversation.isGroupDm ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            ) : (
              getConversationName()?.[0]?.toUpperCase() || "?"
            )}
          </div>
          <div>
            <h3 className="font-semibold text-[var(--foreground)] text-sm flex items-center gap-1.5">
              {getConversationName()}
              {isOtherParticipantBlocked && (
                <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Blocked">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              )}
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              {isOtherParticipantBlocked ? (
                <span className="text-red-500/70">Blocked</span>
              ) : (
                <>{conversation.participants?.length || 0} participant{conversation.participants?.length !== 1 ? 's' : ''}</>
              )}
            </p>
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-xl z-20 py-1 overflow-hidden">
                {/* Participants section */}
                {getOtherParticipants().length > 0 && (
                  <>
                    <div className="px-3 py-2 border-b border-[var(--border)]">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold">Participants</p>
                    </div>
                    {getOtherParticipants().map(participant => (
                      <div key={participant.userId} className="px-3 py-2 border-b border-[var(--border)]">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-xs font-semibold text-[var(--primary)]">
                            {participant.displayName?.[0]?.toUpperCase() || "?"}
                          </div>
                          <span className="text-sm font-medium text-[var(--foreground)] truncate">
                            {participant.displayName}
                          </span>
                        </div>
                        <div className="flex gap-1 ml-8">
                          <button
                            onClick={() => {
                              setShowMenu(false);
                              handleReportUser(participant.userId, participant.displayName);
                            }}
                            className="px-2 py-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] rounded transition-colors"
                          >
                            Report
                          </button>
                          {blockedUsers.has(participant.userId) ? (
                            <button
                              onClick={() => {
                                setShowMenu(false);
                                handleUnblockUser(participant.userId, participant.displayName);
                              }}
                              className="px-2 py-1 text-xs text-amber-600 hover:bg-amber-500/10 rounded transition-colors"
                            >
                              Unblock
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setShowMenu(false);
                                handleBlockUser(participant.userId, participant.displayName);
                              }}
                              className="px-2 py-1 text-xs text-red-500 hover:bg-red-500/10 rounded transition-colors"
                            >
                              Block
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Leave conversation */}
                <button
                  onClick={() => { setShowMenu(false); handleLeaveConversation(); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-3"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Leave Conversation
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <svg className="w-8 h-8 animate-spin text-[var(--primary)]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[var(--foreground)] mb-1">No messages yet</p>
            <p className="text-xs text-[var(--muted-foreground)]">Start the conversation!</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, dayMessages]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">{date}</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              {/* Messages grouped by sender */}
              <div className="space-y-1">
                {dayMessages.map((message, idx) => {
                  const isOwn = message.senderUserId === currentUserId;
                  const prevMessage = dayMessages[idx - 1];
                  const nextMessage = dayMessages[idx + 1];

                  // Check if this is the first message in a consecutive group
                  const isFirstInGroup = !prevMessage ||
                    prevMessage.senderUserId !== message.senderUserId ||
                    !isWithinTimeThreshold(prevMessage.createdAt, message.createdAt);

                  // Check if this is the last message in a consecutive group
                  const isLastInGroup = !nextMessage ||
                    nextMessage.senderUserId !== message.senderUserId ||
                    !isWithinTimeThreshold(message.createdAt, nextMessage.createdAt);

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"} ${isFirstInGroup ? "mt-4" : ""}`}
                    >
                      <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                        {/* Show sender name only for first message in group (and not own messages) */}
                        {!isOwn && isFirstInGroup && (
                          <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1 ml-3">
                            {message.sender?.displayName || "Unknown"}
                          </p>
                        )}
                        <div
                          className={`px-4 py-2 ${
                            isOwn
                              ? `bg-[var(--primary)] text-white ${
                                  isFirstInGroup && isLastInGroup
                                    ? "rounded-2xl rounded-br-md"
                                    : isFirstInGroup
                                    ? "rounded-2xl rounded-br-md rounded-br-md"
                                    : isLastInGroup
                                    ? "rounded-2xl rounded-tr-md rounded-br-md"
                                    : "rounded-2xl rounded-r-md"
                                }`
                              : `bg-[var(--surface-2)] text-[var(--foreground)] ${
                                  isFirstInGroup && isLastInGroup
                                    ? "rounded-2xl rounded-bl-md"
                                    : isFirstInGroup
                                    ? "rounded-2xl rounded-bl-md"
                                    : isLastInGroup
                                    ? "rounded-2xl rounded-tl-md rounded-bl-md"
                                    : "rounded-2xl rounded-l-md"
                                }`
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                        {/* Show time only for last message in group */}
                        {isLastInGroup && (
                          <p className={`text-[10px] text-[var(--muted-foreground)] mt-1 ${isOwn ? "mr-2" : "ml-3"}`}>
                            {formatTime(message.createdAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      {isOtherParticipantBlocked ? (
        <div className="flex-shrink-0 p-4 border-t border-[var(--border)] bg-[var(--surface-1)] text-center">
          <div className="flex items-center justify-center gap-2 text-red-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <p className="text-sm font-medium">
              You have blocked this user
            </p>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Unblock them from the menu to send messages.
          </p>
        </div>
      ) : !canSendMessage ? (
        <div className="flex-shrink-0 p-4 border-t border-[var(--border)] bg-[var(--surface-1)] text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            Messages are read-only in this conversation.
          </p>
        </div>
      ) : (
        <MessageComposer onSend={handleSendMessage} />
      )}
    </div>
  );
}
