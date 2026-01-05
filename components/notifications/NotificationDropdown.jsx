"use client";

import NotificationItem from "./NotificationItem";

export default function NotificationDropdown({
  notifications,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClose,
}) {
  const hasUnread = notifications.some(n => !n.readAt);

  return (
    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-xl z-50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="font-semibold text-[var(--foreground)]">Notifications</h3>
        {hasUnread && (
          <button
            onClick={onMarkAllAsRead}
            className="text-xs text-[var(--primary)] hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--surface-2)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-[var(--surface-2)]" />
                  <div className="h-3 w-1/2 rounded bg-[var(--surface-2)]" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={() => onMarkAsRead(notification.id)}
                onDelete={() => onDelete(notification.id)}
                onClose={onClose}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-[var(--border)] text-center">
          <button
            onClick={onClose}
            className="text-sm text-[var(--primary)] hover:underline"
          >
            View All
          </button>
        </div>
      )}
    </div>
  );
}
