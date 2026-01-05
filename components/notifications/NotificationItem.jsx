"use client";

import { useRouter } from "next/navigation";

export default function NotificationItem({ notification, onMarkAsRead, onDelete, onClose }) {
  const router = useRouter();
  const isUnread = !notification.readAt;

  const formatTime = (dateString) => {
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

  const getIcon = () => {
    switch (notification.type) {
      case "post_reply":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        );
      case "dm_message":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case "pin_vote_result":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2zm-3 2H9.4l1.6-1.6V4h2v8.4l1.6 1.6H13z" />
          </svg>
        );
      case "mention":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
    }
  };

  const handleClick = () => {
    if (isUnread) {
      onMarkAsRead();
    }

    // Navigate based on notification type and data
    const data = notification.data || {};
    if (notification.type === "post_reply" && data.studyGroupId && data.postId) {
      router.push(`/courses/${data.studyGroupId}?tab=discussion&post=${data.postId}`);
    } else if (notification.type === "dm_message" && data.conversationId) {
      router.push(`/courses/${data.studyGroupId}?tab=messages&conversation=${data.conversationId}`);
    } else if (notification.type === "pin_vote_result" && data.studyGroupId) {
      router.push(`/courses/${data.studyGroupId}?tab=discussion`);
    }

    onClose();
  };

  return (
    <div
      className={`p-4 hover:bg-[var(--surface-2)] transition-colors cursor-pointer ${
        isUnread ? "bg-[var(--primary)]/5" : ""
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          isUnread ? "bg-[var(--primary)]/20 text-[var(--primary)]" : "bg-[var(--surface-2)] text-[var(--muted-foreground)]"
        }`}>
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${isUnread ? "text-[var(--foreground)] font-medium" : "text-[var(--foreground)]"}`}>
            {notification.title}
          </p>
          {notification.body && (
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-2">
              {notification.body}
            </p>
          )}
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {formatTime(notification.createdAt)}
          </p>
        </div>

        {/* Unread indicator */}
        {isUnread && (
          <div className="w-2 h-2 rounded-full bg-[var(--primary)] shrink-0 mt-2" />
        )}

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
