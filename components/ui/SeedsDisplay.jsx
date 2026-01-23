"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <div className="w-16 h-5 rounded bg-[var(--surface-2)] animate-pulse" />
      </div>
    );
  }

  const balance = seeds?.balance ?? 0;

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] ${className}`}>
      You have{" "}
      <span className="font-semibold text-[var(--primary)]">
        {balance.toLocaleString()}
      </span>{" "}
      seeds,{" "}
      <Link
        href="/store"
        className="font-medium text-[var(--primary)] hover:underline"
      >
        spend them
      </Link>
    </span>
  );
}
