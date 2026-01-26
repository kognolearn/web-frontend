"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GoogleSignInButton from "./GoogleSignInButton";

const REFERRAL_STORAGE_KEY = "kogno_ref";
const OTP_FLOW_STORAGE_KEY = "kogno_otp_flow";

/**
 * SignUpForm component
 * @param {Object} props
 * @param {"standalone" | "embedded"} props.variant - "standalone" (default) renders with full styling, "embedded" renders a compact version for hero sections
 */
export default function SignUpForm({ variant = "standalone", redirectTo: redirectOverride = null }) {
  const isEmbedded = variant === "embedded";
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");
  const redirectParam = searchParams.get("redirectTo");
  const redirectTo = redirectOverride || redirectParam || "";
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

    // Validate .edu email
    if (!formData.email.toLowerCase().endsWith(".edu")) {
      setError("Use a student email address");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.name,
          mode: "signup",
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.error || "Unable to send verification code.");
        setLoading(false);
        return;
      }

      try {
        localStorage.setItem(OTP_FLOW_STORAGE_KEY, JSON.stringify({
          email: formData.email,
          verificationType: payload?.verificationType || "signup",
          timestamp: Date.now(),
        }));
        if (redirectTo) {
          localStorage.setItem("kogno_signup_redirect", JSON.stringify({
            redirectTo,
            timestamp: Date.now(),
          }));
        }
      } catch (err) {
        console.error("Failed to store OTP flow info:", err);
      }

      const confirmUrl = `/auth/confirm-email?email=${encodeURIComponent(formData.email)}${redirectTo ? `&redirectTo=${encodeURIComponent(redirectTo)}` : ""}`;
      router.push(confirmUrl);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const inputBaseClasses = "w-full px-4 py-3 rounded-xl border text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-transparent transition-all disabled:cursor-not-allowed disabled:opacity-50";
  const inputVariantClasses = isEmbedded
    ? "border-white/20 bg-white/10 backdrop-blur-sm"
    : "border-white/10 dark:border-white/5 bg-[var(--surface-2)]/50";

  return (
    <form onSubmit={handleSubmit} className={`text-[var(--foreground)] ${isEmbedded ? "space-y-4" : "space-y-5"}`}>
      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className={`mb-2 block text-sm font-medium ${isEmbedded ? "text-[var(--foreground)]/80" : "text-[var(--muted-foreground)]"}`}>
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
          className={`${inputBaseClasses} ${inputVariantClasses}`}
          placeholder="Your name"
        />
      </div>

      <div>
        <label htmlFor="email" className={`mb-2 block text-sm font-medium ${isEmbedded ? "text-[var(--foreground)]/80" : "text-[var(--muted-foreground)]"}`}>
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
          className={`${inputBaseClasses} ${inputVariantClasses}`}
          placeholder="you@university.edu"
        />
        <p className={`mt-2 text-xs ${isEmbedded ? "text-[var(--foreground)]/60" : "text-[var(--muted-foreground)]/70"}`}>Must be a .edu email address</p>
      </div>

      <div>
        <label htmlFor="password" className={`mb-2 block text-sm font-medium ${isEmbedded ? "text-[var(--foreground)]/80" : "text-[var(--muted-foreground)]"}`}>
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
          className={`${inputBaseClasses} ${inputVariantClasses}`}
          placeholder="••••••••"
        />
        <p className={`mt-2 text-xs ${isEmbedded ? "text-[var(--foreground)]/60" : "text-[var(--muted-foreground)]/70"}`}>Minimum 6 characters</p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full px-4 py-3 rounded-xl bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:ring-offset-2 focus:ring-offset-[var(--background)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[var(--primary)]/20 ${isEmbedded ? "mt-2" : "mt-2"}`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Creating account...
          </span>
        ) : "Get started"}
      </button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10 dark:border-white/5"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className={`px-4 ${isEmbedded ? "bg-transparent" : "bg-[var(--surface-1)]"} text-[var(--muted-foreground)]`}>
            or
          </span>
        </div>
      </div>

      <GoogleSignInButton
        mode="signup"
        redirectTo={redirectTo || null}
        disabled={loading}
      />

      <p className={`mt-3 text-xs text-center ${isEmbedded ? "text-[var(--foreground)]/60" : "text-[var(--muted-foreground)]/70"}`}>
        Google sign-up requires a .edu email
      </p>
    </form>
  );
}
