"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Modal for editing a past message in the conversation.
 * Creating a branch instead of overwriting the original response.
 */
export default function EditMessageModal({
  isOpen,
  onClose,
  originalMessage,
  stepConfig,
  onCreateBranch,
}) {
  const [editedContent, setEditedContent] = useState("");
  const [selectedOption, setSelectedOption] = useState(null);

  // Initialize content when modal opens
  useEffect(() => {
    if (isOpen && originalMessage) {
      if (stepConfig?.inputType === "options") {
        // For options, set the selected option
        setSelectedOption(originalMessage.response);
      } else {
        // For text inputs, set the content
        setEditedContent(originalMessage.response || originalMessage.content || "");
      }
    }
  }, [isOpen, originalMessage, stepConfig]);

  if (!isOpen || !originalMessage) return null;

  const inputType = stepConfig?.inputType;
  const isOptionsInput = inputType === "options";
  const isTextInput = ["text", "textarea", "course_chat", "text_confirm"].includes(inputType);

  const handleSubmit = () => {
    if (isOptionsInput && selectedOption) {
      const option = stepConfig.options?.find((opt) => opt.id === selectedOption);
      onCreateBranch(selectedOption, option?.label || selectedOption);
    } else if (isTextInput && editedContent.trim()) {
      onCreateBranch(editedContent.trim(), editedContent.trim());
    }
  };

  const canSubmit = isOptionsInput
    ? selectedOption && selectedOption !== originalMessage.response
    : editedContent.trim() && editedContent.trim() !== originalMessage.response;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-[var(--surface-1)] rounded-2xl shadow-xl max-w-md w-full pointer-events-auto border border-[var(--border)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">
                    Edit Response
                  </h3>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-[var(--muted-foreground)]"
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

              {/* Warning */}
              <div className="px-6 pb-4">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5">
                  <div className="flex gap-2.5">
                    <svg
                      className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
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
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      This will create a new branch. You can switch between the
                      original and new paths at any time.
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-4">
                {isTextInput && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
                      Your response
                    </label>
                    {inputType === "textarea" ? (
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        placeholder={stepConfig?.placeholder || "Enter your response..."}
                        rows={4}
                        className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 resize-none"
                      />
                    ) : (
                      <input
                        type="text"
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        placeholder={stepConfig?.placeholder || "Enter your response..."}
                        className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
                      />
                    )}
                  </div>
                )}

                {isOptionsInput && stepConfig?.options && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
                      Select an option
                    </label>
                    {stepConfig.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedOption(option.id)}
                        className={`w-full p-4 rounded-xl border text-left transition-all ${
                          selectedOption === option.id
                            ? "border-[var(--primary)] bg-[var(--primary)]/10"
                            : "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--primary)]/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedOption === option.id
                                ? "border-[var(--primary)]"
                                : "border-[var(--muted-foreground)]"
                            }`}
                          >
                            {selectedOption === option.id && (
                              <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-[var(--foreground)]">
                              {option.label}
                            </div>
                            {option.description && (
                              <div className="text-sm text-[var(--muted-foreground)]">
                                {option.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 border border-[var(--border)] rounded-xl text-[var(--foreground)] font-medium hover:bg-[var(--surface-2)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="flex-1 py-3 px-4 bg-[var(--primary)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  Create Branch
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
