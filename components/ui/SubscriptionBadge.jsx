"use client";

import Link from "next/link";

export default function SubscriptionBadge({
  planLevel = "free",
  expiresAt = null,
  className = "",
  showLink = true,
}) {
  const isPaid = planLevel === "paid";
  const isExpiringSoon = expiresAt && new Date(expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const badge = (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        isPaid
          ? isExpiringSoon
            ? "bg-yellow-500/20 text-yellow-600"
            : "bg-green-500/20 text-green-600"
          : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
      } ${className}`}
    >
      {isPaid ? (
        <>
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          Pro
          {isExpiringSoon && expiresAt && (
            <span className="opacity-75">(expires {formatDate(expiresAt)})</span>
          )}
        </>
      ) : (
        <>
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Free
        </>
      )}
    </div>
  );

  if (showLink) {
    return (
      <Link
        href={isPaid ? "/subscription" : "/?continueNegotiation=1"}
        className="hover:opacity-80 transition-opacity"
      >
        {badge}
      </Link>
    );
  }

  return badge;
}
