"use client";

import React, { useState } from "react";
import { FileText, ExternalLink, Download, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * PdfViewer - PDF embed with page controls
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {string} props.pdf_url - PDF URL
 * @param {number} [props.start_page] - Starting page (1-indexed)
 * @param {number} [props.end_page] - Ending page (1-indexed)
 * @param {string[]} [props.citation_anchors] - Citation anchor IDs
 */
export default function PdfViewer({
  id,
  pdf_url,
  start_page = 1,
  end_page,
  citation_anchors = [],
}) {
  const [currentPage, setCurrentPage] = useState(start_page);
  const [loadError, setLoadError] = useState(false);

  // Build PDF URL with page parameter
  const getPdfUrl = () => {
    if (!pdf_url) return "";
    const url = new URL(pdf_url, window.location.origin);
    url.hash = `page=${currentPage}`;
    return url.toString();
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(start_page, prev - 1));
  };

  const handleNextPage = () => {
    if (end_page) {
      setCurrentPage((prev) => Math.min(end_page, prev + 1));
    } else {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(pdf_url, "_blank");
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = pdf_url;
    link.download = pdf_url.split("/").pop() || "document.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!pdf_url) {
    return (
      <div
        id={id}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-center"
      >
        <FileText className="w-12 h-12 mx-auto mb-3 text-[var(--muted-foreground)]" />
        <p className="text-sm text-[var(--muted-foreground)]">
          No PDF URL provided
        </p>
      </div>
    );
  }

  return (
    <div id={id} className="v2-pdf-viewer space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= start_page}
            className="p-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]
              hover:bg-[var(--surface-1)] disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-[var(--foreground)] min-w-[80px] text-center">
            Page {currentPage}
            {end_page && ` of ${end_page}`}
          </span>
          <button
            onClick={handleNextPage}
            disabled={end_page && currentPage >= end_page}
            className="p-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]
              hover:bg-[var(--surface-1)] disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenInNewTab}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg
              border border-[var(--border)] bg-[var(--surface-2)]
              hover:bg-[var(--surface-1)] transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg
              border border-[var(--border)] bg-[var(--surface-2)]
              hover:bg-[var(--surface-1)] transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>

      {/* PDF Embed */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-gray-100 dark:bg-gray-900">
        {loadError ? (
          <div className="flex flex-col items-center justify-center p-12">
            <FileText className="w-16 h-16 mb-4 text-[var(--muted-foreground)]" />
            <p className="text-sm text-[var(--muted-foreground)] mb-4">
              Unable to display PDF in browser
            </p>
            <button
              onClick={handleOpenInNewTab}
              className="flex items-center gap-2 px-4 py-2 rounded-lg
                bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
            >
              <ExternalLink className="w-4 h-4" />
              Open in New Tab
            </button>
          </div>
        ) : (
          <iframe
            src={getPdfUrl()}
            title="PDF Viewer"
            className="w-full h-[600px]"
            onError={() => setLoadError(true)}
          />
        )}
      </div>

      {/* Citation Anchors */}
      {citation_anchors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
            Citations:
          </span>
          {citation_anchors.map((anchor, index) => (
            <button
              key={index}
              className="px-2 py-1 text-xs rounded-lg
                border border-[var(--border)] bg-[var(--surface-2)]
                hover:bg-[var(--surface-1)] transition-colors"
            >
              {anchor}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
