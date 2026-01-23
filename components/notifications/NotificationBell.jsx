"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { authFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase/client";
import NotificationDropdown from "./NotificationDropdown";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const bellRef = useRef(null);
  const isFetchingRef = useRef(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await authFetch("/api/notifications/unread-count");
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.count || 0);
    } catch (err) {
      console.error("Error fetching unread count:", err);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const res = await authFetch("/api/notifications?limit=20");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  // Get current user ID for realtime subscription filter
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) {
        setUserId(data.user.id);
      }
    });
  }, []);

  // Initial fetch and realtime subscription
  useEffect(() => {
    fetchUnreadCount();

    if (!userId) return;

    // Subscribe to notifications table changes for the current user
    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "api",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // New notification received - increment unread count
          setUnreadCount((prev) => prev + 1);
          // Add to notifications list if dropdown is open
          setNotifications((prev) => [payload.new, ...prev].slice(0, 20));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "api",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Notification updated (e.g., marked as read)
          const wasUnread = !payload.old.read_at;
          const isNowRead = !!payload.new.read_at;
          if (wasUnread && isNowRead) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.new.id ? payload.new : n))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "api",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Notification deleted
          if (!payload.old.read_at) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
          setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchUnreadCount]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      const res = await authFetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      });
      if (!res.ok) return;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await authFetch("/api/notifications/read-all", {
        method: "PATCH",
      });
      if (!res.ok) return;

      setNotifications(prev =>
        prev.map(n => ({ ...n, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      const res = await authFetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });
      if (!res.ok) return;

      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (!notification?.readAt) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  return (
    <div ref={bellRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[var(--primary)] text-white text-xs font-semibold flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          loading={loading}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onDelete={handleDelete}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
