"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

// Auth constants
const OTP_FLOW_STORAGE_KEY = "kogno_otp_flow";
const DEFAULT_VERIFICATION_TYPE = "signup";
const RESEND_COOLDOWN_SECONDS = 30;
const OTP_LENGTH = 6;
const REFERRAL_STORAGE_KEY = "kogno_ref";
const REFERRAL_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchEmail = searchParams.get("email") || "";
  const [email, setEmail] = useState(searchEmail);
  const [verificationType, setVerificationType] = useState(DEFAULT_VERIFICATION_TYPE);
  const [otp, setOtp] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (searchEmail) {
      setEmail(searchEmail);
    }
  }, [searchEmail]);

  useEffect(() => {
    try {
      const storedRaw = localStorage.getItem(OTP_FLOW_STORAGE_KEY);
      if (!storedRaw) return;
      const stored = JSON.parse(storedRaw);
      if (!searchEmail && stored?.email) {
        setEmail(stored.email);
      }
      if (stored?.verificationType) {
        setVerificationType(stored.verificationType);
      }
    } catch (err) {
      console.error("Failed to read OTP flow info:", err);
    }
  }, [searchEmail]);

  useEffect(() => {
    // Listen for auth state changes (fires when user confirms email and session is established)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
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

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((current) => (current > 1 ? current - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleOtpChange = (event) => {
    const nextValue = event.target.value.replace(/\s+/g, "");
    const digitsOnly = nextValue.replace(/[^0-9]/g, "");
    setOtp(digitsOnly.slice(0, OTP_LENGTH));
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const trimmedEmail = String(email || "").trim();
    if (!trimmedEmail) {
      setError("Enter the email you used to sign up.");
      return;
    }

    const token = otp.replace(/\s+/g, "");
    if (token.length < 4) {
      setError("Enter the verification code from your email.");
      return;
    }

    setSubmitting(true);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token,
      type: verificationType,
    });

    if (verifyError) {
      setError(verifyError.message || "Unable to verify the code.");
      setSubmitting(false);
      return;
    }

    if (data?.user) {
      try {
        const storedRefRaw = localStorage.getItem(REFERRAL_STORAGE_KEY);
        if (storedRefRaw) {
          const storedRef = JSON.parse(storedRefRaw);
          if (storedRef?.code && Date.now() - storedRef.timestamp < REFERRAL_EXPIRY_MS) {
            await fetch("/api/referrals/attribute", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                referredUserId: data.user.id,
                code: storedRef.code,
              }),
            });
            localStorage.removeItem(REFERRAL_STORAGE_KEY);
          }
        }
      } catch (err) {
        console.error("Post-confirmation error:", err);
      }
    }

    try {
      localStorage.removeItem(OTP_FLOW_STORAGE_KEY);
    } catch (err) {
      console.error("Failed to clear OTP flow info:", err);
    }

    setConfirmed(true);
    setSubmitting(false);
    setTimeout(() => {
      router.push("/");
    }, 1500);
  };

  const handleResend = async () => {
    if (resending || resendCooldown > 0) return;

    setError("");
    setNotice("");

    const trimmedEmail = String(email || "").trim();
    if (!trimmedEmail) {
      setError("Enter the email you used to sign up.");
      return;
    }

    setResending(true);
    const response = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: trimmedEmail,
        mode: "resend",
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload?.error || "Unable to resend the code.");
      setResending(false);
      return;
    }

    const nextType = payload?.verificationType || "magiclink";
    setVerificationType(nextType);
    setOtp("");
    setNotice("A new code has been sent to your email.");
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setResending(false);

    try {
      localStorage.setItem(OTP_FLOW_STORAGE_KEY, JSON.stringify({
        email: trimmedEmail,
        verificationType: nextType,
        timestamp: Date.now(),
      }));
    } catch (err) {
      console.error("Failed to store OTP flow info:", err);
    }
  };

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
              Enter your verification code
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              We sent a 6-digit code to
            </p>
            {email && (
              <p className="mt-1 font-semibold text-[var(--foreground)]">
                {email}
              </p>
            )}
          </div>

          {/* OTP Form */}
          <div className="space-y-4 text-sm text-[var(--muted-foreground)]">
            {error && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
            {notice && (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
                {notice}
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label htmlFor="otp" className="mb-2 block text-sm font-medium text-[var(--muted-foreground)]">
                  Verification code
                </label>
                <input
                  id="otp"
                  name="otp"
                  value={otp}
                  onChange={handleOtpChange}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={OTP_LENGTH}
                  className="w-full rounded-xl border border-white/10 dark:border-white/5 bg-[var(--surface-2)]/50 px-4 py-3 text-center text-lg tracking-[0.3em] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || otp.length < 4}
                className="w-full px-4 py-3 rounded-xl bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:ring-offset-2 focus:ring-offset-[var(--background)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[var(--primary)]/20"
              >
                {submitting ? "Verifying..." : "Verify code"}
              </button>
            </form>

            <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]/80">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || resendCooldown > 0}
                className="text-[var(--primary)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : resending
                    ? "Sending..."
                    : "Resend code"}
              </button>
              <span>Need help? Check spam/junk.</span>
            </div>

            <div className="mt-6 rounded-xl border border-white/10 dark:border-white/5 bg-[var(--surface-2)]/50 p-4">
              <p className="text-xs font-medium text-[var(--foreground)] mb-2">
                Didn't get the email?
              </p>
              <ul className="space-y-1 text-xs text-[var(--muted-foreground)]">
                <li>• Check your spam or junk folder</li>
                <li>• Make sure you entered the correct email</li>
                <li>• Request a new code if it expired</li>
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

export default function ConfirmEmailClient() {
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
