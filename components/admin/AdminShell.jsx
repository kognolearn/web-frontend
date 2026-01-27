"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ADMIN_SECTIONS,
  DEFAULT_ADMIN_SECTION,
  getAdminSection,
  isValidAdminSection,
} from "@/components/admin/adminSections";

export default function AdminShell({ children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sectionParam = searchParams.get("section");
  const activeSectionId = isValidAdminSection(sectionParam)
    ? sectionParam
    : DEFAULT_ADMIN_SECTION;
  const activeSection = getAdminSection(activeSectionId);
  const testingActive = pathname?.startsWith("/admin/testing");

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--background)]/50 to-[var(--background)]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative flex min-h-screen">
        <aside className="hidden w-72 flex-shrink-0 border-r border-[var(--border)] bg-[var(--surface-1)]/85 p-6 backdrop-blur-xl lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-bold text-[var(--primary)] tracking-tight">
              Kogno
            </Link>
            <span className="badge">Admin</span>
          </div>

          <div className="mt-8 flex-1">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Navigation
            </p>
            <nav className="flex flex-col gap-1.5">
              {ADMIN_SECTIONS.map((section) => {
                const isActive = !testingActive && activeSectionId === section.id;
                const href = `/admin?section=${section.id}`;
                return (
                  <Link
                    key={section.id}
                    href={href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[var(--primary)] text-white shadow-[var(--shadow-glow)]"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={section.icon} />
                    </svg>
                    <span>{section.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-6 flex flex-col gap-2 border-t border-[var(--border)] pt-4">
            <Link
              href="/admin/testing"
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                testingActive
                  ? "bg-[var(--primary)] text-white shadow-[var(--shadow-glow)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 3v2.25m4.5-2.25v2.25M6 7.5h12m-9 4.5h6m-6 4.5h3m-6-9v10.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 18V7.5"
                />
              </svg>
              <span>Testing</span>
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back To Dashboard</span>
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-[var(--border)] bg-[var(--surface-1)]/75 px-6 py-4 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                  Admin Dashboard
                </p>
                <h1 className="text-xl font-semibold tracking-tight">
                  {testingActive ? "Testing" : activeSection.label}
                </h1>
              </div>
              <div className="flex items-center gap-2 lg:hidden">
                <Link href="/admin/testing" className="btn btn-ghost btn-sm">
                  Testing
                </Link>
                <Link href="/dashboard" className="btn btn-ghost btn-sm">
                  Dashboard
                </Link>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="mx-auto max-w-7xl p-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

