import { useState, useEffect, useCallback, useRef } from "react";
import { authFetch } from "@/lib/api";

/**
 * useBrowserSession - Hook for managing browser session state and WebSocket connection.
 *
 * Provides methods to create, pause, resume, and end browser sessions,
 * as well as callbacks for screenshot, action, and state updates.
 */
export function useBrowserSession({
  onScreenshot,
  onAction,
  onStateChange,
  onUserActionRequest,
  onError,
} = {}) {
  const [sessionId, setSessionId] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isWaitingForUser, setIsWaitingForUser] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [error, setError] = useState(null);
  const [userActionRequest, setUserActionRequest] = useState(null);

  // Refs for callbacks to avoid stale closures
  const callbacksRef = useRef({
    onScreenshot,
    onAction,
    onStateChange,
    onUserActionRequest,
    onError,
  });

  useEffect(() => {
    callbacksRef.current = {
      onScreenshot,
      onAction,
      onStateChange,
      onUserActionRequest,
      onError,
    };
  }, [onScreenshot, onAction, onStateChange, onUserActionRequest, onError]);

  /**
   * Create a new browser session.
   */
  const createSession = useCallback(async (options = {}) => {
    try {
      setError(null);

      const res = await authFetch("/api/browser-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errorMessage = data.error || "Failed to create browser session";
        setError(errorMessage);
        callbacksRef.current.onError?.(errorMessage);
        throw new Error(errorMessage);
      }

      const data = await res.json();
      setSessionId(data.sessionId);
      setStreamUrl(data.streamUrl);

      return data;
    } catch (err) {
      const errorMessage = err.message || "Failed to create browser session";
      setError(errorMessage);
      callbacksRef.current.onError?.(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Get session status.
   */
  const getStatus = useCallback(async () => {
    if (!sessionId) return null;

    try {
      const res = await authFetch(`/api/browser-session/${sessionId}`);
      if (!res.ok) {
        return null;
      }
      return await res.json();
    } catch {
      return null;
    }
  }, [sessionId]);

  /**
   * Pause the agent.
   */
  const pause = useCallback(async () => {
    if (!sessionId) return { success: false, error: "No session" };

    try {
      const res = await authFetch(`/api/browser-session/${sessionId}/pause`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, error: data.error || "Failed to pause" };
      }

      const data = await res.json();
      setIsPaused(true);
      callbacksRef.current.onStateChange?.({ state: "paused" });
      return { success: true, state: data.state };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [sessionId]);

  /**
   * Resume the agent.
   */
  const resume = useCallback(async () => {
    if (!sessionId) return { success: false, error: "No session" };

    try {
      const res = await authFetch(`/api/browser-session/${sessionId}/resume`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, error: data.error || "Failed to resume" };
      }

      const data = await res.json();
      setIsPaused(false);
      setIsWaitingForUser(false);
      setUserActionRequest(null);
      callbacksRef.current.onStateChange?.({ state: "running" });
      return { success: true, state: data.state };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [sessionId]);

  /**
   * Signal that user has completed the requested action.
   */
  const completeUserAction = useCallback(async () => {
    if (!sessionId) return { success: false, error: "No session" };

    try {
      const res = await authFetch(
        `/api/browser-session/${sessionId}/user-action-complete`,
        { method: "POST" }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, error: data.error || "Failed to complete action" };
      }

      const data = await res.json();
      setIsWaitingForUser(false);
      setUserActionRequest(null);
      callbacksRef.current.onStateChange?.({ state: "running" });
      return { success: true, state: data.state };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [sessionId]);

  /**
   * End the browser session.
   */
  const endSession = useCallback(async () => {
    if (!sessionId) return { success: false };

    try {
      await authFetch(`/api/browser-session/${sessionId}`, {
        method: "DELETE",
      });

      setSessionId(null);
      setStreamUrl(null);
      setIsConnected(false);
      setIsPaused(false);
      setIsWaitingForUser(false);
      setCurrentUrl("");
      setError(null);
      setUserActionRequest(null);

      return { success: true };
    } catch (err) {
      console.error("[useBrowserSession] Failed to end session:", err);
      return { success: false, error: err.message };
    }
  }, [sessionId]);

  /**
   * Set session from external source (e.g., from API response).
   */
  const setSessionFromResponse = useCallback((browserSession) => {
    if (browserSession) {
      setSessionId(browserSession.sessionId);
      setStreamUrl(browserSession.streamUrl);
    }
  }, []);

  /**
   * Handle messages from the BrowserViewer component.
   */
  const handleScreenshot = useCallback((data) => {
    if (data.url) setCurrentUrl(data.url);
    callbacksRef.current.onScreenshot?.(data);
  }, []);

  const handleStateChange = useCallback((data) => {
    setIsPaused(data.state === "paused");
    setIsWaitingForUser(data.state === "waiting_for_user");
    callbacksRef.current.onStateChange?.(data);
  }, []);

  const handleUserActionRequest = useCallback((data) => {
    setUserActionRequest(data);
    setIsWaitingForUser(true);
    callbacksRef.current.onUserActionRequest?.(data);
  }, []);

  const handleAction = useCallback((data) => {
    callbacksRef.current.onAction?.(data);
  }, []);

  const handleConnection = useCallback((connected) => {
    setIsConnected(connected);
  }, []);

  return {
    // State
    sessionId,
    streamUrl,
    isConnected,
    isPaused,
    isWaitingForUser,
    currentUrl,
    error,
    userActionRequest,

    // Actions
    createSession,
    getStatus,
    pause,
    resume,
    completeUserAction,
    endSession,
    setSessionFromResponse,

    // Handlers for BrowserViewer
    handleScreenshot,
    handleStateChange,
    handleUserActionRequest,
    handleAction,
    handleConnection,
  };
}

export default useBrowserSession;
