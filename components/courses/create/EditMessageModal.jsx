"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Modal for editing a past message in the conversation.
 */
export default function EditMessageModal({
  isOpen,
  onClose,
  originalMessage,
  stepConfig,
  onSaveEdit,
}) {
  const [editedContent, setEditedContent] = useState("");
  const [selectedOption, setSelectedOption] = useState(null);
  const [editedFiles, setEditedFiles] = useState([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Initialize content when modal opens
  useEffect(() => {
    if (isOpen && originalMessage) {
      if (stepConfig?.inputType === "options") {
        // For options, set the selected option
        setSelectedOption(originalMessage.response);
      } else if (stepConfig?.inputType === "content_with_attachments") {
        // For content with attachments, set both text and files
        setEditedContent(originalMessage.response || originalMessage.content || "");
        setEditedFiles(originalMessage.files || []);
      } else {
        // For text inputs, set the content
        setEditedContent(originalMessage.response || originalMessage.content || "");
      }
    }
  }, [isOpen, originalMessage, stepConfig]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEditedContent("");
      setSelectedOption(null);
      setEditedFiles([]);
      setIsDragActive(false);
    }
  }, [isOpen]);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
    if (!isDragActive) {
      setIsDragActive(true);
    }
  }, [isDragActive]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const related = e.relatedTarget;
    if (
      typeof Node !== "undefined" &&
      related instanceof Node &&
      e.currentTarget.contains(related)
    ) {
      return;
    }
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    if (droppedFiles.length > 0) {
      setEditedFiles((prev) => [...prev, ...droppedFiles]);
    }
  }, []);

  const handleFileChange = useCallback((e) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      setEditedFiles((prev) => [...prev, ...selectedFiles]);
    }
    e.target.value = "";
  }, []);

  const handleFileRemove = useCallback((fileName) => {
    setEditedFiles((prev) => prev.filter((f) => f.name !== fileName));
  }, []);

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen || !originalMessage) return null;

  const inputType = stepConfig?.inputType;
  const isOptionsInput = inputType === "options";
  const isTextInput = ["text", "textarea", "course_chat", "text_confirm"].includes(inputType);
  const isContentWithAttachments = inputType === "content_with_attachments";

  const handleSubmit = () => {
    if (isOptionsInput && selectedOption) {
      const option = stepConfig.options?.find((opt) => opt.id === selectedOption);
      onSaveEdit(selectedOption, option?.label || selectedOption);
    } else if (isContentWithAttachments) {
      // For content with attachments, pass both text and files
      const hasContent = editedContent.trim().length > 0 || editedFiles.length > 0;
      if (hasContent) {
        onSaveEdit(
          { text: editedContent.trim(), files: editedFiles },
          editedContent.trim() || `${editedFiles.length} file(s) attached`
        );
      }
    } else if (isTextInput && editedContent.trim()) {
      onSaveEdit(editedContent.trim(), editedContent.trim());
    }
  };

  // Determine if content has changed
  const hasContentChanged = () => {
    if (isOptionsInput) {
      return selectedOption && selectedOption !== originalMessage.response;
    }
    if (isContentWithAttachments) {
      const originalText = originalMessage.response || originalMessage.content || "";
      const originalFiles = originalMessage.files || [];
      const textChanged = editedContent.trim() !== originalText;
      const filesChanged =
        editedFiles.length !== originalFiles.length ||
        editedFiles.some((f, i) => f.name !== originalFiles[i]?.name);
      return textChanged || filesChanged;
    }
    return editedContent.trim() && editedContent.trim() !== originalMessage.response;
  };

  const hasContent = isContentWithAttachments
    ? editedContent.trim().length > 0 || editedFiles.length > 0
    : editedContent.trim().length > 0;

  const canSubmit = hasContentChanged() && (isOptionsInput ? selectedOption : hasContent);

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
              className={`bg-[var(--surface-1)] rounded-2xl shadow-xl w-full pointer-events-auto border border-[var(--border)] ${
                isContentWithAttachments ? "max-w-lg" : "max-w-md"
              }`}
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
                      This will update your response. If this changes course details or study mode,
                      some downstream steps may need to be regenerated.
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-4 max-h-[50vh] overflow-y-auto">
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

                {isContentWithAttachments && (
                  <div
                    className="space-y-3"
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
                      Your content
                    </label>

                    {/* Combined input area */}
                    <div
                      className={`
                        relative bg-[var(--surface-2)] border rounded-xl transition-all
                        ${isDragActive
                          ? "border-[var(--primary)] bg-[var(--primary)]/5"
                          : "border-[var(--border)] focus-within:ring-2 focus-within:ring-[var(--primary)]/50 focus-within:border-[var(--primary)]"
                        }
                      `}
                    >
                      {/* Textarea */}
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        placeholder={stepConfig?.placeholder || "Enter your content..."}
                        rows={4}
                        className="w-full px-4 pt-3 pb-2 bg-transparent text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none resize-none"
                      />

                      {/* Bottom bar with attachment button */}
                      <div className="flex items-center justify-between px-3 pb-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept={stepConfig?.accept || ".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp,.heic"}
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] rounded-lg transition-all"
                          title="Attach files"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <span>Attach files</span>
                        </button>

                        {isDragActive && (
                          <span className="text-sm text-[var(--primary)] font-medium">
                            Drop files here
                          </span>
                        )}
                      </div>
                    </div>

                    {/* File list */}
                    {editedFiles.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-[var(--muted-foreground)] font-medium uppercase tracking-wide">
                          Attached files ({editedFiles.length})
                        </p>
                        {editedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]"
                          >
                            <div className="w-8 h-8 rounded bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                              <svg
                                className="w-4 h-4 text-[var(--primary)]"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--foreground)] truncate">{file.name}</p>
                              {file.size && (
                                <p className="text-xs text-[var(--muted-foreground)]">{formatFileSize(file.size)}</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleFileRemove(file.name)}
                              className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded transition-colors"
                              title="Remove file"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
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
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
