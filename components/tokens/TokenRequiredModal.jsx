"use client";

import { useState } from "react";
import Link from "next/link";
import TokenPurchaseModal from "./TokenPurchaseModal";

export default function TokenRequiredModal({
  isOpen,
  onClose,
  tokensAvailable = 0,
}) {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  if (!isOpen) return null;

  if (showPurchaseModal) {
    return (
      <TokenPurchaseModal
        isOpen={true}
        onClose={() => setShowPurchaseModal(false)}
        onPurchaseComplete={() => {
          setShowPurchaseModal(false);
          onClose();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
<<<<<<< HEAD
          <div className="w-16 h-16 rounded-full bg-[var(--primary)]/15 flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--primary)]" fill="currentColor" viewBox="0 0 24 24">
=======
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
>>>>>>> origin/main
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">
            Generation Token Required
          </h3>
          <p className="text-[var(--muted-foreground)]">
            {tokensAvailable === 0
              ? "You need a generation token to create a new course. Purchase tokens or upgrade to premium for unlimited course generation."
              : `You have ${tokensAvailable} token${tokensAvailable > 1 ? "s" : ""} remaining.`}
          </p>
        </div>

        {/* Token balance display */}
        <div className="bg-[var(--surface-2)] rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[var(--muted-foreground)]">Your tokens</span>
<<<<<<< HEAD
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--primary)]/15 rounded-full">
              <svg className="w-4 h-4 text-[var(--primary)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
              </svg>
              <span className="font-bold text-[var(--primary)]">{tokensAvailable}</span>
=======
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 rounded-full">
              <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
              </svg>
              <span className="font-bold text-amber-600">{tokensAvailable}</span>
>>>>>>> origin/main
            </div>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            1 token = 1 course generation
          </p>
        </div>

        {/* Premium features */}
<<<<<<< HEAD
        <div className="bg-purple-600/10 rounded-lg p-4 mb-6 border border-purple-500/30">
=======
        <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-lg p-4 mb-6 border border-purple-500/20">
>>>>>>> origin/main
          <p className="text-sm font-medium text-[var(--foreground)] mb-3">
            Premium includes:
          </p>
          <ul className="space-y-2">
            {[
              "Unlimited course generation",
              "Unlimited practice exams",
              "Unlimited cheatsheets",
              "Priority support",
            ].map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]"
              >
                <svg
                  className="w-4 h-4 text-green-500 flex-shrink-0"
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
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setShowPurchaseModal(true)}
            className="w-full py-3 px-4 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            Buy Tokens
          </button>

          <Link
            href="/subscription"
            onClick={onClose}
<<<<<<< HEAD
            className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-500 transition-colors text-center"
=======
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-indigo-600 transition-all text-center"
>>>>>>> origin/main
          >
            Go Premium - $14.99/mo
          </Link>

          <Link
            href="/discount"
            onClick={onClose}
            className="text-center text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            Need a discount? Talk to us
          </Link>

          <button
            onClick={onClose}
            className="w-full py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
