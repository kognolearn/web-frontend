"use client";

export default function ConversationList({
  conversations,
  loading,
  selectedId,
  onSelect,
  currentUserId,
  blockedUsers = new Set(),
}) {
  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-3 rounded-lg animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--surface-2)]" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-24 rounded bg-[var(--surface-2)]" />
                <div className="h-3 w-32 rounded bg-[var(--surface-2)]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-[var(--muted-foreground)] text-center">
          No conversations yet. Start one!
        </p>
      </div>
    );
  }

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getConversationName = (conversation) => {
    if (conversation.name) return conversation.name;
    if (conversation.isGroupDm) return "Group Chat";

    // For 1:1, show the other person's name
    const otherParticipant = conversation.participants?.find(
      (p) => p.userId !== currentUserId
    );
    return otherParticipant?.displayName || "Chat";
  };

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {conversations.map((conversation) => {
        const isSelected = selectedId === conversation.id;
        const hasUnread = conversation.unreadCount > 0;
        const lastMessageText = conversation.lastMessage?.content || conversation.lastMessage;
        const lastMessageAt = conversation.lastMessage?.createdAt || conversation.lastMessageAt || conversation.updatedAt;

        // Check if any participant in this conversation is blocked (for 1:1 DMs)
        const otherParticipants = conversation.participants?.filter(p => p.userId !== currentUserId) || [];
        const isBlocked = !conversation.isGroupDm && otherParticipants.some(p => blockedUsers.has(p.userId));

        return (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation)}
            className={`w-full text-left p-3 rounded-lg transition-colors ${
              isSelected
                ? "bg-[var(--primary)]/10 border border-[var(--primary)]/30"
                : "hover:bg-[var(--surface-2)]"
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-sm font-semibold text-[var(--primary)]">
                  {conversation.isGroupDm ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  ) : (
                    getConversationName(conversation)?.[0]?.toUpperCase() || "?"
                  )}
                </div>
                {hasUnread && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--primary)] text-white text-xs flex items-center justify-center font-medium">
                    {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm truncate flex items-center gap-1.5 ${hasUnread ? "font-semibold text-[var(--foreground)]" : "font-medium text-[var(--foreground)]"} ${isBlocked ? "text-[var(--muted-foreground)]" : ""}`}>
                    {getConversationName(conversation)}
                    {isBlocked && (
                      <svg className="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Blocked">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    )}
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)] shrink-0">
                    {formatTime(lastMessageAt)}
                  </span>
                </div>
                {isBlocked ? (
                  <p className="text-xs truncate mt-0.5 text-red-500/70 italic">
                    User blocked
                  </p>
                ) : lastMessageText && (
                  <p className={`text-xs truncate mt-0.5 ${hasUnread ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>
                    {lastMessageText}
                  </p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
