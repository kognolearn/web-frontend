"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { authFetch } from "@/lib/api";
import MessageComposer from "./MessageComposer";

export default function ConversationThread({
  conversation,
  currentUserId,
  studyGroupId,
  onLeft,
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [canSend, setCanSend] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

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
        // Older messages go at the beginning (API returns them in chronological order)
        setMessages(prev => [...newMessages, ...prev]);
      } else {
        // Messages are already in chronological order from the API
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

  useEffect(() => {
    fetchMessages(1);
    // Poll for new messages every 5 seconds
    const interval = setInterval(() => fetchMessages(1), 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
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

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.createdAt);
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {});

  const canSendMessage = canSend;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-1)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-sm font-semibold text-[var(--primary)]">
            {conversation.isGroupDm ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            ) : (
              getConversationName()?.[0]?.toUpperCase() || "?"
            )}
          </div>
          <div>
            <h3 className="font-semibold text-[var(--foreground)]">{getConversationName()}</h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              {conversation.participants?.length || 0} participants
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
              <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] shadow-lg z-20">
                <button
                  onClick={() => { setShowMenu(false); handleLeaveConversation(); }}
                  className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  Leave Conversation
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <svg className="w-8 h-8 animate-spin text-[var(--primary)]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-[var(--muted-foreground)]">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, dayMessages]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center gap-4 my-4">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-xs text-[var(--muted-foreground)]">{date}</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              {/* Messages */}
              <div className="space-y-2">
                {dayMessages.map((message) => {
                  const isOwn = message.senderUserId === currentUserId;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[70%] ${isOwn ? "order-2" : ""}`}>
                        {!isOwn && (
                          <p className="text-xs text-[var(--muted-foreground)] mb-1 ml-1">
                            {message.sender?.displayName || "Unknown"}
                          </p>
                        )}
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            isOwn
                              ? "bg-[var(--primary)] text-white rounded-br-md"
                              : "bg-[var(--surface-2)] text-[var(--foreground)] rounded-bl-md"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                        <p className={`text-xs text-[var(--muted-foreground)] mt-1 ${isOwn ? "text-right mr-1" : "ml-1"}`}>
                          {formatTime(message.createdAt)}
                        </p>
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
      {!canSendMessage ? (
        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-1)] text-center">
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
