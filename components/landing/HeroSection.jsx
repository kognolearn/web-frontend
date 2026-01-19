"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import SignUpForm from "@/components/auth/SignUpForm";

export default function HeroSection({ signInHref = "/auth/sign-in" }) {
  return (
    <section className="relative min-h-[90vh] flex items-center py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left side - Hero copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
              Learn Smarter,
              <span className="block text-[var(--primary)]">Not Harder</span>
            </h1>
            <p className="text-lg sm:text-xl text-[var(--muted-foreground)] max-w-xl mx-auto lg:mx-0 leading-relaxed mb-8">
              Upload your syllabus. Get an AI-powered study plan, flashcards, practice exams, and an AI tutor—all personalized to your course.
            </p>
            <div className="flex items-center justify-center lg:justify-start gap-2 text-sm text-[var(--muted-foreground)]">
              <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>For students with .edu email addresses</span>
            </div>
          </motion.div>

          {/* Right side - Sign up form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto"
          >
            <div className="rounded-2xl border border-white/10 bg-[var(--surface-1)]/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
              <div className="mb-6 text-center">
                <h2 className="text-xl font-semibold mb-2">Start learning for free</h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Create your account in seconds
                </p>
              </div>
              <SignUpForm variant="embedded" />
              <div className="mt-6 pt-4 border-t border-white/10 text-center">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Already have an account?{" "}
                  <Link href={signInHref} className="text-[var(--primary)] hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
