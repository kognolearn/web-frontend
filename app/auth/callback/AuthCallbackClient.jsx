"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { cleanupAnonUser, getOnboardingCourseSession } from "@/lib/onboarding";

const REFERRAL_STORAGE_KEY = "kogno_ref";
const REFERRAL_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export default function AuthCallbackClient() {
  const router = useRouter();
  const [status, setStatus] = useState("verifying");
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get the hash fragment from the URL (Supabase sends tokens in the hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        // Check for error parameters first (e.g., expired OTP)
        const errorParam = hashParams.get("error");
        const errorCode = hashParams.get("error_code");
        const errorDescription = hashParams.get("error_description");

        if (errorParam || errorCode) {
          // Check if user already has an active session (they may have already confirmed)
          const { data: { user } } = await supabase.auth.getUser();

          if (user && user.email_confirmed_at) {
            // User is already confirmed, redirect to onboarding
            setStatus("success");
            setTimeout(() => {
              router.push("/");
            }, 2000);
            return;
          }

          // Show the error
          setStatus("error");
          const decodedError = errorDescription
            ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
            : errorParam || "Verification failed";
          setError(decodedError);
          return;
        }

        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        // If this is an email confirmation
        if (type === "signup" || type === "email") {
          if (accessToken && refreshToken) {
            // Set the session with the tokens from the URL
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              setStatus("error");
              setError(error.message);
              return;
            }

            if (data.user) {
              // Handle post-confirmation tasks
              await handlePostConfirmation(data.user);

              setStatus("success");
              // Wait a moment to show success message, then redirect to onboarding
              setTimeout(() => {
                router.push("/");
              }, 2000);
            }
          } else {
            setStatus("error");
            setError("Missing authentication tokens");
          }
        } else {
          // If no type parameter, check if user is already authenticated
          const { data: { user } } = await supabase.auth.getUser();

          if (user) {
            router.push("/");
          } else {
            setStatus("error");
            setError("Invalid confirmation link");
          }
        }
      } catch (err) {
        setStatus("error");
        setError("An unexpected error occurred");
        console.error("Callback error:", err);
      }
    };

    const handlePostConfirmation = async (user) => {
      try {
        // Cleanup anonymous user if no onboarding continuation
        const onboardingSession = getOnboardingCourseSession();
        const anonId = onboardingSession?.anonUserId || onboardingSession?.anon_user_id;
        const hasOnboardingContinuation = Boolean(onboardingSession?.jobId && anonId);
        if (!hasOnboardingContinuation) {
          await cleanupAnonUser();
        }

        // Attribute referral if there's a stored code
        const storedRefRaw = localStorage.getItem(REFERRAL_STORAGE_KEY);
        if (storedRefRaw) {
          const storedRef = JSON.parse(storedRefRaw);
          // Check if referral code is still valid (within 30 days)
          if (storedRef?.code && Date.now() - storedRef.timestamp < REFERRAL_EXPIRY_MS) {
            await fetch("/api/referrals/attribute", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                referredUserId: user.id,
                code: storedRef.code,
              }),
            });
            // Clear the stored referral code after attribution
            localStorage.removeItem(REFERRAL_STORAGE_KEY);
          }
        }
      } catch (err) {
        // Don't block confirmation for post-processing errors
        console.error("Post-confirmation error:", err);
      }
    };

    handleEmailConfirmation();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4 text-[var(--foreground)] transition-colors">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] p-8 shadow-sm">
          {status === "verifying" && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <svg
                  className="w-8 h-8 text-[var(--foreground)] animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-2">
                Verifying your email...
              </h1>
              <p className="text-sm text-[var(--muted-foreground)]">
                Please wait while we confirm your account
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
                <svg
                  className="w-8 h-8 text-primary"
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
                Your account has been successfully verified.
              </p>
              <p className="text-sm text-[var(--muted-foreground)] mt-2">
                Redirecting you to get started...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-400/20 mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-2">
                Verification Failed
              </h1>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                {error || "Unable to verify your email"}
              </p>
              <div className="space-y-2">
                <a
                  href="/auth/create-account"
                  className="block w-full bg-primary hover:bg-primary-hover text-gray-900 font-medium py-3 px-4 rounded-lg transition-colors duration-200"
                >
                  Try signing up again
                </a>
                <a
                  href="/"
                  className="block text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                >
                  Return to home
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
