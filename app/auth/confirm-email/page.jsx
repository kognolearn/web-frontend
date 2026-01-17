"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    // Listen for auth state changes (fires when user confirms email and session is established)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user?.email_confirmed_at) {
          setConfirmed(true);
          setTimeout(() => {
            router.push("/");
          }, 1500);
        }
      }
    );

    // Also check if already confirmed on mount
    const checkInitialState = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) {
        setConfirmed(true);
        setTimeout(() => {
          router.push("/");
        }, 1500);
      }
    };
    checkInitialState();

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (confirmed) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-[var(--background)] px-4 py-12 overflow-hidden">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.75)) 0%, transparent 100%)` }}
          />
          <div
            className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.5)) 0%, transparent 100%)` }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />
        </div>

        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block text-2xl font-bold text-[var(--primary)]">
              Kogno
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 dark:border-white/5 bg-[var(--surface-1)]/80 backdrop-blur-xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 mb-6">
                <svg
                  className="h-8 w-8 text-green-500"
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
              </div>
              <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                Email Confirmed!
              </h1>
              <p className="text-sm text-[var(--muted-foreground)]">
                Redirecting you to get started...
              </p>
              <div className="mt-4 flex justify-center">
                <svg className="animate-spin h-5 w-5 text-[var(--primary)]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[var(--background)] px-4 py-12 overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.75)) 0%, transparent 100%)` }}
        />
        <div
          className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.5)) 0%, transparent 100%)` }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-2xl font-bold text-[var(--primary)]">
            Kogno
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 dark:border-white/5 bg-[var(--surface-1)]/80 backdrop-blur-xl p-8 shadow-2xl">
          {/* Email Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--primary)]/10 mb-4">
              <svg
                className="w-8 h-8 text-[var(--primary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">
              Check your email
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              We sent a confirmation link to
            </p>
            {email && (
              <p className="mt-1 font-semibold text-[var(--foreground)]">
                {email}
              </p>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-4 text-sm text-[var(--muted-foreground)]">
            <p className="text-center">
              Click the link in the email to verify your account. This page will automatically update once confirmed.
            </p>

            <div className="flex items-center justify-center gap-2 text-xs text-[var(--muted-foreground)]/70">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Waiting for confirmation...</span>
            </div>

            <div className="mt-6 rounded-xl border border-white/10 dark:border-white/5 bg-[var(--surface-2)]/50 p-4">
              <p className="text-xs font-medium text-[var(--foreground)] mb-2">
                Didn't get the email?
              </p>
              <ul className="space-y-1 text-xs text-[var(--muted-foreground)]">
                <li>• Check your spam or junk folder</li>
                <li>• Make sure you entered the correct email</li>
                <li>• The link expires in 24 hours</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 dark:border-white/5 text-center">
            <Link
              href="/auth/create-account"
              className="text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              ← Back to Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--muted-foreground)] transition-colors">
        <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    }>
      <ConfirmEmailContent />
    </Suspense>
  );
}
