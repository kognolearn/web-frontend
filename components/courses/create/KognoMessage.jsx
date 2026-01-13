"use client";

import { motion } from "framer-motion";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import ReasoningLoader from "./ReasoningLoader";

/**
 * Typing indicator with bouncing dots
 */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-2" role="status" aria-live="polite">
      <div className="flex gap-1">
        <div
          className="h-1.5 w-1.5 rounded-full bg-[var(--muted-foreground)] animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <div
          className="h-1.5 w-1.5 rounded-full bg-[var(--muted-foreground)] animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <div
          className="h-1.5 w-1.5 rounded-full bg-[var(--muted-foreground)] animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
      <span className="text-xs text-[var(--muted-foreground)]">Thinking...</span>
    </div>
  );
}

/**
 * Option card for selecting choices
 */
function OptionCard({ option, onSelect, isSelected, disabled }) {
  const iconMap = {
    book: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
    lightning: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
    upload: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
        />
      </svg>
    ),
    text: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    both: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
    skip: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 5l7 7-7 7M5 5l7 7-7 7"
        />
      </svg>
    ),
    exam: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
  };

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(option.id)}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={`
        w-full text-left p-4 rounded-xl border transition-all relative
        ${
          isSelected
            ? "border-[var(--primary)] bg-[var(--primary)]/10"
            : option.recommended
            ? "border-[var(--primary)]/60 bg-[var(--surface-1)] hover:border-[var(--primary)] hover:bg-[var(--surface-2)]"
            : "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--primary)]/50 hover:bg-[var(--surface-2)]"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {/* Recommended badge */}
      {option.recommended && (
        <div className="absolute -top-2 left-4 px-2 py-0.5 bg-[var(--primary)] text-white text-[10px] font-semibold uppercase rounded-full tracking-wide">
          Recommended
        </div>
      )}
      <div className="flex items-start gap-3">
        <div
          className={`
            flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
            ${isSelected ? "bg-[var(--primary)] text-white" : option.recommended ? "bg-[var(--primary)]/20 text-[var(--primary)]" : "bg-[var(--surface-muted)] text-[var(--muted-foreground)]"}
          `}
        >
          {iconMap[option.icon] || iconMap.text}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-[var(--foreground)]">{option.label}</div>
          {option.description && (
            <div className="text-sm text-[var(--muted-foreground)] mt-0.5">{option.description}</div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

/**
 * Loading spinner for actions
 */
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 border-2 border-[var(--border)] rounded-full" />
        <div className="absolute inset-0 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

/**
 * Kogno (AI assistant) message bubble
 */
export default function KognoMessage({
  content,
  isTyping = false,
  isLoading = false,
  showReasoning = false,
  reasoningCompleted = false,
  options = [],
  onOptionSelect,
  selectedOption,
  skippable = false,
  skipLabel = "Skip",
  onSkip,
  confirmLabel,
  onConfirm,
  showTopicEditor = false,
  showConfidenceEditor = false,
  showProgress = false,
  progressPercent = 0,
  topicEditor,
  confidenceEditor,
  superseded = false,
  children,
}) {
  const messageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" },
    },
  };

  if (superseded) {
    return (
      <motion.div
        variants={messageVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-start opacity-50"
      >
        <div className="relative max-w-[85%] md:max-w-[75%] bg-[var(--surface-1)] border border-[var(--border)] text-[var(--muted-foreground)] rounded-2xl rounded-bl-md shadow-sm px-4 py-3 line-through">
          <div className="text-[14px] leading-[1.6]">{content}</div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-start"
    >
      <div className="relative max-w-[85%] md:max-w-[75%] bg-[var(--surface-1)] border border-[var(--border)] text-[var(--foreground)] rounded-2xl rounded-bl-md shadow-sm px-4 py-3">
        {isTyping ? (
          <TypingIndicator />
        ) : (
          <>
            {/* Message content */}
            <div className="text-[14px] leading-[1.6]">
              <MarkdownRenderer content={content} />
            </div>

            {/* Options */}
            {options.length > 0 && (
              <div className="mt-4 space-y-2">
                {options.map((option) => (
                  <OptionCard
                    key={option.id}
                    option={option}
                    onSelect={onOptionSelect}
                    isSelected={selectedOption === option.id}
                    disabled={isLoading}
                  />
                ))}
              </div>
            )}

            {/* Topic editor slot */}
            {showTopicEditor && topicEditor && <div className="mt-4">{topicEditor}</div>}

            {/* Confidence editor slot */}
            {showConfidenceEditor && confidenceEditor && <div className="mt-4">{confidenceEditor}</div>}

            {/* Progress bar */}
            {showProgress && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)] mb-1">
                  <span>Creating your course...</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-2 bg-[var(--surface-muted)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--primary)] transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Loading indicator (hide when showing reasoning loader) */}
            {isLoading && !showReasoning && !reasoningCompleted && <LoadingSpinner />}

            {/* Reasoning loader for topic generation */}
            {(showReasoning || reasoningCompleted) && (
              <ReasoningLoader className="mt-4" completed={reasoningCompleted} />
            )}

            {/* Action buttons */}
            {(confirmLabel || skippable) && !isLoading && (
              <div className="mt-4 flex items-center gap-2">
                {confirmLabel && (
                  <button
                    type="button"
                    onClick={onConfirm}
                    className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    {confirmLabel}
                  </button>
                )}
                {skippable && (
                  <button
                    type="button"
                    onClick={onSkip}
                    className="px-4 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    {skipLabel}
                  </button>
                )}
              </div>
            )}

            {/* Additional children */}
            {children}
          </>
        )}
      </div>
    </motion.div>
  );
}
