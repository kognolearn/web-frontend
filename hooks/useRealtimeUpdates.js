'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

/**
 * Hook for subscribing to Supabase Realtime updates for jobs and courses
 * Replaces polling-based updates with WebSocket subscriptions
 *
 * @param {string} userId - User ID to subscribe to updates for
 * @param {Object} callbacks - Callback functions for different update types
 * @param {Function} callbacks.onJobUpdate - Called when job status changes
 * @param {Function} callbacks.onJobProgress - Called when job progress updates
 * @param {Function} callbacks.onCourseUpdate - Called when course status changes
 * @param {Function} callbacks.onModuleComplete - Called when a module finishes generating
 */
export function useRealtimeUpdates(userId, { onJobUpdate, onJobProgress, onCourseUpdate, onModuleComplete } = {}) {
  const channelRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const retryAttemptRef = useRef(0);
  const callbacksRef = useRef({ onJobUpdate, onJobProgress, onCourseUpdate, onModuleComplete });
  const debugRealtime = process.env.NEXT_PUBLIC_REALTIME_DEBUG === 'true';

  const logDebug = useCallback((...args) => {
    if (debugRealtime) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  }, [debugRealtime]);

  // Keep callbacks ref updated to avoid stale closures
  useEffect(() => {
    callbacksRef.current = { onJobUpdate, onJobProgress, onCourseUpdate, onModuleComplete };
  }, [onJobUpdate, onJobProgress, onCourseUpdate, onModuleComplete]);

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
      logDebug('[realtime] Reconnect scheduled in', delay, 'ms');
    };

    const setupChannel = () => {
      cleanupChannel();

      const channel = supabase
        .channel(`user:${userId}:realtime`)
        .on('broadcast', { event: 'job_update' }, ({ payload }) => {
          logDebug('[realtime] Job update:', payload);
          callbacksRef.current.onJobUpdate?.(payload);
        })
        .on('broadcast', { event: 'job_progress' }, ({ payload }) => {
          logDebug('[realtime] Job progress:', payload);
          callbacksRef.current.onJobProgress?.(payload);
        })
        .on('broadcast', { event: 'course_update' }, ({ payload }) => {
          logDebug('[realtime] Course update:', payload);
          callbacksRef.current.onCourseUpdate?.(payload);
        })
        .on('broadcast', { event: 'module_complete' }, ({ payload }) => {
          logDebug('[realtime] Module complete:', payload);
          callbacksRef.current.onModuleComplete?.(payload);
        })
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'api',
            table: 'courses',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            logDebug('[realtime] Course DB change:', payload);
            callbacksRef.current.onCourseUpdate?.({
              courseId: payload.new.id,
              status: payload.new.status,
              title: payload.new.title,
              ...payload.new,
            });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            retryAttemptRef.current = 0;
            logDebug('[realtime] Subscribed to updates');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
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

export default useRealtimeUpdates;
