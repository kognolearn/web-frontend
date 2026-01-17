"use client";

import Link from "next/link";
import Image from "next/image";
import HeroSection from "./HeroSection";
import FeaturesSection from "./FeaturesSection";
import HowItWorksSection from "./HowItWorksSection";
import FAQSection from "./FAQSection";
import Footer from "./Footer";

export default function LandingPage() {
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
                href="/auth/sign-in"
                className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  const heroForm = document.querySelector("#name");
                  if (heroForm) {
                    heroForm.focus();
                    heroForm.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary)]/90 transition-colors shadow-lg shadow-[var(--primary)]/20"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <FAQSection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
