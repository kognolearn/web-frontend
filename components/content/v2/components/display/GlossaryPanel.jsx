"use client";

import React, { useMemo, useState } from "react";

/**
 * GlossaryPanel - Searchable glossary of terms
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {Array<{term: string, definition: string, related_terms?: string[]}>} props.terms
 * @param {boolean} [props.searchable=true]
 * @param {boolean} [props.alphabetized=true]
 */
export default function GlossaryPanel({
  id,
  terms = [],
  searchable = true,
  alphabetized = true,
}) {
  const [query, setQuery] = useState("");

  const filteredTerms = useMemo(() => {
    const safeTerms = terms.filter(Boolean);
    const normalizedQuery = query.trim().toLowerCase();

    let nextTerms = safeTerms;
    if (normalizedQuery) {
      nextTerms = safeTerms.filter((term) => {
        const termText = `${term.term} ${term.definition}`.toLowerCase();
        return termText.includes(normalizedQuery);
      });
    }

    if (alphabetized) {
      nextTerms = [...nextTerms].sort((a, b) =>
        String(a.term || "").localeCompare(String(b.term || ""))
      );
    }

    return nextTerms;
  }, [terms, query, alphabetized]);

  if (!terms.length) {
    return (
      <div
        id={id}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-center"
      >
        <p className="text-sm text-[var(--muted-foreground)]">
          No glossary terms provided
        </p>
      </div>
    );
  }

  return (
    <div id={id} className="v2-glossary-panel space-y-4">
      {searchable && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search terms..."
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
        />
      )}

      <div className="space-y-3">
        {filteredTerms.map((entry) => (
          <div
            key={entry.term}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
          >
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              {entry.term}
            </h3>
            <p className="mt-2 text-sm text-[var(--muted-foreground)] leading-relaxed">
              {entry.definition}
            </p>
            {entry.related_terms?.length ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)]">
                {entry.related_terms.map((term) => (
                  <span
                    key={`${entry.term}-${term}`}
                    className="rounded-full border border-[var(--border)] px-2 py-0.5"
                  >
                    {term}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
