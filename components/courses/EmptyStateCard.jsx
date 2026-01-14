"use client";

import Link from "next/link";

export default function EmptyStateCard({ title, description, ctaText, ctaHref, onCtaClick }) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 text-center shadow-lg">
      {title && (
        <h3 className="text-lg font-semibold text-[var(--foreground)]">
          {title}
        </h3>
      )}
      {description && (
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {description}
        </p>
      )}
      {ctaText && ctaHref && (
        <Link
          href={ctaHref}
          onClick={onCtaClick}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          {ctaText}
        </Link>
      )}
    </div>
  );
}
