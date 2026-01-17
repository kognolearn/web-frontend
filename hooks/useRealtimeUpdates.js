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
  const channelsRef = useRef([]);
  const callbacksRef = useRef({ onJobUpdate, onJobProgress, onCourseUpdate, onModuleComplete });

  // Keep callbacks ref updated to avoid stale closures
  useEffect(() => {
    callbacksRef.current = { onJobUpdate, onJobProgress, onCourseUpdate, onModuleComplete };
  }, [onJobUpdate, onJobProgress, onCourseUpdate, onModuleComplete]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    // Subscribe to job updates via Broadcast
    const jobChannel = supabase
      .channel(`user:${userId}:jobs`)
      .on('broadcast', { event: 'job_update' }, ({ payload }) => {
        console.log('[realtime] Job update:', payload);
        callbacksRef.current.onJobUpdate?.(payload);
      })
      .on('broadcast', { event: 'job_progress' }, ({ payload }) => {
        console.log('[realtime] Job progress:', payload);
        callbacksRef.current.onJobProgress?.(payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[realtime] Subscribed to job updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[realtime] Failed to subscribe to job updates');
        }
      });

    // Subscribe to course updates via Broadcast
    const courseChannel = supabase
      .channel(`user:${userId}:courses`)
      .on('broadcast', { event: 'course_update' }, ({ payload }) => {
        console.log('[realtime] Course update:', payload);
        callbacksRef.current.onCourseUpdate?.(payload);
      })
      .on('broadcast', { event: 'module_complete' }, ({ payload }) => {
        console.log('[realtime] Module complete:', payload);
        callbacksRef.current.onModuleComplete?.(payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[realtime] Subscribed to course updates');
        }
      });

    // Also subscribe to direct Postgres changes on courses table as fallback
    const pgChannel = supabase
      .channel(`courses-changes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'api',
          table: 'courses',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[realtime] Course DB change:', payload);
          callbacksRef.current.onCourseUpdate?.({
            courseId: payload.new.id,
            status: payload.new.status,
            title: payload.new.title,
            ...payload.new,
          });
        }
      )
      .subscribe();

    channelsRef.current = [jobChannel, courseChannel, pgChannel];

    // Cleanup on unmount or userId change
    return () => {
      console.log('[realtime] Cleaning up subscriptions');
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [userId]);

  return null;
}

export default useRealtimeUpdates;
