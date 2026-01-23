"use client";

import Link from "next/link";

export default function PremiumUpgradeModal({
  isOpen,
  onClose,
  title = "Premium Feature",
  description = "This feature is only available for premium users.",
}) {
  if (!isOpen) return null;

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
          <div className="w-16 h-16 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">
            {title}
          </h3>
          <p className="text-[var(--muted-foreground)]">
            {description}
          </p>
        </div>

        {/* Pro features */}
        <div className="bg-[var(--surface-2)] rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-[var(--foreground)] mb-3">Upgrade to premium to unlock:</p>
          <ul className="space-y-2">
            {[
              'All store rewards',
              'Unlimited courses',
              'Unlimited practice exams',
              'Priority support'
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href="/?continueNegotiation=1"
            onClick={onClose}
            className="w-full py-3 px-4 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors text-center"
          >
            Upgrade to Premium
          </Link>
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-[var(--surface-2)] text-[var(--foreground)] rounded-lg font-medium hover:bg-[var(--surface-3)] transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
