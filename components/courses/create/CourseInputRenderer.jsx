"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import DurationInput from "@/components/ui/DurationInput";

/**
 * File upload dropzone component
 */
function FileUploadZone({
  files = [],
  onFilesChange,
  onFileRemove,
  accept,
  disabled = false,
}) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef(null);

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

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
      const droppedFiles = Array.from(e.dataTransfer?.files || []);
      if (droppedFiles.length > 0) {
        onFilesChange(droppedFiles);
      }
    },
    [onFilesChange]
  );

  const handleFileChange = useCallback(
    (e) => {
      if (!e.target.files) return;
      const selectedFiles = Array.from(e.target.files);
      if (selectedFiles.length > 0) {
        onFilesChange(selectedFiles);
      }
      e.target.value = "";
    },
    [onFilesChange]
  );

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
          ${
            isDragActive
              ? "border-[var(--primary)] bg-[var(--primary)]/5"
              : "border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--surface-2)]"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileChange}
          disabled={disabled}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-[var(--surface-muted)] flex items-center justify-center">
            <svg
              className="w-6 h-6 text-[var(--muted-foreground)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              {isDragActive ? "Drop files here" : "Click or drag files to upload"}
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              PDF, Word, PowerPoint, or images
            </p>
          </div>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-[var(--surface-2)] rounded-lg"
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
                <p className="text-xs text-[var(--muted-foreground)]">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileRemove(file.name);
                }}
                className="p-1 text-[var(--muted-foreground)] hover:text-[var(--danger)] transition-colors"
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
  );
}

/**
 * Combined content input with auto-growing textarea and file attachments
 */
