"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import HeroSection from "./HeroSection";
import FeaturesSection from "./FeaturesSection";
import HowItWorksSection from "./HowItWorksSection";
import FAQSection from "./FAQSection";
import Footer from "./Footer";
import { extractJoinToken, getJoinRedirectPath, isJoinPath, storeJoinIntent } from "@/lib/join-intent";

export default function LandingPage() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  const joinFromParam = isJoinPath(redirectTo) ? redirectTo : null;
  const [joinRedirect, setJoinRedirect] = useState(joinFromParam);

  useEffect(() => {
    if (joinFromParam) {
      const token = extractJoinToken(joinFromParam);
      if (token) storeJoinIntent(token);
      setJoinRedirect(joinFromParam);
      return;
    }
    const stored = getJoinRedirectPath();
    if (stored) {
      setJoinRedirect(stored);
    }
  }, [joinFromParam]);

  const signInHref = useMemo(() => {
    if (joinRedirect) {
      return `/auth/sign-in?redirectTo=${encodeURIComponent(joinRedirect)}`;
    }
    return "/auth/sign-in";
  }, [joinRedirect]);

  const focusSignup = (event) => {
    event?.preventDefault?.();
    const heroForm = document.querySelector("#name");
    if (heroForm) {
      heroForm.focus();
      heroForm.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Gradient blur - top right */}
        <div
          className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, rgba(var(--primary-rgb), var(--grid-glow-opacity)) 0%, transparent 100%)`,
          }}
        />
        {/* Gradient blur - bottom left */}
        <div
          className="absolute top-1/2 -left-40 h-[500px] w-[500px] rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.5)) 0%, transparent 100%)`,
          }}
        />
        {/* Gradient blur - bottom right for footer area */}
        <div
          className="absolute -bottom-40 right-1/4 h-[400px] w-[400px] rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.3)) 0%, transparent 100%)`,
          }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/images/kogno_logo.png" alt="Kogno" width={32} height={32} />
              <span className="text-xl font-bold text-[var(--primary)]">Kogno</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                How it works
              </a>
              <a href="#faq" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                FAQ
              </a>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href={signInHref}
                className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="#"
                onClick={focusSignup}
                className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary)]/90 transition-colors shadow-lg shadow-[var(--primary)]/20"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {joinRedirect && (
        <div className="relative z-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4 shadow-lg shadow-emerald-500/10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-500">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8M3 7h6m0 0V3m0 4L3 13" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">You're invited to join a course</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Create your account below to accept the invite, or sign in if you already have one.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={focusSignup}
                    className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary)]/90 transition-colors shadow-lg shadow-[var(--primary)]/20"
                  >
                    Sign up to join
                  </button>
                  <Link
                    href={signInHref}
                    className="px-4 py-2 rounded-xl border border-white/10 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-1)] transition-colors"
                  >
                    Sign in instead
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="relative z-10">
        <HeroSection signInHref={signInHref} />
        <FeaturesSection />
        <HowItWorksSection />
        <FAQSection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
