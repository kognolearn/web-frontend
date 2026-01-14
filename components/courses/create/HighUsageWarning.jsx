"use client";

import { motion, AnimatePresence } from "framer-motion";

/**
 * High usage warning banner shown during course generation when server capacity is high
 * @param {object} props
 * @param {boolean} props.isVisible - Whether to show the warning
 * @param {number} props.creditUtilization - Server capacity percentage (0-100)
 * @param {number|null} props.estimatedWaitMinutes - Estimated wait time in minutes
 * @param {function} props.onDismiss - Callback when user dismisses the warning
 */
export default function HighUsageWarning({
  isVisible = false,
  creditUtilization = 0,
  estimatedWaitMinutes = null,
  onDismiss = null,
}) {
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mb-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-amber-600 dark:text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-amber-900 dark:text-amber-100">
              High Demand
            </h3>
            <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
              We&apos;re experiencing high usage right now. Your course may take
              longer to generate than usual.
              {estimatedWaitMinutes && (
                <span className="block mt-1 font-medium">
                  Estimated wait: ~{estimatedWaitMinutes} minutes
                </span>
              )}
            </p>
            {creditUtilization > 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                Server capacity: {creditUtilization}% in use
              </p>
            )}
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="flex-shrink-0 text-amber-400 hover:text-amber-600 dark:hover:text-amber-200"
              aria-label="Dismiss"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
