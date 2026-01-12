"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase/client";
import { isDesktopApp } from "@/lib/platform";
import { isDownloadRedirectEnabled } from "@/lib/featureFlags";

export default function SubscriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [error, setError] = useState(null);
  const forceDownloadRedirect = isDownloadRedirectEnabled();

  // Redirect web users to download page (backup guard - middleware handles this primarily)
  useEffect(() => {
    if (forceDownloadRedirect && !isDesktopApp()) {
      router.replace('/download');
    }
  }, [forceDownloadRedirect, router]);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/sign-in?redirect=/subscription");
        return;
      }
      fetchSubscriptionStatus();
    }
    checkAuth();
  }, [router]);

  async function fetchSubscriptionStatus() {
    try {
      const res = await authFetch("/api/stripe?endpoint=subscription-status");
      const data = await res.json();
      setSubscriptionStatus(data);
    } catch (err) {
      setError("Failed to fetch subscription status");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleManageSubscription() {
    setPortalLoading(true);
    setError(null);

    try {
      const res = await authFetch("/api/stripe?endpoint=create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create portal session");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  const { hasSubscription, subscription, planLevel } = subscriptionStatus || {};

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getProductLabel = (productType) => {
    switch (productType) {
      case "monthly":
        return "Monthly Plan";
      case "3month":
        return "3 Month Plan";
      case "2week_deal":
        return "2 Week Access";
      default:
        return productType;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-8">
          Subscription
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        <div className="bg-[var(--bg-secondary)] rounded-2xl p-8 border border-[var(--border)]">
          {hasSubscription ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-500"
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
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                    {getProductLabel(subscription?.productType)}
                  </h2>
                  <p className="text-[var(--text-secondary)]">
                    Status: <span className="text-green-500 capitalize">{subscription?.status}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between py-3 border-b border-[var(--border)]">
                  <span className="text-[var(--text-secondary)]">Plan</span>
                  <span className="text-[var(--text-primary)] font-medium">
                    {getProductLabel(subscription?.productType)}
                  </span>
                </div>

                {subscription?.productType !== "2week_deal" && (
                  <div className="flex justify-between py-3 border-b border-[var(--border)]">
                    <span className="text-[var(--text-secondary)]">Next billing date</span>
                    <span className="text-[var(--text-primary)] font-medium">
                      {subscription?.cancelAtPeriodEnd
                        ? "Canceled"
                        : formatDate(subscription?.currentPeriodEnd)}
                    </span>
                  </div>
                )}

                {subscription?.productType === "2week_deal" && (
                  <div className="flex justify-between py-3 border-b border-[var(--border)]">
                    <span className="text-[var(--text-secondary)]">Access expires</span>
                    <span className="text-[var(--text-primary)] font-medium">
                      {formatDate(subscription?.currentPeriodEnd)}
                    </span>
                  </div>
                )}

                {subscription?.cancelAtPeriodEnd && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500 rounded-lg">
                    <p className="text-yellow-600">
                      Your subscription will end on {formatDate(subscription?.currentPeriodEnd)}.
                      You can reactivate it from the billing portal.
                    </p>
                  </div>
                )}
              </div>

              {subscription?.productType !== "2week_deal" && (
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="w-full py-3 px-4 bg-[var(--accent)] text-white rounded-lg font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                >
                  {portalLoading ? (
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
                      Loading...
                    </span>
                  ) : (
                    "Manage Subscription"
                  )}
                </button>
              )}
            </>
          ) : (
            <>
              <div className="text-center">
                <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-8 h-8 text-[var(--text-secondary)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                </div>

                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                  Free Plan
                </h2>
                <p className="text-[var(--text-secondary)] mb-6">
                  You're currently on the free plan with limited access.
                </p>

                <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 mb-6">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Free plan includes: 1 course, 2 midterms, 2 finals, and 1 cheatsheet per course.
                  </p>
                </div>

                <Link
                  href="/pricing"
                  className="inline-block w-full py-3 px-4 bg-[var(--accent)] text-white rounded-lg font-medium hover:bg-[var(--accent-hover)] transition-colors text-center"
                >
                  Upgrade to Pro
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
