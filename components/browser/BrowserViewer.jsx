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
  const [userInputText, setUserInputText] = useState("");
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const viewportRef = useRef(null);

  // Connect to WebSocket
  useEffect(() => {
    if (!sessionId || !streamUrl || !userId || !authToken) return;

    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}${streamUrl}`;

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

      case "error":
        setError(data.message);
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
    if (!isPaused && !isWaitingForUser) return;
    if (!viewportRef.current) return;

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

  const handleSendText = useCallback(() => {
    const text = userInputText.trim();
    if (!text) return;
    sendUserType(text);
    setUserInputText("");
  }, [sendUserType, userInputText]);

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
          {!isWaitingForUser && (
            <>
              {isPaused ? (
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
            </>
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

      {/* Browser viewport */}
      <div
        ref={viewportRef}
        onClick={handleViewportClick}
        className={`relative aspect-video bg-black min-h-[400px] ${
          isPaused || isWaitingForUser ? "cursor-crosshair" : ""
        }`}
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

        {/* Pause overlay (user-initiated) */}
        {isPaused && !isWaitingForUser && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-[var(--surface-1)] px-6 py-4 rounded-xl shadow-xl text-center max-w-md">
              <h3 className="font-semibold text-lg mb-2">Browser Paused</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                You can now interact with the page (login, solve CAPTCHA,
                navigate, etc.)
              </p>
              <button
                onClick={handleResume}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Resume Agent
              </button>
            </div>
          </div>
        )}

        {/* Agent request overlay (agent-initiated) */}
        {isWaitingForUser && userActionRequest && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-[var(--surface-1)] px-6 py-5 rounded-xl shadow-xl text-center max-w-md mx-4">
              <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Agent needs your help</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                {userActionRequest.instructions}
              </p>
              <button
                onClick={handleUserActionComplete}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                I&apos;ve completed this - Resume Agent
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer with tips */}
      <div className="px-4 py-2 bg-[var(--surface-muted)] border-t border-[var(--border)]">
        <p className="text-xs text-[var(--muted-foreground)]">
          {isWaitingForUser
            ? "Complete the action above. Click the browser to focus a field, then type below."
            : isPaused
            ? "Click the browser to focus a field, type below, then resume the agent."
            : "The agent is browsing. Click 'Pause' to interact with the page yourself."}
        </p>
        {(isPaused || isWaitingForUser) && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={userInputText}
              onChange={(event) => setUserInputText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSendText();
                }
              }}
              placeholder="Type text into focused field"
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-1)]"
            />
            <button
              type="button"
              onClick={handleSendText}
              className="px-3 py-1.5 text-xs bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
