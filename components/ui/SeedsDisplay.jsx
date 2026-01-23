"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sprout } from "lucide-react";
import { authFetch } from "@/lib/api";

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
      <Sprout className="w-8 h-8 text-[var(--primary)] group-hover:scale-110 transition-transform duration-200" />
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
