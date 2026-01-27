"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/api";

const TOKEN_PACKAGES = [
  { id: "1_token", tokens: 1, price: "$2.99", priceCents: 299 },
  { id: "2_tokens", tokens: 2, price: "$3.99", priceCents: 399, popular: true },
  { id: "5_tokens", tokens: 5, price: "$5.99", priceCents: 599, bestValue: true },
];

export default function TokenPurchaseModal({
  isOpen,
  onClose,
  onPurchaseComplete,
}) {
  const [selectedPackage, setSelectedPackage] = useState("2_tokens");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handlePurchase = async () => {
    try {
      setLoading(true);
      setError(null);

      const returnUrl = `${window.location.origin}/tokens?purchase=success`;

      const res = await authFetch("/api/tokens/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageType: selectedPackage,
          returnUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create checkout session");
      }

      const data = await res.json();

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      } else if (data.clientSecret) {
        // For embedded checkout, you'd use Stripe Elements here
        // For now, just close and show success
        onPurchaseComplete?.();
        onClose();
      }
    } catch (err) {
      console.error("Purchase error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedPkg = TOKEN_PACKAGES.find((p) => p.id === selectedPackage);
  const pricePerToken = selectedPkg
    ? (selectedPkg.priceCents / selectedPkg.tokens / 100).toFixed(2)
    : "0.00";

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

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              Buy Generation Tokens
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Use tokens to create new courses
            </p>
          </div>
        </div>

        {/* Package selection */}
        <div className="space-y-3 mb-6">
          {TOKEN_PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg.id)}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left relative ${
                selectedPackage === pkg.id
                  ? "border-[var(--primary)] bg-[var(--primary)]/5"
                  : "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--muted-foreground)]"
              }`}
            >
              {pkg.popular && (
                <span className="absolute -top-2 right-3 px-2 py-0.5 bg-[var(--primary)] text-white text-xs font-medium rounded-full">
                  Popular
                </span>
              )}
              {pkg.bestValue && (
                <span className="absolute -top-2 right-3 px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full">
                  Best Value
                </span>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPackage === pkg.id
                      ? "border-[var(--primary)] bg-[var(--primary)]"
                      : "border-[var(--muted-foreground)]"
                  }`}>
                    {selectedPackage === pkg.id && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--foreground)]">
                      {pkg.tokens} Token{pkg.tokens > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      ${(pkg.priceCents / pkg.tokens / 100).toFixed(2)} per token
                    </p>
                  </div>
                </div>
                <span className="text-lg font-bold text-[var(--foreground)]">
                  {pkg.price}
                </span>
              </div>
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {/* Summary */}
        <div className="bg-[var(--surface-2)] rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-[var(--muted-foreground)]">
              {selectedPkg?.tokens} token{selectedPkg?.tokens > 1 ? "s" : ""}
            </span>
            <span className="font-medium text-[var(--foreground)]">
              {selectedPkg?.price}
            </span>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            One-time purchase. Tokens never expire.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handlePurchase}
            disabled={loading}
            className="w-full py-3 px-4 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </>
            ) : (
              `Purchase ${selectedPkg?.tokens} Token${selectedPkg?.tokens > 1 ? "s" : ""}`
            )}
          </button>

          {/* Alternative: Go Premium */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border)]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[var(--surface-1)] px-3 text-xs text-[var(--muted-foreground)]">
                or
              </span>
            </div>
          </div>

          <Link
            href="/subscription"
            onClick={onClose}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-indigo-600 transition-all text-center"
          >
            Go Premium for $14.99/mo - Unlimited Tokens
          </Link>

          <Link
            href="/discount"
            onClick={onClose}
            className="text-center text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            Need a discount? Talk to us
          </Link>
        </div>
      </div>
    </div>
  );
}
