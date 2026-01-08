"use client";

import { useState, useCallback, useRef } from "react";
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
 * Dynamic input renderer based on current question type
 */
export default function CourseInputRenderer({
  inputType,
  value = "",
  defaultValue = "",
  onChange,
  onSubmit,
  placeholder = "",
  confirmPlaceholder = "",
  disabled = false,
  files = [],
  onFileChange,
  onFileRemove,
  accept,
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
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
    const valueChanged = localValue !== defaultValue;

    const handleConfirmKeyDown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        // Submit either the typed value or the default value
        const valueToSubmit = localValue.trim() || defaultValue;
        if (valueToSubmit) {
          onSubmit(valueToSubmit);
          setLocalValue("");
        }
      }
    };

    const handleConfirmSubmit = () => {
      const valueToSubmit = localValue.trim() || defaultValue;
      if (valueToSubmit) {
        onSubmit(valueToSubmit);
        setLocalValue("");
      }
    };

    return (
      <div className="space-y-2">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onKeyDown={handleConfirmKeyDown}
              placeholder={hasDefaultValue ? confirmPlaceholder || "Type to change or press Enter to confirm" : placeholder}
              disabled={disabled}
              className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
            />
          </div>
          <button
            type="button"
            onClick={handleConfirmSubmit}
            disabled={disabled || (!localValue.trim() && !defaultValue)}
            className="flex-shrink-0 p-3 rounded-xl bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            title={hasDefaultValue && !valueChanged ? "Confirm" : "Submit"}
          >
            {hasDefaultValue && !valueChanged ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            )}
          </button>
        </div>
        {hasDefaultValue && !localValue && (
          <p className="text-xs text-[var(--muted-foreground)]">
            Press Enter to confirm or type a different institution
          </p>
        )}
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

  // Options are rendered in KognoMessage
  // Confirm is rendered in KognoMessage
  // Topics and Confidence have their own components

  // Default: no input shown
  return null;
}
