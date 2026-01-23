"use client";

import Link from "next/link";
import Image from "next/image";

export default function StorePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full blur-3xl animate-pulse"
          style={{
            animationDuration: "8s",
            background:
              "radial-gradient(circle, rgba(var(--primary-rgb), var(--grid-glow-opacity)) 0%, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.25)) 100%)",
          }}
        />
        <div
          className="absolute top-1/2 -left-40 h-[400px] w-[400px] rounded-full blur-3xl animate-pulse"
          style={{
            animationDuration: "10s",
            animationDelay: "2s",
            background:
              "radial-gradient(circle, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.75)) 0%, transparent 100%)",
          }}
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 sm:gap-8 px-3 sm:px-4 pb-16 pt-6 sm:pt-8 sm:px-6 lg:px-8">
        {/* Header card */}
        <div className="rounded-2xl sm:rounded-3xl border border-[var(--border)]/70 bg-[var(--surface-1)]/60 p-4 sm:p-6 shadow-lg shadow-black/10 backdrop-blur-xl">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src="/images/kogno_logo.png"
                alt="Kogno Logo"
                width={32}
                height={32}
                className="h-7 w-7 sm:h-8 sm:w-8 object-contain"
                priority
              />
              <span className="text-lg sm:text-xl font-bold tracking-tight text-[var(--primary)]">
                Kogno
              </span>
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--foreground)]"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
          </div>

          {/* Page title */}
          <header className="mt-4">
            <h1 className="text-2xl sm:text-3xl font-bold sm:text-4xl">
              Seed Store
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[var(--muted-foreground)]">
              Spend your seeds on rewards and power-ups.
            </p>
          </header>
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--primary)]/10 mb-4">
            <svg className="h-10 w-10 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[var(--foreground)]">
            Coming Soon
          </h2>
          <p className="mt-2 max-w-md text-[var(--muted-foreground)]">
            The store is being stocked with exciting rewards. Check back soon to spend your seeds!
          </p>
        </div>
      </div>
    </div>
  );
}
