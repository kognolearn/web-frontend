"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import Link from "next/link";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Dark theme appearance configuration for Elements
const appearance = {
  theme: "night",
  variables: {
    colorPrimary: "#6366f1",
    colorBackground: "#18181b",
    colorText: "#fafafa",
    colorDanger: "#ef4444",
    colorTextSecondary: "#a1a1aa",
    colorTextPlaceholder: "#71717a",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSizeBase: "16px",
    spacingUnit: "4px",
    borderRadius: "8px",
    focusBoxShadow: "0 0 0 2px rgba(99, 102, 241, 0.5)",
    focusOutline: "none",
  },
  rules: {
    ".Input": {
      backgroundColor: "#27272a",
      border: "1px solid #3f3f46",
      boxShadow: "none",
      padding: "12px",
    },
    ".Input:hover": {
      border: "1px solid #52525b",
    },
    ".Input:focus": {
      border: "1px solid #6366f1",
      boxShadow: "0 0 0 2px rgba(99, 102, 241, 0.2)",
    },
    ".Input--invalid": {
      border: "1px solid #ef4444",
    },
    ".Label": {
      color: "#a1a1aa",
      marginBottom: "8px",
    },
    ".Tab": {
      backgroundColor: "#27272a",
      border: "1px solid #3f3f46",
      color: "#a1a1aa",
    },
    ".Tab:hover": {
      backgroundColor: "#3f3f46",
      color: "#fafafa",
    },
    ".Tab--selected": {
      backgroundColor: "#6366f1",
      borderColor: "#6366f1",
      color: "#ffffff",
    },
    ".TabIcon": {
      fill: "#a1a1aa",
    },
    ".TabIcon--selected": {
      fill: "#ffffff",
    },
    ".Block": {
      backgroundColor: "#27272a",
      border: "1px solid #3f3f46",
      borderRadius: "8px",
    },
    ".CheckboxInput": {
      backgroundColor: "#27272a",
      borderColor: "#3f3f46",
    },
    ".CheckboxInput--checked": {
      backgroundColor: "#6366f1",
      borderColor: "#6366f1",
    },
  },
};

function CheckoutForm({ productType, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
    });

    if (error) {
      // Payment failed - show error
      setErrorMessage(error.message);
      setIsProcessing(false);
      onError?.(error.message);
    } else {
      // Payment succeeded - redirect handled by Stripe
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg">
          <p className="text-red-500 text-sm">{errorMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full py-4 px-6 bg-[var(--primary)] text-white font-medium rounded-lg hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Processing...
          </>
        ) : (
          "Pay Now"
        )}
      </button>

      <p className="text-center text-sm text-[var(--text-secondary)]">
        Your payment is secured by Stripe
      </p>
    </form>
  );
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const productType = searchParams.get("productType");

  useEffect(() => {
    if (!productType) {
      router.push("/pricing");
      return;
    }

    // Create the checkout session for Elements
    async function createCheckout() {
      try {
        const { data: { session } } = await (await import("@/lib/supabase/client")).supabase.auth.getSession();

        const res = await fetch("/api/stripe?endpoint=create-elements-checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ productType }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to create checkout session");
        }

        setClientSecret(data.clientSecret);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    createCheckout();
  }, [productType, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] py-8 px-4">
        <div className="max-w-lg mx-auto">
          <div className="mb-8">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Pricing
            </Link>
          </div>

          <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Unable to Load Checkout</h2>
              <p className="text-[var(--text-secondary)] mb-6">{error}</p>
              <Link
                href="/pricing"
                className="inline-block py-3 px-6 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors"
              >
                Return to Pricing
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  const productNames = {
    monthly: "Monthly Subscription",
    "3month": "3-Month Subscription",
    "2week_deal": "2-Week Access",
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Pricing
          </Link>
        </div>

        <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Complete Your Purchase</h1>
            <p className="text-[var(--text-secondary)]">{productNames[productType] || "Subscription"}</p>
          </div>

          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance,
            }}
          >
            <CheckoutForm
              productType={productType}
              onError={(msg) => setError(msg)}
            />
          </Elements>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            By completing this purchase, you agree to our{" "}
            <Link href="/terms" className="text-[var(--primary)] hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-[var(--primary)] hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent)]"></div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
