"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/api";

function SeedIcon({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2C9.5 2 7.5 4 7.5 6.5C7.5 8.5 8.5 10.2 10 11.2V22H14V11.2C15.5 10.2 16.5 8.5 16.5 6.5C16.5 4 14.5 2 12 2ZM12 4C13.4 4 14.5 5.1 14.5 6.5C14.5 7.9 13.4 9 12 9C10.6 9 9.5 7.9 9.5 6.5C9.5 5.1 10.6 4 12 4Z" />
      <path d="M6 12C4.3 12 3 13.3 3 15C3 16.3 3.8 17.4 5 17.8V22H7V17.8C8.2 17.4 9 16.3 9 15C9 13.3 7.7 12 6 12Z" opacity="0.7" />
      <path d="M18 12C16.3 12 15 13.3 15 15C15 16.3 15.8 17.4 17 17.8V22H19V17.8C20.2 17.4 21 16.3 21 15C21 13.3 19.7 12 18 12Z" opacity="0.7" />
    </svg>
  );
}

export default function SeedsDisplay({ className = "" }) {
  const [seeds, setSeeds] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchSeeds = async () => {
      try {
        const res = await authFetch("/api/seeds");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setSeeds(data.seeds);
          }
        }
      } catch (err) {
        console.error("Failed to fetch seeds:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchSeeds();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Link
        href="/store"
        className={`inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-[var(--primary)]/20 to-[var(--primary)]/10 border border-[var(--primary)]/30 ${className}`}
      >
        <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] animate-pulse" />
        <div className="w-20 h-7 rounded bg-[var(--surface-2)] animate-pulse" />
      </Link>
    );
  }

  const balance = seeds?.balance ?? 0;

  return (
    <Link
      href="/store"
      className={`group inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-[var(--primary)]/20 to-[var(--primary)]/10 border border-[var(--primary)]/30 hover:border-[var(--primary)]/50 hover:from-[var(--primary)]/25 hover:to-[var(--primary)]/15 transition-all duration-200 cursor-pointer ${className}`}
      title="Visit the Seed Store"
    >
      <SeedIcon className="w-8 h-8 text-[var(--primary)] group-hover:scale-110 transition-transform duration-200" />
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-[var(--primary)]">
          {balance.toLocaleString()}
        </span>
        <span className="text-lg font-medium text-[var(--primary)]/80">
          seeds
        </span>
      </div>
    </Link>
  );
}
