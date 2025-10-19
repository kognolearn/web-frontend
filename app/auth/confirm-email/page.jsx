"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email");
  const [checking, setChecking] = useState(false);
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    // Poll for email confirmation every 3 seconds
    const checkEmailConfirmation = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Check if user exists and email is confirmed
        if (user && user.email_confirmed_at) {
          setChecking(true);
          // Email is confirmed, redirect to dashboard
          setTimeout(() => {
            router.push("/dashboard");
          }, 1000);
        }
      } catch (error) {
        console.error("Error checking email confirmation:", error);
      }
    };

    // Check immediately on mount
    checkEmailConfirmation();

    // Then check every 3 seconds, up to 60 times (3 minutes)
    const interval = setInterval(() => {
      setCheckCount((prev) => {
        if (prev >= 60) {
          clearInterval(interval);
          return prev;
        }
        checkEmailConfirmation();
        return prev + 1;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4 text-[var(--foreground)] transition-colors">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] p-8 shadow-sm">
            <div className="text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 mb-4">
                <svg
                  className="h-8 w-8 text-primary"
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
              <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-2">
                Email Confirmed!
              </h1>
              <p className="text-sm text-[var(--muted-foreground)]">
                Redirecting you to dashboard...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4 text-[var(--foreground)] transition-colors">
      <div className="w-full max-w-md">
        {/* Icon */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <svg
              className="w-8 h-8 text-[var(--foreground)]"
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
          <h1 className="text-3xl font-semibold text-[var(--foreground)] mb-2">
            Check Your Email
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            We've sent a confirmation link to
          </p>
          {email && (
            <p className="mt-1 font-medium text-[var(--foreground)]">
              {email}
            </p>
          )}
        </div>

        {/* Content Card */}
        <div className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] p-8 shadow-sm">
          <div className="space-y-4 text-sm text-[var(--muted-foreground)]">
            <p>
              Please check your email and click the confirmation link to activate your account.
            </p>
            <p>
              After clicking the link, <strong className="text-[var(--foreground)]">return to this page</strong> and we'll automatically redirect you to complete your dashboard.
            </p>
            <p className="text-xs italic text-[var(--muted-foreground)]">
              ⏱️ Checking for confirmation automatically...
            </p>
            
            <div className="mt-6 rounded-lg border border-[var(--border-muted)] bg-[var(--surface-2)] p-4">
              <p className="text-xs font-medium text-[var(--muted-foreground-strong)] mb-2">
                Didn't receive the email?
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-[var(--muted-foreground)]">
                <li>Check your spam or junk folder</li>
                <li>Make sure you entered the correct email</li>
                <li>Wait a few minutes and check again</li>
                <li>The link will expire in 24 hours</li>
              </ul>
            </div>

            <div className="pt-4">
              <Link
                href="/auth/signup"
                className="text-sm font-medium text-[var(--foreground)] transition-colors hover:text-primary"
              >
                ← Back to Sign Up
              </Link>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <p className="text-center text-xs text-[var(--muted-foreground)] mt-6">
          Need help? Contact our support team
        </p>
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--muted-foreground)] transition-colors">
        <div>Loading...</div>
      </div>
    }>
      <ConfirmEmailContent />
    </Suspense>
  );
}
