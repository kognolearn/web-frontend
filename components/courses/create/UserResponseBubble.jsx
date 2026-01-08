"use client";

import { motion } from "framer-motion";

/**
 * User response message bubble
 */
export default function UserResponseBubble({
  content,
  files = [],
  timestamp,
  onEdit,
  canEdit = true,
  superseded = false,
}) {
  const messageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" },
    },
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (superseded) {
    return (
      <motion.div
        variants={messageVariants}
        initial="hidden"
        animate="visible"
        className="group flex flex-col items-end opacity-50"
      >
        <div className="relative max-w-[85%] md:max-w-[75%] bg-[var(--muted-foreground)]/20 text-[var(--muted-foreground)] rounded-2xl rounded-br-md px-4 py-3 line-through">
          {/* File attachments */}
          {files.length > 0 && (
            <div className="mb-1.5 space-y-0.5">
              {files.map((file, index) => (
                <div key={index} className="text-xs opacity-70 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                  {file.name}
                </div>
              ))}
            </div>
          )}

          <div className="text-[14px] whitespace-pre-wrap break-words leading-[1.6]">{content}</div>
        </div>
        <span className="text-[10px] text-[var(--muted-foreground)] mt-1">Edited</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className="group flex flex-col items-end"
    >
      <div className="relative max-w-[85%] md:max-w-[75%] bg-gradient-to-br from-[var(--primary)] to-[var(--primary-active)] text-white rounded-2xl rounded-br-md shadow-md px-4 py-3">
        {/* File attachments */}
        {files.length > 0 && (
          <div className="mb-2 space-y-1">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-xs bg-white/10 rounded-lg px-2 py-1.5"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="truncate flex-1">{file.name}</span>
                {file.size && (
                  <span className="text-white/60 flex-shrink-0">{formatFileSize(file.size)}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Message content */}
        <div className="text-[14px] whitespace-pre-wrap break-words leading-[1.6]">{content}</div>
      </div>

      {/* Edit button - shows on hover */}
      {canEdit && onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="mt-1 text-[10px] text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity hover:text-[var(--foreground)]"
        >
          Edit
        </button>
      )}

      {/* Timestamp */}
      {timestamp && (
        <span className="text-[10px] text-[var(--muted-foreground)] mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </motion.div>
  );
}
