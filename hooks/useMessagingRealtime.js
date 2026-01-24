'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

/**
 * Hook for subscribing to Supabase Realtime updates for messaging.
 * Replaces polling-based updates with WebSocket subscriptions.
 *
 * @param {string} userId - User ID to subscribe to updates for
 * @param {Object} callbacks - Callback functions for different update types
 * @param {Function} callbacks.onNewMessage - Called when a new message is received
 * @param {Function} callbacks.onConversationCreated - Called when a new conversation is created
 * @param {Function} callbacks.onConversationUpdated - Called when a conversation is updated (e.g., new lastMessage)
 */
export function useMessagingRealtime(userId, { onNewMessage, onConversationCreated, onConversationUpdated } = {}) {
  const channelRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const retryAttemptRef = useRef(0);
  const callbacksRef = useRef({ onNewMessage, onConversationCreated, onConversationUpdated });
  const debugRealtime = process.env.NEXT_PUBLIC_REALTIME_DEBUG === 'true';

  const logDebug = useCallback((...args) => {
    if (debugRealtime) {
      // eslint-disable-next-line no-console
      console.log('[messaging-realtime]', ...args);
    }
  }, [debugRealtime]);

  // Keep callbacks ref updated to avoid stale closures
  useEffect(() => {
    callbacksRef.current = { onNewMessage, onConversationCreated, onConversationUpdated };
  }, [onNewMessage, onConversationCreated, onConversationUpdated]);

  useEffect(() => {
    if (!userId) {
      return;
    }
    retryAttemptRef.current = 0;

    const cleanupChannel = () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (retryTimeoutRef.current) return;
      retryAttemptRef.current += 1;
      const delay = Math.min(30000, 1000 * 2 ** (retryAttemptRef.current - 1));
      retryTimeoutRef.current = setTimeout(() => {
        retryTimeoutRef.current = null;
        setupChannel();
      }, delay);
      logDebug('Reconnect scheduled in', delay, 'ms');
    };

    const setupChannel = () => {
      cleanupChannel();

      const channel = supabase
        .channel(`user:${userId}:messaging`)
        .on('broadcast', { event: 'new_message' }, ({ payload }) => {
          logDebug('New message:', payload);
          callbacksRef.current.onNewMessage?.(payload);
        })
        .on('broadcast', { event: 'conversation_created' }, ({ payload }) => {
          logDebug('Conversation created:', payload);
          callbacksRef.current.onConversationCreated?.(payload);
        })
        .on('broadcast', { event: 'conversation_updated' }, ({ payload }) => {
          logDebug('Conversation updated:', payload);
          callbacksRef.current.onConversationUpdated?.(payload);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            retryAttemptRef.current = 0;
            logDebug('Subscribed to messaging updates for user', userId);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            logDebug('Channel error or timeout, scheduling reconnect');
            scheduleReconnect();
          }
        });

      channelRef.current = channel;
    };

    setupChannel();

    // Cleanup on unmount or userId change
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      cleanupChannel();
    };
  }, [userId, logDebug]);

  return null;
}

export default useMessagingRealtime;
