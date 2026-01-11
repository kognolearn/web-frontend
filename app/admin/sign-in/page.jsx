"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function AdminSignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Handle error from URL params (e.g., not_admin)
  useEffect(() => {
    if (errorParam === "not_admin") {
      setError("Access denied. This account does not have admin privileges.");
    }
  }, [errorParam]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Sign out first to clear any existing session
      await supabase.auth.signOut();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Check if user is admin before redirecting
        const { data: adminData, error: adminError } = await supabase
          .from("admins")
          .select("email")
          .eq("email", data.user.email)
          .single();

        if (adminError || !adminData) {
          setError("Access denied. This account does not have admin privileges.");
          // Sign out the non-admin user
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        // User is admin, redirect to admin dashboard
        router.push("/admin");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[var(--background)] px-4 py-12 overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, rgba(220, 38, 38, 0.15) 0%, transparent 100%)` }}
        />
        <div
          className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, rgba(220, 38, 38, 0.1) 0%, transparent 100%)` }}
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
          <span className="ml-2 px-2 py-1 text-xs font-semibold bg-red-600 text-white rounded">
            Admin
          </span>
        </div>

        <div className="rounded-2xl border border-red-500/20 bg-[var(--surface-1)]/80 backdrop-blur-xl p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">Admin Access</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Sign in with your admin credentials
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 text-[var(--foreground)]">
            {error && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

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
                className="w-full px-4 py-3 rounded-xl border border-white/10 dark:border-white/5 bg-[var(--surface-2)]/50 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="admin@kognolearn.com"
              />
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
                className="w-full px-4 py-3 rounded-xl border border-white/10 dark:border-white/5 bg-[var(--surface-2)]/50 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 px-4 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-[var(--background)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/20"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying access...
                </span>
              ) : "Sign in to Admin"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              &larr; Back to Kogno
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
          This area is restricted to authorized administrators only.
        </p>
      </div>
    </div>
  );
}
