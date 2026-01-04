"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase/client";

const PLAN_FEATURES = {
  monthly: [
    "Unlimited courses",
    "Unlimited practice exams",
    "Unlimited cheatsheets",
    "Priority support",
  ],
  "3month": [
    "Unlimited courses",
    "Unlimited practice exams",
    "Unlimited cheatsheets",
    "Priority support",
  ],
  "2week_deal": [
    "Unlimited courses",
    "Unlimited practice exams",
    "Unlimited cheatsheets",
    "No auto-renewal",
  ],
};

function formatPrice(unitAmount, currency = "usd") {
  if (!unitAmount) return "$0.00";
  const amount = unitAmount / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

function getPeriodLabel(interval, intervalCount, productType) {
  if (productType === "2week_deal") return "one-time";
  if (!interval) return "";
  if (interval === "month" && intervalCount === 1) return "/month";
  if (interval === "month" && intervalCount === 3) return "/3 months";
  return `/${intervalCount} ${interval}${intervalCount > 1 ? "s" : ""}`;
}

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [prices, setPrices] = useState(null);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function init() {
      // Fetch prices (doesn't require auth)
      fetchPrices();

      // Check auth status
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        await fetchSubscriptionStatus();
      }
      setLoading(false);
    }
    init();
  }, []);

  async function fetchPrices() {
    try {
      const res = await fetch("/api/stripe?endpoint=prices");
      const data = await res.json();
      setPrices(data);
    } catch (err) {
      console.error("Failed to fetch prices:", err);
    }
  }

  async function fetchSubscriptionStatus() {
    try {
      const res = await authFetch("/api/stripe?endpoint=subscription-status");
      const data = await res.json();
      setSubscriptionStatus(data);
    } catch (err) {
      console.error("Failed to fetch subscription status:", err);
    }
  }

  async function handleSubscribe(planId) {
    if (!user) {
      router.push("/auth/sign-in?redirect=/pricing");
      return;
    }

    setSubscribing(planId);
    setError(null);

    try {
      const res = await authFetch("/api/stripe?endpoint=create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productType: planId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      router.push(`/checkout?clientSecret=${data.clientSecret}&productType=${planId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubscribing(null);
    }
  }

  if (loading || !prices) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  const hasActiveSubscription = subscriptionStatus?.hasSubscription;
  const twoWeekDealEligible = subscriptionStatus?.twoWeekDealEligible ?? true;

  // Build plans from dynamic prices
  const plans = [
    {
      id: "monthly",
      name: prices.monthly?.productName || "Monthly",
      price: formatPrice(prices.monthly?.unitAmount, prices.monthly?.currency),
      period: getPeriodLabel(prices.monthly?.interval, prices.monthly?.intervalCount, "monthly"),
      description: prices.monthly?.productDescription || "Full access, billed monthly",
      features: PLAN_FEATURES.monthly,
      popular: false,
      available: prices.monthly?.available,
    },
    {
      id: "3month",
      name: prices["3month"]?.productName || "3 Month",
      price: formatPrice(prices["3month"]?.unitAmount, prices["3month"]?.currency),
      period: getPeriodLabel(prices["3month"]?.interval, prices["3month"]?.intervalCount, "3month"),
      description: prices["3month"]?.productDescription || "Save with quarterly billing",
      features: PLAN_FEATURES["3month"],
      popular: true,
      available: prices["3month"]?.available,
    },
    {
      id: "2week_deal",
      name: prices["2week_deal"]?.productName || "2 Week Trial",
      price: formatPrice(prices["2week_deal"]?.unitAmount, prices["2week_deal"]?.currency),
      period: "one-time",
      description: prices["2week_deal"]?.productDescription || "Try everything for 2 weeks",
      features: PLAN_FEATURES["2week_deal"],
      popular: false,
      isDeal: true,
      available: prices["2week_deal"]?.available && twoWeekDealEligible,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Unlock unlimited access to AI-powered course generation, practice exams, and study materials.
          </p>
        </div>

        {hasActiveSubscription && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-[var(--accent)]/10 border border-[var(--accent)] rounded-lg text-center">
            <p className="text-[var(--text-primary)]">
              You already have an active subscription.{" "}
              <Link href="/subscription" className="text-[var(--accent)] underline">
                Manage your subscription
              </Link>
            </p>
          </div>
        )}

        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-500/10 border border-red-500 rounded-lg text-center">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => {
            if (!plan.available) return null;

            return (
              <div
                key={plan.id}
                className={`relative bg-[var(--bg-secondary)] rounded-2xl p-8 border ${
                  plan.popular
                    ? "border-[var(--accent)] ring-2 ring-[var(--accent)]"
                    : "border-[var(--border)]"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[var(--accent)] text-white text-sm font-medium rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-[var(--text-primary)]">
                      {plan.price}
                    </span>
                    <span className="text-[var(--text-secondary)]">{plan.period}</span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mt-2">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-[var(--text-primary)]">
                      <svg
                        className="w-5 h-5 text-green-500 flex-shrink-0"
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

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={hasActiveSubscription || subscribing !== null}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    plan.popular
                      ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                      : "bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--border)]"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {subscribing === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
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
                    </span>
                  ) : hasActiveSubscription ? (
                    "Already Subscribed"
                  ) : (
                    "Get Started"
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-[var(--text-secondary)]">
            Free tier includes: 1 course, 2 midterms, 2 finals, and 1 cheatsheet per course.
          </p>
        </div>
      </div>
    </div>
  );
}
