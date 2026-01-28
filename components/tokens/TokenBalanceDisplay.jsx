"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/api";

export default function TokenBalanceDisplay({
  compact = false,
  showPurchaseLink = true,
  onPurchaseClick,
  className = ""
}) {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/tokens/balance");
      if (!res.ok) throw new Error("Failed to fetch token balance");
      const data = await res.json();
      setBalance(data.balance);
    } catch (err) {
      console.error("Error fetching token balance:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-5 h-5 bg-[var(--surface-2)] rounded-full animate-pulse" />
        <div className="w-12 h-4 bg-[var(--surface-2)] rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return null; // Fail silently
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
<<<<<<< HEAD
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--primary)]/15 rounded-full">
          <svg className="w-4 h-4 text-[var(--primary)]" fill="currentColor" viewBox="0 0 24 24">
=======
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--surface-2)] rounded-full">
          <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
>>>>>>> origin/main
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
          </svg>
          <span className="text-sm font-medium text-[var(--foreground)]">
            {balance?.available ?? 0}
          </span>
        </div>
        {showPurchaseLink && balance?.available === 0 && (
          <button
            onClick={onPurchaseClick}
            className="text-xs text-[var(--primary)] hover:underline"
          >
            Get tokens
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-[var(--surface-2)] rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--foreground)]">Generation Tokens</h3>
<<<<<<< HEAD
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--primary)]/15 rounded-full">
          <svg className="w-4 h-4 text-[var(--primary)]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
          </svg>
          <span className="text-sm font-bold text-[var(--primary)]">
=======
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 rounded-full">
          <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
          </svg>
          <span className="text-sm font-bold text-amber-600">
>>>>>>> origin/main
            {balance?.available ?? 0}
          </span>
        </div>
      </div>

      <p className="text-xs text-[var(--muted-foreground)] mb-3">
        Use tokens to generate new courses. Each course generation uses 1 token.
      </p>

      {balance?.available === 0 && (
<<<<<<< HEAD
        <p className="text-xs text-[var(--primary)] mb-3">
=======
        <p className="text-xs text-amber-600 mb-3">
>>>>>>> origin/main
          You have no tokens remaining. Purchase more to generate courses.
        </p>
      )}

      {showPurchaseLink && (
        <div className="flex gap-2">
          {onPurchaseClick ? (
            <button
              onClick={onPurchaseClick}
              className="flex-1 py-2 px-3 bg-[var(--primary)] text-white text-sm rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors"
            >
              Buy Tokens
            </button>
          ) : (
            <Link
              href="/tokens"
              className="flex-1 py-2 px-3 bg-[var(--primary)] text-white text-sm rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors text-center"
            >
              Buy Tokens
            </Link>
          )}
          <Link
            href="/subscription"
            className="py-2 px-3 bg-[var(--surface-3)] text-[var(--foreground)] text-sm rounded-lg font-medium hover:bg-[var(--surface-4)] transition-colors"
          >
            Go Premium
          </Link>
        </div>
      )}
    </div>
  );
}
