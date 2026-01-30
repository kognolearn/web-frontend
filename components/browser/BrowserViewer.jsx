"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * BrowserViewer - Live browser stream display with pause/resume controls.
 *
 * Shows a real-time view of the server-side Puppeteer browser that the agent is controlling.
 * Users can pause the agent to interact (login, CAPTCHA), then resume.
 */
export default function BrowserViewer({
  sessionId,
  streamUrl,
  userId,
  authToken,
  onPause,
  onResume,
  onClose,
  onUserActionComplete,
  onJobStarted,
  className = "",
}) {
  const VIEWPORT_WIDTH = 1280;
  const VIEWPORT_HEIGHT = 800;

  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isWaitingForUser, setIsWaitingForUser] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [lastAction, setLastAction] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [userActionRequest, setUserActionRequest] = useState(null);
  const [error, setError] = useState(null);
  const [jobStarted, setJobStarted] = useState(false);
  const [jobStartRequested, setJobStartRequested] = useState(false);
  const [agentInstructions, setAgentInstructions] = useState("");
  const [isViewportFocused, setIsViewportFocused] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const viewportRef = useRef(null);

  useEffect(() => {
    setJobStarted(false);
    setJobStartRequested(false);
    setAgentInstructions("");
  }, [sessionId, streamUrl]);

  // Connect to WebSocket
  useEffect(() => {
    if (!sessionId || !streamUrl || !userId || !authToken) return;

    const resolveWebSocketUrl = () => {
      if (!streamUrl) return null;

      // If the stream URL already includes a ws(s) protocol, use it directly.
      if (/^wss?:\/\//i.test(streamUrl)) {
        return streamUrl;
      }

      // If the stream URL is http(s), convert to ws(s).
      if (/^https?:\/\//i.test(streamUrl)) {
        const absolute = new URL(streamUrl);
        absolute.protocol = absolute.protocol === "https:" ? "wss:" : "ws:";
        return absolute.toString();
      }

      // Prefer backend base URL when provided (frontend and backend are often different hosts).
      const backendBase = process.env.NEXT_PUBLIC_BACKEND_API_URL;
      if (backendBase) {
        try {
          const baseUrl = new URL(backendBase);
          baseUrl.protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
          return new URL(streamUrl, baseUrl).toString();
        } catch (error) {
          console.warn("[BrowserViewer] Invalid NEXT_PUBLIC_BACKEND_API_URL:", backendBase);
        }
      }

      // Fallback to current origin.
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${protocol}//${window.location.host}${streamUrl}`;
    };

    const connect = () => {
      const wsUrl = resolveWebSocketUrl();
      if (!wsUrl) return;

      console.log(`[BrowserViewer] Connecting to ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[BrowserViewer] WebSocket connected");
        setError(null);

        // Send authentication
        ws.send(
          JSON.stringify({
            type: "auth",
            token: authToken,
            userId,
          })
        );
      };

      ws.onclose = (event) => {
        console.log("[BrowserViewer] WebSocket closed", event.code);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt reconnect if not intentionally closed
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(connect, 2000);
        }
      };

      ws.onerror = (event) => {
        console.error("[BrowserViewer] WebSocket error", event);
        setError("Connection error. Retrying...");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (err) {
          console.error("[BrowserViewer] Failed to parse message:", err);
        }
      };
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000);
        wsRef.current = null;
      }
    };
  }, [sessionId, streamUrl, authToken, userId]);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case "auth_required":
        // Already handled in onopen
        break;

      case "auth_result":
        if (data.success) {
          setIsConnected(true);
          setError(null);
        } else {
          setError(data.error || "Authentication failed");
        }
        break;

      case "screenshot":
        setScreenshot(data.image);
        if (data.url) setCurrentUrl(data.url);
        break;

      case "state":
        setIsPaused(data.state === "paused");
        setIsWaitingForUser(data.state === "waiting_for_user");
        break;

      case "action":
        setLastAction(data.message);
        // Clear action after 3 seconds
        setTimeout(() => setLastAction(""), 3000);
        break;

      case "user_action_request":
        setUserActionRequest({
          reason: data.reason,
          instructions: data.instructions,
        });
        setIsWaitingForUser(true);
        break;

      case "job_started":
        if (data.jobId) {
          setJobStarted(true);
          setJobStartRequested(false);
          onJobStarted?.({
            jobId: data.jobId,
            statusUrl: data.statusUrl,
            sessionId: data.sessionId,
          });
        }
        break;

      case "job_error":
        setError(data.message || "Failed to start browser job");
        setJobStartRequested(false);
        break;

      case "error":
        setError(data.message);
        break;

      case "command_result":
        if (data.command === "start_job" && data.success === false) {
          setError(data.error || "Unable to start browser agent");
          setJobStartRequested(false);
        }
        break;

      default:
        console.log("[BrowserViewer] Unknown message type:", data.type);
    }
  }, []);

  // Pause handler
  const handlePause = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "pause" }));
    }
    onPause?.();
  }, [onPause]);

  // Resume handler
  const handleResume = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "resume" }));
    }
    setUserActionRequest(null);
    onResume?.();
  }, [onResume]);

  // User action complete handler
  const handleUserActionComplete = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "user_action_complete" }));
    }
    setUserActionRequest(null);
    setIsWaitingForUser(false);
    onUserActionComplete?.();
  }, [onUserActionComplete]);

  const handleStartJob = useCallback(() => {
    const instructions = agentInstructions.trim();
    if (!instructions) {
      setError(
        "Please tell the agent where to go (e.g., a course page or portal URL) before starting."
      );
      return;
    }
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError("Waiting for browser connection. Please try again in a moment.");
      return;
    }
    setError(null);
    setJobStartRequested(true);
    wsRef.current.send(
      JSON.stringify({
        type: "start_job",
        instructions,
      })
    );
  }, [agentInstructions]);

  const sendUserClick = useCallback((x, y) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "user_click", x, y }));
    }
  }, []);

  const sendUserType = useCallback((text) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "user_type", text }));
    }
  }, []);

  const handleViewportClick = useCallback((event) => {
    if (!viewportRef.current) return;

    if (isPaused || isWaitingForUser) {
      viewportRef.current.focus();
    } else {
      return;
    }

    const rect = viewportRef.current.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;

    const scale = Math.min(containerWidth / VIEWPORT_WIDTH, containerHeight / VIEWPORT_HEIGHT);
    const displayWidth = VIEWPORT_WIDTH * scale;
    const displayHeight = VIEWPORT_HEIGHT * scale;
    const offsetX = (containerWidth - displayWidth) / 2;
    const offsetY = (containerHeight - displayHeight) / 2;

    const clickX = (event.clientX - rect.left - offsetX) / scale;
    const clickY = (event.clientY - rect.top - offsetY) / scale;

    if (
      clickX < 0 ||
      clickY < 0 ||
      clickX > VIEWPORT_WIDTH ||
      clickY > VIEWPORT_HEIGHT
    ) {
      return;
    }

    sendUserClick(Math.round(clickX), Math.round(clickY));
  }, [isPaused, isWaitingForUser, sendUserClick, VIEWPORT_WIDTH, VIEWPORT_HEIGHT]);

  const handleViewportFocus = useCallback(() => {
    setIsViewportFocused(true);
  }, []);

  const handleViewportBlur = useCallback(() => {
    setIsViewportFocused(false);
  }, []);

  const handleViewportKeyDown = useCallback(
    (event) => {
      if (!isPaused && !isWaitingForUser) return;
      if (!isViewportFocused) return;

      if (event.key === "Escape") {
        event.preventDefault();
        viewportRef.current?.blur();
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        sendUserType("\n");
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        sendUserType("\t");
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        sendUserType("\b");
        return;
      }

      if (event.key.length === 1) {
        event.preventDefault();
        sendUserType(event.key);
      }
    },
    [isPaused, isWaitingForUser, isViewportFocused, sendUserType]
  );

  const handleViewportPaste = useCallback(
    (event) => {
      if (!isPaused && !isWaitingForUser) return;
      if (!isViewportFocused) return;
      const text = event.clipboardData?.getData("text");
      if (text) {
        event.preventDefault();
        sendUserType(text);
      }
    },
    [isPaused, isWaitingForUser, isViewportFocused, sendUserType]
  );

  return (
    <div
      className={`flex flex-col bg-[var(--surface-1)] rounded-xl border border-[var(--border)] overflow-hidden shadow-lg ${className}`}
    >
      {/* Header with controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-muted)]">
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm font-medium">Browser Agent</span>
          {isPaused && !isWaitingForUser && (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-600 text-xs rounded-full">
              Paused - You can interact
            </span>
          )}
          {isWaitingForUser && (
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-600 text-xs rounded-full">
              Waiting for you
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isWaitingForUser ? (
            <button
              onClick={handleUserActionComplete}
              className="px-3 py-1.5 bg-[var(--primary)] text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
            >
              I&apos;m done - Resume
            </button>
          ) : isPaused ? (
            <button
              onClick={handleResume}
              className="px-3 py-1.5 bg-[var(--primary)] text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
            >
              Resume Agent
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="px-3 py-1.5 bg-amber-500 text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
            >
              Pause to Interact
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            title="Close browser viewer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* URL bar */}
      <div className="px-4 py-2 bg-[var(--surface-1)] border-b border-[var(--border)]">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-muted)] rounded-lg">
          <svg
            className="w-4 h-4 text-[var(--muted-foreground)] flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
          <span className="text-sm text-[var(--muted-foreground)] truncate">
            {currentUrl || "Waiting for navigation..."}
          </span>
        </div>
      </div>

      {(isPaused || isWaitingForUser) && (
        <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--surface-2)]/60">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              {isWaitingForUser ? (
                <>
                  <span className="font-semibold text-[var(--foreground)]">
                    Agent needs your help:
                  </span>{" "}
                  {userActionRequest?.instructions || "Complete the requested action in the page."}
                </>
              ) : (
                "Paused. Click inside the browser to focus and type directly. Resume when done."
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  isViewportFocused
                    ? "bg-emerald-500/15 text-emerald-600"
                    : "bg-[var(--surface-muted)] text-[var(--muted-foreground)]"
                }`}
              >
                {isViewportFocused ? "Keyboard control active" : "Click browser to focus"}
              </span>
              {isWaitingForUser && (
                <button
                  onClick={handleUserActionComplete}
                  className="px-3 py-1.5 text-xs bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Resume Agent
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!jobStarted && (
        <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-2)]/70 space-y-2">
          <div>
            <label className="text-sm font-semibold">
              Where should the agent go to find your course?
            </label>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              We can reach login‑blocked links as long as you log in. We don&apos;t see or save any of your information.
            </p>
          </div>
          <textarea
            rows={3}
            value={agentInstructions}
            onChange={(event) => {
              setAgentInstructions(event.target.value);
              if (error) {
                setError(null);
              }
            }}
            placeholder="Paste the course portal link, LMS page, or any hints about where the syllabus lives..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-[var(--foreground)] transition focus:border-[var(--primary)] focus:outline-none focus:ring-3 focus:ring-[var(--primary)]/20 resize-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleStartJob}
              disabled={!isConnected || jobStartRequested || !agentInstructions.trim()}
              className="px-3 py-1.5 bg-[var(--primary)] text-white text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {jobStartRequested ? "Starting…" : "Start Browser Agent"}
            </button>
            {!isConnected && (
              <span className="text-xs text-[var(--muted-foreground)]">
                Connecting to browser…
              </span>
            )}
          </div>
        </div>
      )}

      {/* Browser viewport */}
      <div
        ref={viewportRef}
        onClick={handleViewportClick}
        onFocus={handleViewportFocus}
        onBlur={handleViewportBlur}
        onKeyDown={handleViewportKeyDown}
        onPaste={handleViewportPaste}
        tabIndex={0}
        role="application"
        aria-label="Browser view"
        className={`relative aspect-video bg-black min-h-[400px] outline-none ${
          isPaused || isWaitingForUser ? "cursor-crosshair" : ""
        } ${isViewportFocused ? "ring-2 ring-[var(--primary)]" : ""}`}
      >
        {screenshot ? (
          <img
            src={`data:image/jpeg;base64,${screenshot}`}
            alt="Browser view"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--muted-foreground)]">
            <div className="flex flex-col items-center gap-2">
              {error ? (
                <>
                  <svg
                    className="w-8 h-8 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span className="text-sm text-red-500">{error}</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-8 h-8 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span className="text-sm">Connecting to browser...</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Agent action overlay */}
        <AnimatePresence>
          {lastAction && !isPaused && !isWaitingForUser && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-4 left-4 right-4 px-4 py-2 bg-black/80 text-white text-sm rounded-lg"
            >
              <span className="font-medium">Agent:</span> {lastAction}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer with tips */}
      <div className="px-4 py-2 bg-[var(--surface-muted)] border-t border-[var(--border)]">
        <p className="text-xs text-[var(--muted-foreground)]">
          {isWaitingForUser
            ? "Complete the action in the page. Click the browser to focus and type directly."
            : isPaused
            ? "Click the browser to focus and type directly, then resume the agent."
            : "The agent is browsing. Click 'Pause to Interact' to take control."}
        </p>
      </div>
    </div>
  );
}
