"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function SignUpForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

      // If sign up is successful, redirect to confirmation page
      if (data.user) {
        router.push(`/auth/confirm-email?email=${encodeURIComponent(formData.email)}`);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
  <form onSubmit={handleSubmit} className="space-y-5 text-[var(--foreground)]">
      {error && (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="mb-2 block text-sm font-medium">
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
          className="input w-full disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Your Name"
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          disabled={loading}
          className="input w-full disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium">
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
          className="input w-full disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="••••••••"
        />
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">Minimum 6 characters</p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Creating Account..." : "Sign Up"}
      </button>
    </form>
  );
}
