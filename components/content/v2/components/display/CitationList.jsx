"use client";

import React, { useMemo } from "react";

const formatAuthors = (authors = []) => {
  if (!authors.length) return "Unknown";
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
  return `${authors.slice(0, -1).join(", ")}, & ${authors[authors.length - 1]}`;
};

const formatCitation = (citation, style) => {
  const authors = formatAuthors(citation.authors || []);
  const year = citation.year ? String(citation.year) : "n.d.";
  const title = citation.title || "Untitled";
  const source = citation.source ? ` ${citation.source}` : "";
  const url = citation.url || "";
  const doi = citation.doi ? ` https://doi.org/${citation.doi}` : "";

  if (style === "MLA") {
    return `${authors}. "${title}."${source ? ` ${citation.source}` : ""}${
      citation.year ? `, ${citation.year}` : ""
    }.${url ? ` ${url}` : ""}${doi}`;
  }

  if (style === "Chicago") {
    return `${authors}. "${title}."${source ? ` ${citation.source}` : ""}${
      citation.year ? ` (${citation.year})` : ""
    }.${url ? ` ${url}` : ""}${doi}`;
  }

  // APA default
  return `${authors} (${year}). ${title}.${source}.${url ? ` ${url}` : ""}${doi}`;
};

/**
 * CitationList - Render citations
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {Array} props.citations
 * @param {'APA' | 'MLA' | 'Chicago'} [props.style='APA']
 */
export default function CitationList({ id, citations = [], style = "APA" }) {
  const safeCitations = useMemo(() => citations.filter(Boolean), [citations]);
  const resolvedStyle = style || "APA";

  if (!safeCitations.length) {
    return (
      <div
        id={id}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-center"
      >
        <p className="text-sm text-[var(--muted-foreground)]">
          No citations provided
        </p>
      </div>
    );
  }

  return (
    <div id={id} className="v2-citation-list space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
        {resolvedStyle} format
      </div>
      <ol className="list-decimal space-y-3 pl-5 text-sm text-[var(--foreground)]">
        {safeCitations.map((citation) => (
          <li key={citation.id} className="space-y-1">
            <div className="leading-relaxed">
              {formatCitation(citation, resolvedStyle)}
            </div>
            {citation.url && (
              <a
                href={citation.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--primary)] hover:underline"
              >
                {citation.url}
              </a>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
