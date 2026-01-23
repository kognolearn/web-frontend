"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Hook to poll queue status for high usage warnings
 * @param {object} options
 * @param {boolean} options.enabled - Whether to poll (default true)
 * @param {number} options.pollInterval - Polling interval in ms (default 30000)
 * @returns {{ isHighUsage: boolean, creditUtilization: number, estimatedWaitMinutes: number|null, isLoading: boolean, refresh: function }}
 */
export function useQueueStatus({ enabled = true, pollInterval = 30000 } = {}) {
  const [status, setStatus] = useState({
    isHighUsage: false,
    creditUtilization: 0,
    estimatedWaitMinutes: null,
    isLoading: true,
  });

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/queue/status", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStatus({
          isHighUsage: data.isHighUsage ?? false,
          creditUtilization: data.creditUtilization ?? 0,
          estimatedWaitMinutes: data.estimatedWaitMinutes ?? null,
          isLoading: false,
        });
      } else {
        setStatus((prev) => ({ ...prev, isLoading: false }));
      }
    } catch {
      setStatus((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setStatus((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    // Initial fetch
    fetchStatus();

    // Set up polling
    const interval = setInterval(fetchStatus, pollInterval);
    return () => clearInterval(interval);
  }, [enabled, pollInterval, fetchStatus]);

  return { ...status, refresh: fetchStatus };
}