function ContentWithAttachments({
  text = "",
  onTextChange,
  files = [],
  onFilesChange,
  onFileRemove,
  onSubmit,
  accept,
  disabled = false,
  placeholder = "",
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);

  // Calculate rows based on content (2-12 rows)
  const calculateRows = useCallback((value) => {
    if (!value) return 2;
    const lineCount = (value.match(/\n/g) || []).length + 1;
    // Estimate character-based rows (roughly 60 chars per line)
    const charRows = Math.ceil(value.length / 60);
    return Math.min(12, Math.max(2, Math.max(lineCount, charRows)));
  }, []);

  const [rows, setRows] = useState(() => calculateRows(text));

  useEffect(() => {
    setRows(calculateRows(text));
  }, [text, calculateRows]);

  const handleTextChange = useCallback((e) => {
    const newValue = e.target.value;
    onTextChange(newValue);
    setRows(calculateRows(newValue));
  }, [onTextChange, calculateRows]);

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
      onFilesChange(droppedFiles);
    }
  }, [onFilesChange]);

  const handleFileChange = useCallback((e) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      onFilesChange(selectedFiles);
    }
    e.target.value = "";
  }, [onFilesChange]);

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const hasContent = text.trim().length > 0 || files.length > 0;

  return (
    <div
      className="space-y-3"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Combined input area */}
      <div
        className={`
          relative bg-[var(--surface-2)] border rounded-xl transition-all
          ${isDragActive
            ? "border-[var(--primary)] bg-[var(--primary)]/5"
            : "border-[var(--border)] focus-within:ring-2 focus-within:ring-[var(--primary)]/50 focus-within:border-[var(--primary)]"
          }
          ${disabled ? "opacity-50" : ""}
        `}
      >
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className="w-full px-4 pt-3 pb-2 bg-transparent text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none resize-none"
        />

        {/* Bottom bar with attachment button */}
        <div className="flex items-center justify-between px-3 pb-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept}
            onChange={handleFileChange}
            disabled={disabled}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
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
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-[var(--muted-foreground)] font-medium uppercase tracking-wide">
            Attached files ({files.length})
          </p>
          {files.map((file, index) => (
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
                <p className="text-xs text-[var(--muted-foreground)]">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => onFileRemove(file.name)}
                disabled={disabled}
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

      {/* Submit button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onSubmit({ text, files })}
          disabled={disabled || !hasContent}
          className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
        >
          <span>Done</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Dynamic input renderer based on current question type
 */
export default function CourseInputRenderer({
  inputType,
  value = "",
  defaultValue = "",
  onChange,
  onSubmit,
  placeholder = "",
  disabled = false,
  files = [],
  onFileChange,
  onFileRemove,
  accept,
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
  // Props for content_with_attachments
  contentText = "",
  onContentTextChange,
  onContentSubmit,
}) {
  // For text_confirm, use defaultValue if no value provided
  const initialValue = inputType === "text_confirm" && defaultValue ? defaultValue : value;
  const [localValue, setLocalValue] = useState(initialValue);
  const inputRef = useRef(null);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (localValue.trim()) {
          onSubmit(localValue);
          setLocalValue("");
        }
      }
    },
    [localValue, onSubmit]
  );

  const handleSubmit = useCallback(() => {
    if (localValue.trim()) {
      onSubmit(localValue);
      setLocalValue("");
    }
  }, [localValue, onSubmit]);

  // Text input
  if (inputType === "text") {
    return (
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <input
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
          />
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !localValue.trim()}
          className="flex-shrink-0 p-3 rounded-xl bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      </div>
    );
  }

  // Text confirm input (for pre-filled values that can be confirmed or changed)
  if (inputType === "text_confirm") {
    const hasDefaultValue = defaultValue && defaultValue.trim();
    const [showInput, setShowInput] = useState(!hasDefaultValue);

    const handleConfirmKeyDown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (localValue.trim()) {
          onSubmit(localValue);
          setLocalValue("");
        }
      }
    };

    const handleConfirmSubmit = () => {
      if (localValue.trim()) {
        onSubmit(localValue);
        setLocalValue("");
      }
    };

    // If there's a default value and we haven't clicked "No" yet, show Yes/No buttons
    if (hasDefaultValue && !showInput) {
      return (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSubmit(defaultValue)}
            disabled={disabled}
            className="px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => {
              setShowInput(true);
              setLocalValue("");
            }}
            disabled={disabled}
            className="px-6 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--surface-muted)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            No
          </button>
        </div>
      );
    }

    // Show text input (either no default value, or user clicked "No")
    return (
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <input
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleConfirmKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={hasDefaultValue}
            className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
          />
        </div>
        <button
          type="button"
          onClick={handleConfirmSubmit}
          disabled={disabled || !localValue.trim()}
          className="flex-shrink-0 p-3 rounded-xl bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      </div>
    );
  }

  // Textarea input
  if (inputType === "textarea") {
    return (
      <div className="space-y-2">
        <textarea
          ref={inputRef}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={4}
          className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all resize-none"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || !localValue.trim()}
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  // File upload
  if (inputType === "file") {
    return (
      <FileUploadZone
        files={files}
        onFilesChange={onFileChange}
        onFileRemove={onFileRemove}
        accept={accept}
        disabled={disabled}
      />
    );
  }

  // Combined content input with text and file attachments
  if (inputType === "content_with_attachments") {
    return (
      <ContentWithAttachments
        text={contentText}
        onTextChange={onContentTextChange}
        files={files}
        onFilesChange={onFileChange}
        onFileRemove={onFileRemove}
        onSubmit={onContentSubmit}
        accept={accept}
        disabled={disabled}
        placeholder={placeholder}
      />
    );
  }

  // Duration picker
  if (inputType === "duration") {
    const handleDurationChange = ({ hours: h, minutes: m }) => {
      onHoursChange(h);
      onMinutesChange(m);
    };

    return (
      <div className="space-y-4">
        <DurationInput
          hours={hours}
          minutes={minutes}
          onChange={handleDurationChange}
          disabled={disabled}
          summaryLabel="Time until exam"
          quickOptions={[
            { label: "1 hour", minutes: 60 },
            { label: "3 hours", minutes: 180 },
            { label: "1 day", minutes: 1440 },
            { label: "3 days", minutes: 4320 },
            { label: "1 week", minutes: 10080 },
          ]}
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onSubmit({ hours, minutes })}
            disabled={disabled || (hours === 0 && minutes === 0)}
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Chat-based course/college input (onboarding tour step)
  // Uses free-form text that gets parsed by LLM
  if (inputType === "course_chat") {
    return (
      <div className="flex items-end gap-2" data-tour="chat-input">
        <div className="flex-1">
          <input
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
          />
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !localValue.trim()}
          className="flex-shrink-0 p-3 rounded-xl bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      </div>
    );
  }

  // Options are rendered in KognoMessage
  // Confirm is rendered in KognoMessage
  // Topics and Confidence have their own components

  // Default: no input shown
  return null;
}
