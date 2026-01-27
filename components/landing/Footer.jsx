"use client";

import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-[var(--surface-1)]/30">
      {/* CTA Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
            Ready to study smarter?
          </h2>
          <p className="text-[var(--muted-foreground)] mb-8 text-lg">
            Join thousands of students who are acing their classes with Kogno.
          </p>
          <Link
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary)]/90 transition-colors shadow-lg shadow-[var(--primary)]/20"
          >
            Get started free
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image src="/images/kogno_logo.png" alt="Kogno" width={24} height={24} />
              <span className="font-semibold text-[var(--primary)]">Kogno</span>
            </div>

            <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--muted-foreground)]">
              <Link href="/auth/sign-in" className="hover:text-[var(--foreground)] transition-colors">
                Sign in
              </Link>
              <a href="mailto:team@kognolearn.com" className="hover:text-[var(--foreground)] transition-colors">
                Contact
              </a>
              <Link href="/legal/privacy" className="hover:text-[var(--foreground)] transition-colors">
                Privacy
              </Link>
              <Link href="/legal/terms" className="hover:text-[var(--foreground)] transition-colors">
                Terms
              </Link>
            </nav>

            <p className="text-sm text-[var(--muted-foreground)]">
              &copy; {currentYear} Kogno. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
