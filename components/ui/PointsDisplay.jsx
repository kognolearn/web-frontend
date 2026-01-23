"use client";

import { useState, useEffect } from "react";
import { authFetch } from "@/lib/api";

export default function PointsDisplay({ className = "" }) {
  const [points, setPoints] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchPoints = async () => {
      try {
        const res = await authFetch("/api/points");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setPoints(data.points);
          }
        }
      } catch (err) {
        console.error("Failed to fetch points:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPoints();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <div className="w-4 h-4 rounded bg-[var(--surface-2)] animate-pulse" />
        <div className="w-12 h-4 rounded bg-[var(--surface-2)] animate-pulse" />
      </div>
    );
  }

  const balance = points?.balance ?? 0;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] ${className}`}
      title={`${balance.toLocaleString()} points`}
    >
      <svg
        className="w-4 h-4"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.89-8.9c-1.78-.59-2.64-.96-2.64-1.9 0-1.02 1.11-1.39 1.81-1.39 1.31 0 1.79.99 1.9 1.34l1.58-.67c-.15-.44-.82-1.91-2.66-2.23V5h-1.75v1.26c-2.6.56-2.62 2.85-2.62 2.96 0 2.27 2.25 2.91 3.35 3.31 1.58.56 2.28 1.07 2.28 2.03 0 1.13-1.05 1.61-1.98 1.61-1.82 0-2.34-1.87-2.4-2.09l-1.66.67c.63 2.19 2.28 2.78 2.9 2.96V19h1.75v-1.24c.52-.09 3.02-.59 3.02-3.22 0-1.39-.6-2.61-3.88-3.44z" />
      </svg>
      <span className="text-sm font-semibold">
        {balance.toLocaleString()}
      </span>
    </div>
  );
}
