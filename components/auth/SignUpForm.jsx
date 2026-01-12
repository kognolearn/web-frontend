"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { cleanupAnonUser } from "@/lib/onboarding";
import { getRedirectDestination } from "@/lib/platform";

const REFERRAL_STORAGE_KEY = "kogno_ref";
const REFERRAL_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export default function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  const refCode = searchParams.get("ref");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Capture referral code from URL and store in localStorage
  useEffect(() => {
    if (refCode) {
      try {
        localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify({
          code: refCode,
          timestamp: Date.now(),
        }));
      } catch (err) {
        console.error("Failed to store referral code:", err);
      }
    }
  }, [refCode]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate @uw.edu email
    if (!formData.email.toLowerCase().endsWith("@uw.edu")) {
      setError("Only @uw.edu email addresses are allowed.");
      setLoading(false);
      return;
    }

    try {
      console.log('Redirect URL:', `${window.location.origin}/auth/callback`);
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // If account creation is successful, attribute referral and redirect
      if (data.user) {
        await cleanupAnonUser();

        // Attribute referral if there's a stored code
        try {
          const storedRefRaw = localStorage.getItem(REFERRAL_STORAGE_KEY);
          if (storedRefRaw) {
            const storedRef = JSON.parse(storedRefRaw);
            // Check if referral code is still valid (within 30 days)
            if (storedRef?.code && Date.now() - storedRef.timestamp < REFERRAL_EXPIRY_MS) {
              await fetch("/api/referrals/attribute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  referredUserId: data.user.id,
                  code: storedRef.code,
                }),
              });
              // Clear the stored referral code after attribution
              localStorage.removeItem(REFERRAL_STORAGE_KEY);
            }
          }
        } catch (refErr) {
          // Don't block account creation for referral errors
          console.error("Failed to attribute referral:", refErr);
        }

        // Redirect to download page to get the desktop app
        router.push(getRedirectDestination(redirectTo || "/dashboard"));
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-[var(--foreground)]">
      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="mb-2 block text-sm font-medium text-[var(--muted-foreground)]">
          Full Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          disabled={loading}
          className="w-full px-4 py-3 rounded-xl border border-white/10 dark:border-white/5 bg-[var(--surface-2)]/50 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-transparent transition-all disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Your name"
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-[var(--muted-foreground)]">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          disabled={loading}
          className="w-full px-4 py-3 rounded-xl border border-white/10 dark:border-white/5 bg-[var(--surface-2)]/50 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-transparent transition-all disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="you@uw.edu"
        />
        <p className="mt-2 text-xs text-[var(--muted-foreground)]/70">Must be a @uw.edu email address</p>
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-[var(--muted-foreground)]">
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
          disabled={loading}
          minLength={6}
          className="w-full px-4 py-3 rounded-xl border border-white/10 dark:border-white/5 bg-[var(--surface-2)]/50 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-transparent transition-all disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="••••••••"
        />
        <p className="mt-2 text-xs text-[var(--muted-foreground)]/70">Minimum 6 characters</p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full mt-2 px-4 py-3 rounded-xl bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:ring-offset-2 focus:ring-offset-[var(--background)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[var(--primary)]/20"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Creating account...
          </span>
        ) : "Create account"}
      </button>
    </form>
  );
}
