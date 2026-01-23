"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
      className={`group inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[var(--primary)]/15 border-2 border-dashed border-[var(--primary)]/40 hover:border-solid hover:border-[var(--primary)] hover:bg-[var(--primary)]/20 transition-all duration-300 cursor-pointer ${className}`}
      title="Visit the Seed Store"
    >
      <Image
        src="/images/seed_icon.png"
        alt="Seeds"
        width={28}
        height={28}
        className="w-7 h-7 object-contain group-hover:rotate-12 transition-transform duration-300"
      />
      <span className="text-xl font-bold text-[var(--primary)]">
        {balance.toLocaleString()}
      </span>
      <span className="max-w-0 overflow-hidden group-hover:max-w-24 transition-all duration-300 ease-out text-base font-medium text-[var(--primary)]/80 whitespace-nowrap">
        seeds
      </span>
    </Link>
  );
}
