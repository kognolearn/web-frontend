"use client";

import { useState, useCallback } from "react";

/**
 * TopicSearchOptions - Toggle controls for topic generation modes.
 *
 * Provides three options:
 * 1. Agent Search (default on) - AI searches the web for course content
 * 2. Browser Agent (requires Agent Search) - AI controls a browser you can see and interact with
 * 3. Manual Text - Always available, paste syllabus alongside other options
 */
export default function TopicSearchOptions({
  agentSearchEnabled,
  setAgentSearchEnabled,
  browserAgentEnabled,
  setBrowserAgentEnabled,
  disabled = false,
  className = "",
}) {
  const [showBrowserInfo, setShowBrowserInfo] = useState(false);

  const handleAgentSearchToggle = useCallback(
    (enabled) => {
      setAgentSearchEnabled(enabled);
      // If disabling agent search, also disable browser agent
      if (!enabled) {
        setBrowserAgentEnabled(false);
      }
    },
    [setAgentSearchEnabled, setBrowserAgentEnabled]
  );

  const handleBrowserAgentToggle = useCallback(
    (enabled) => {
      // Browser agent requires agent search
      if (enabled && !agentSearchEnabled) {
        setAgentSearchEnabled(true);
      }
      setBrowserAgentEnabled(enabled);
    },
    [agentSearchEnabled, setAgentSearchEnabled, setBrowserAgentEnabled]
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Agent Search Toggle */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={agentSearchEnabled}
          disabled={disabled}
          onClick={() => handleAgentSearchToggle(!agentSearchEnabled)}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
            border-2 border-transparent transition-colors duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2
            ${agentSearchEnabled ? "bg-[var(--primary)]" : "bg-[var(--surface-muted)]"}
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full
              bg-white shadow ring-0 transition duration-200 ease-in-out
              ${agentSearchEnabled ? "translate-x-5" : "translate-x-0"}
            `}
          />
        </button>
        <div className="flex-1">
          <label className="text-sm font-medium">Agent Search</label>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            AI automatically searches the web for syllabi, schedules, and course content.
          </p>
        </div>
      </div>

      {/* Browser Agent Toggle */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={browserAgentEnabled}
          disabled={disabled || !agentSearchEnabled}
          onClick={() => handleBrowserAgentToggle(!browserAgentEnabled)}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
            border-2 border-transparent transition-colors duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2
            ${browserAgentEnabled ? "bg-[var(--primary)]" : "bg-[var(--surface-muted)]"}
            ${disabled || !agentSearchEnabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full
              bg-white shadow ring-0 transition duration-200 ease-in-out
              ${browserAgentEnabled ? "translate-x-5" : "translate-x-0"}
            `}
          />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Browser Agent</label>
            <button
              type="button"
              onClick={() => setShowBrowserInfo(!showBrowserInfo)}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <svg
                className="w-4 h-4"
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
            </button>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            {!agentSearchEnabled ? (
              <span className="text-amber-600">Requires Agent Search to be enabled</span>
            ) : (
              "AI controls a browser you can see. Pause to log in or help navigate."
            )}
          </p>
        </div>
      </div>

      {/* Browser Agent Info Dropdown */}
      {showBrowserInfo && (
        <div className="ml-14 p-3 bg-[var(--surface-muted)] rounded-lg text-xs space-y-2">
          <p className="font-medium">How Browser Agent works:</p>
          <ul className="list-disc list-inside space-y-1 text-[var(--muted-foreground)]">
            <li>AI navigates a real browser that you can watch live</li>
            <li>Click &quot;Pause&quot; anytime to take control (login, solve CAPTCHA)</li>
            <li>AI may ask for your help if it encounters a login page</li>
            <li>Click &quot;Resume&quot; to let the AI continue</li>
            <li>Great for accessing university portals and password-protected content</li>
          </ul>
          <p className="text-amber-600">
            Note: Browser sessions expire after 10 minutes.
          </p>
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <span className="text-xs text-[var(--muted-foreground)]">
          {agentSearchEnabled
            ? "You can also add manual text below"
            : "Paste your syllabus or course content below"}
        </span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>
    </div>
  );
}
