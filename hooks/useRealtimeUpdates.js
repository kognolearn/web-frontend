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
 * @param {Function} callbacks.onNodeUpdate - Called when a node content is updated (shared courses)
 */
export function useRealtimeUpdates(userId, { onJobUpdate, onJobProgress, onCourseUpdate, onModuleComplete, onNodeUpdate } = {}) {
  const jobsChannelRef = useRef(null);
  const coursesChannelRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const retryAttemptRef = useRef(0);
  const callbacksRef = useRef({ onJobUpdate, onJobProgress, onCourseUpdate, onModuleComplete, onNodeUpdate });
  const debugRealtime = process.env.NEXT_PUBLIC_REALTIME_DEBUG === 'true';

  const logDebug = useCallback((...args) => {
    if (debugRealtime) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  }, [debugRealtime]);

  // Keep callbacks ref updated to avoid stale closures
  useEffect(() => {
    callbacksRef.current = { onJobUpdate, onJobProgress, onCourseUpdate, onModuleComplete, onNodeUpdate };
  }, [onJobUpdate, onJobProgress, onCourseUpdate, onModuleComplete, onNodeUpdate]);

  useEffect(() => {
    if (!userId) {
      return;
    }
    retryAttemptRef.current = 0;

    const cleanupChannel = () => {
      if (jobsChannelRef.current) {
        supabase.removeChannel(jobsChannelRef.current);
        jobsChannelRef.current = null;
      }
      if (coursesChannelRef.current) {
        supabase.removeChannel(coursesChannelRef.current);
        coursesChannelRef.current = null;
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

      const jobsChannel = supabase
        .channel(`user:${userId}:jobs`)
        .on('broadcast', { event: 'job_update' }, ({ payload }) => {
          logDebug('[realtime] Job update:', payload);
          callbacksRef.current.onJobUpdate?.(payload);
        })
        .on('broadcast', { event: 'job_progress' }, ({ payload }) => {
          logDebug('[realtime] Job progress:', payload);
          callbacksRef.current.onJobProgress?.(payload);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            retryAttemptRef.current = 0;
            logDebug('[realtime] Subscribed to job updates');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            scheduleReconnect();
          }
        });

      const coursesChannel = supabase
        .channel(`user:${userId}:courses`)
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
            logDebug('[realtime] Subscribed to course updates');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            scheduleReconnect();
          }
        });

      jobsChannelRef.current = jobsChannel;
      coursesChannelRef.current = coursesChannel;
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

/**
 * Hook for subscribing to course-level Realtime updates (for shared courses).
 * All users with access to the course will receive these updates.
 *
 * @param {string} courseId - Course ID to subscribe to updates for
 * @param {Object} callbacks - Callback functions for different update types
 * @param {Function} callbacks.onCourseUpdate - Called when course status changes
 * @param {Function} callbacks.onModuleComplete - Called when a module finishes generating
 * @param {Function} callbacks.onNodeUpdate - Called when a node content is updated
 */
export function useCourseRealtimeUpdates(courseId, { onCourseUpdate, onModuleComplete, onNodeUpdate } = {}) {
  const courseChannelRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const retryAttemptRef = useRef(0);
  const callbacksRef = useRef({ onCourseUpdate, onModuleComplete, onNodeUpdate });
  const debugRealtime = process.env.NEXT_PUBLIC_REALTIME_DEBUG === 'true';

  const logDebug = useCallback((...args) => {
    if (debugRealtime) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  }, [debugRealtime]);

  // Keep callbacks ref updated to avoid stale closures
  useEffect(() => {
    callbacksRef.current = { onCourseUpdate, onModuleComplete, onNodeUpdate };
  }, [onCourseUpdate, onModuleComplete, onNodeUpdate]);

  useEffect(() => {
    if (!courseId) {
      return;
    }
    retryAttemptRef.current = 0;

    const cleanupChannel = () => {
      if (courseChannelRef.current) {
        supabase.removeChannel(courseChannelRef.current);
        courseChannelRef.current = null;
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
      logDebug('[realtime] Course channel reconnect scheduled in', delay, 'ms');
    };

    const setupChannel = () => {
      cleanupChannel();

      const courseChannel = supabase
        .channel(`course:${courseId}:updates`)
        .on('broadcast', { event: 'course_update' }, ({ payload }) => {
          logDebug('[realtime] Shared course update:', payload);
          callbacksRef.current.onCourseUpdate?.(payload);
        })
        .on('broadcast', { event: 'module_complete' }, ({ payload }) => {
          logDebug('[realtime] Shared course module complete:', payload);
          callbacksRef.current.onModuleComplete?.(payload);
        })
        .on('broadcast', { event: 'node_update' }, ({ payload }) => {
          logDebug('[realtime] Shared course node update:', payload);
          callbacksRef.current.onNodeUpdate?.(payload);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            retryAttemptRef.current = 0;
            logDebug('[realtime] Subscribed to course updates for', courseId);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            scheduleReconnect();
          }
        });

      courseChannelRef.current = courseChannel;
    };

    setupChannel();

    // Cleanup on unmount or courseId change
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      cleanupChannel();
    };
  }, [courseId, logDebug]);

  return null;
}

export default useRealtimeUpdates;
