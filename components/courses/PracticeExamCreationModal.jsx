"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, Plus, Trash2, Link, FileText, Upload } from "lucide-react";

export default function PracticeExamCreationModal({
  isOpen,
  onClose,
  onConfirm,
  defaultName = ""
}) {
  const [name, setName] = useState(defaultName);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [supplementaryInfo, setSupplementaryInfo] = useState("");
  const [urls, setUrls] = useState([""]);
  const [files, setFiles] = useState([]);
  const [activeTab, setActiveTab] = useState("basic"); // 'basic' | 'supplementary'
  const fileInputRef = useRef(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(defaultName);
      setScheduledDate("");
      setScheduledTime("");
      setSupplementaryInfo("");
      setUrls([""]);
      setFiles([]);
      setActiveTab("basic");
    }
  }, [isOpen, defaultName]);

  const handleConfirm = () => {
    if (!name.trim()) return;

    const scheduledAt = scheduledDate
      ? new Date(`${scheduledDate}T${scheduledTime || "00:00"}`).toISOString()
      : null;

    // Filter out empty URLs
    const validUrls = urls.filter(url => url.trim().length > 0);

    onConfirm({
      name: name.trim(),
      scheduledAt,
      supplementaryInfo: supplementaryInfo.trim() || null,
      supplementaryUrls: validUrls,
      supplementaryFiles: files.map(f => f.name), // We'll handle file upload separately
      fileObjects: files, // Pass actual file objects for upload
    });
  };

  const addUrlField = () => {
    setUrls([...urls, ""]);
  };

  const updateUrl = (index, value) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const removeUrl = (index) => {
    if (urls.length === 1) {
      setUrls([""]);
    } else {
      setUrls(urls.filter((_, i) => i !== index));
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    // Only accept PDFs
    const pdfFiles = selectedFiles.filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    setFiles([...files, ...pdfFiles]);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              New Practice Exam
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[var(--border)]">
            <button
              onClick={() => setActiveTab("basic")}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "basic"
                  ? "text-[var(--primary)] border-b-2 border-[var(--primary)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              Basic Info
            </button>
            <button
              onClick={() => setActiveTab("supplementary")}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "supplementary"
                  ? "text-[var(--primary)] border-b-2 border-[var(--primary)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              Supplementary Info
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === "basic" ? (
              <>
                {/* Name input */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    Exam Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)]"
                    placeholder="e.g., Chapters 1-3 Quiz, Midterm Review"
                    autoFocus
                  />
                </div>

                {/* Scheduled date/time */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    Scheduled Date & Time <span className="text-[var(--muted-foreground)] font-normal">(optional)</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)]"
                      />
                    </div>
                    <div className="flex-1 relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        disabled={!scheduledDate}
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)]"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1.5">
                    Set a reminder for when your exam is scheduled
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Supplementary text */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    <FileText className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                    Additional Notes
                  </label>
                  <textarea
                    value={supplementaryInfo}
                    onChange={(e) => setSupplementaryInfo(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] resize-none"
                    placeholder="Add any additional context or topics to focus on..."
                    rows={3}
                  />
                </div>

                {/* URLs */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    <Link className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                    Reference URLs
                  </label>
                  <div className="space-y-2">
                    {urls.map((url, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => updateUrl(index, e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)]"
                          placeholder="https://..."
                        />
                        <button
                          onClick={() => removeUrl(index)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addUrlField}
                      className="flex items-center gap-1.5 text-sm text-[var(--primary)] hover:text-[var(--primary-active)] transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add URL
                    </button>
                  </div>
                </div>

                {/* PDF uploads */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    <Upload className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                    PDF Files
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)]/50 bg-[var(--surface-2)]/50 hover:bg-[var(--primary)]/5 transition-colors text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    Click to upload PDF files
                  </button>
                  {files.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--surface-2)] text-sm"
                        >
                          <span className="truncate text-[var(--foreground)]">{file.name}</span>
                          <button
                            onClick={() => removeFile(index)}
                            className="p-1 rounded hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--border)] bg-[var(--surface-2)]/30">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!name.trim()}
              className="px-5 py-2 rounded-xl text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-active)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create & Position
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
