"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { authFetch } from "@/lib/api";

const PLAN_FEATURES = {
  monthly: [
    { text: "Unlimited courses", highlight: true },
    { text: "Unlimited practice exams", highlight: true },
    { text: "Unlimited cheatsheets", highlight: true },
    { text: "Priority support", highlight: false },
    { text: "Cancel anytime", highlight: false },
  ],
  "3month": [
    { text: "Unlimited courses", highlight: true },
    { text: "Unlimited practice exams", highlight: true },
    { text: "Unlimited cheatsheets", highlight: true },
    { text: "Priority support", highlight: false },
    { text: "Best value", highlight: true },
  ],
  "2week_deal": [
    { text: "Unlimited courses", highlight: true },
    { text: "Unlimited practice exams", highlight: true },
    { text: "Unlimited cheatsheets", highlight: true },
    { text: "No auto-renewal", highlight: false },
    { text: "Perfect for exam season", highlight: true },
  ],
};

function formatPrice(unitAmount, currency = "usd") {
  if (!unitAmount) return "$0";
  const amount = unitAmount / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getPeriodLabel(interval, intervalCount, productType) {
  if (productType === "2week_deal") return "one-time";
  if (!interval) return "";
  if (interval === "month" && intervalCount === 1) return "per month";
  if (interval === "month" && intervalCount === 3) return "per 3 months";
  return `per ${intervalCount} ${interval}${intervalCount > 1 ? "s" : ""}`;
}

function calculateSavings(monthlyPrice, planPrice, months) {
  if (!monthlyPrice || !planPrice || !months) return null;
  const fullPrice = (monthlyPrice / 100) * months;
  const actualPrice = planPrice / 100;
  const savings = Math.round(((fullPrice - actualPrice) / fullPrice) * 100);
  return savings > 0 ? savings : null;
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
      fetchPrices();
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

  function handleSubscribe(planId) {
    if (!user) {
      router.push("/auth/sign-in?redirect=/pricing");
      return;
    }
    setSubscribing(planId);
    router.push(`/checkout?productType=${planId}`);
  }

  if (loading || !prices) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--primary)] border-t-transparent"></div>
          <p className="text-sm text-[var(--muted-foreground)]">Loading plans...</p>
        </div>
      </div>
    );
  }

  const hasActiveSubscription = subscriptionStatus?.hasSubscription;
  const twoWeekDealEligible = subscriptionStatus?.twoWeekDealEligible ?? true;

  // Build plans from dynamic prices
  const allPlans = [
    {
      id: "monthly",
      name: "Monthly",
      price: formatPrice(prices.monthly?.unitAmount, prices.monthly?.currency),
      rawPrice: prices.monthly?.unitAmount,
      period: getPeriodLabel(prices.monthly?.interval, prices.monthly?.intervalCount, "monthly"),
      description: "Full access, billed monthly",
      features: PLAN_FEATURES.monthly,
      popular: false,
      available: prices.monthly?.available,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
    },
    {
      id: "3month",
      name: "3 Month",
      price: formatPrice(prices["3month"]?.unitAmount, prices["3month"]?.currency),
      rawPrice: prices["3month"]?.unitAmount,
      period: getPeriodLabel(prices["3month"]?.interval, prices["3month"]?.intervalCount, "3month"),
      description: "Save more with quarterly billing",
      features: PLAN_FEATURES["3month"],
      popular: true,
      available: prices["3month"]?.available,
      savings: calculateSavings(prices.monthly?.unitAmount, prices["3month"]?.unitAmount, 3),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      ),
    },
    {
      id: "2week_deal",
      name: "2 Week Pass",
      price: formatPrice(prices["2week_deal"]?.unitAmount, prices["2week_deal"]?.currency),
      rawPrice: prices["2week_deal"]?.unitAmount,
      period: "one-time payment",
      description: "Perfect for exam crunch time",
      features: PLAN_FEATURES["2week_deal"],
      popular: false,
      isDeal: true,
      available: prices["2week_deal"]?.available && twoWeekDealEligible,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const plans = allPlans.filter(plan => plan.available);
  const hasThreePlans = plans.length === 3;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--surface-1)]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Hero Section */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-sm font-medium mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Upgrade to Pro
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--foreground)] mb-4 tracking-tight">
            Choose your plan
          </h1>
          <p className="text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto">
            Unlock unlimited AI-powered courses, practice exams, and study materials. Study smarter, not harder.
          </p>
        </div>

        {/* Active Subscription Notice */}
        {hasActiveSubscription && (
          <div className="max-w-md mx-auto mb-10">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">You have an active subscription</p>
                <Link href="/subscription" className="text-sm text-[var(--primary)] hover:underline">
                  Manage your subscription →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="max-w-md mx-auto mb-10">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-500">{error}</p>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className={`grid gap-6 lg:gap-8 max-w-5xl mx-auto ${
          hasThreePlans
            ? 'md:grid-cols-3'
            : 'md:grid-cols-2 max-w-3xl'
        }`}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-3xl border-2 transition-all duration-300 ${
                plan.popular
                  ? "border-[var(--primary)] bg-gradient-to-b from-[var(--primary)]/5 to-transparent shadow-xl shadow-[var(--primary)]/10 scale-[1.02] lg:scale-105"
                  : plan.isDeal
                  ? "border-amber-500/50 bg-gradient-to-b from-amber-500/5 to-transparent"
                  : "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--border-hover)] hover:shadow-lg"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="px-4 py-1.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-full shadow-lg shadow-[var(--primary)]/30">
                    Most Popular
                  </div>
                </div>
              )}

              {/* Deal Badge */}
              {plan.isDeal && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-full shadow-lg shadow-amber-500/30 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Exam Season Deal
                  </div>
                </div>
              )}

              <div className="p-6 sm:p-8 flex-1 flex flex-col">
                {/* Plan Header */}
                <div className="mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                    plan.popular
                      ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                      : plan.isDeal
                      ? "bg-amber-500/20 text-amber-600"
                      : "bg-[var(--surface-2)] text-[var(--muted-foreground)]"
                  }`}>
                    {plan.icon}
                  </div>
                  <h3 className="text-xl font-bold text-[var(--foreground)] mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)]">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-bold text-[var(--foreground)]">
                      {plan.price}
                    </span>
                    {plan.savings && (
                      <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-xs font-semibold">
                        Save {plan.savings}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">{plan.period}</p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        feature.highlight
                          ? plan.popular
                            ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                            : plan.isDeal
                            ? "bg-amber-500/20 text-amber-600"
                            : "bg-green-500/20 text-green-600"
                          : "bg-[var(--surface-2)] text-[var(--muted-foreground)]"
                      }`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className={`text-sm ${
                        feature.highlight ? "text-[var(--foreground)] font-medium" : "text-[var(--muted-foreground)]"
                      }`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={hasActiveSubscription || subscribing !== null}
                  className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    plan.popular
                      ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-lg shadow-[var(--primary)]/25 hover:shadow-xl hover:shadow-[var(--primary)]/30 hover:-translate-y-0.5"
                      : plan.isDeal
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5"
                      : "bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--border)] border border-[var(--border)]"
                  }`}
                >
                  {subscribing === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </span>
                  ) : hasActiveSubscription ? (
                    "Already Subscribed"
                  ) : (
                    <>
                      Get {plan.name}
                      <svg className="w-4 h-4 inline-block ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Free Tier Info */}
        <div className="mt-12 sm:mt-16 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)] max-w-2xl mx-auto">
            <div className="w-12 h-12 rounded-xl bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
            <div className="text-center sm:text-left">
              <p className="font-medium text-[var(--foreground)] mb-1">Free tier includes</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                1 course, 2 midterms, 2 finals, and 1 cheatsheet per course
              </p>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-[var(--muted-foreground)]">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Secure payment
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Cancel anytime
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            24/7 support
          </div>
        </div>
      </div>
    </div>
  );
}
