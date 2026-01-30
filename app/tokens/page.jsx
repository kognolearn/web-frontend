"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import TokenPurchaseModal from "@/components/tokens/TokenPurchaseModal";
import { authFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase/client";
import DashboardSidebar from "@/components/navigation/DashboardSidebar";

export default function TokensPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [nextMonthlyTokenDate, setNextMonthlyTokenDate] = useState(null);
  const purchaseStatus = searchParams.get("purchase");

  useEffect(() => {
    async function checkAuthAndFetch() {
      const { data: { user } } = await supabase.auth.getUser();
      // Anonymous users should not access tokens page - redirect to home
      if (!user || user.is_anonymous) {
        router.push("/");
        return;
      }
      fetchData();
    }
    checkAuthAndFetch();
  }, [router]);

  // After a successful Stripe redirect, poll briefly so tokens appear once the webhook processes.
  useEffect(() => {
    if (purchaseStatus !== "success") return;

    let attempts = 0;
    const maxAttempts = 6;
    const interval = setInterval(() => {
      attempts += 1;
      fetchData();
      if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [purchaseStatus]);

  const fetchData = async () => {
    try {
      const [planRes, balanceRes, transactionsRes] = await Promise.all([
        authFetch("/api/user/plan"),
        authFetch("/api/tokens/balance"),
        authFetch("/api/tokens/transactions"),
      ]);

      if (!planRes.ok) {
        router.push("/login?redirect=/tokens");
        return;
      }

      const [planData, balancePayload, transactionsPayload] = await Promise.all([
        planRes.json(),
        balanceRes.ok ? balanceRes.json() : null,
        transactionsRes.ok ? transactionsRes.json() : null,
      ]);

      setUserPlan(planData);
      setTokenBalance(balancePayload?.balance ?? null);
      setTransactions(
        transactionsPayload?.transactions ||
        balancePayload?.recentTransactions ||
        []
      );
      // Store next monthly token date
      if (balancePayload?.monthlyToken?.nextDate) {
        setNextMonthlyTokenDate(balancePayload.monthlyToken.nextDate);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseComplete = () => {
    setShowPurchaseModal(false);
    fetchData(); // Refresh data
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case "purchase":
        return (
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        );
      case "use":
        return (
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case "refund":
        return (
          <div className="w-8 h-8 rounded-full bg-[var(--primary)]/15 flex items-center justify-center">
            <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </div>
        );
      case "bonus":
      case "free_grant":
        return (
          <div className="w-8 h-8 rounded-full bg-[var(--primary)]/15 flex items-center justify-center">
            <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
        );
      case "monthly_grant":
        return (
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getTransactionLabel = (type, metadata) => {
    switch (type) {
      case "purchase":
        return `Purchased ${metadata?.packageLabel || "tokens"}`;
      case "use":
        return "Used for course generation";
      case "refund":
        return "Refunded";
      case "bonus":
        return "Bonus tokens";
      case "free_grant":
        return "Welcome bonus";
      case "monthly_grant":
        return "Monthly free token";
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <DashboardSidebar activePath="/tokens" />

      <div className="flex-1 py-8 px-4 lg:px-10">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-4 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">
              Generation Tokens
            </h1>
            <p className="text-[var(--muted-foreground)] mt-2">
              Use tokens to generate new courses. Each token creates one course.
            </p>
          </div>

          {/* Premium Banner */}
          {userPlan?.isPremium && (
            <div className="mb-6 p-4 bg-[var(--primary)]/10 border border-[var(--primary)]/30 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-[var(--foreground)]">Premium Active</p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    You have unlimited course generation with your Premium subscription.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Token Balance Card */}
          <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">
                  Your Token Balance
                </h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)]/15 rounded-lg">
                    <svg className="w-6 h-6 text-[var(--primary)]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
                    </svg>
                    <span className="text-2xl font-bold text-[var(--primary)]">
                      {userPlan?.isPremium ? "∞" : (tokenBalance?.available ?? 0)}
                    </span>
                  </div>
                  {!userPlan?.isPremium && tokenBalance && (
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {tokenBalance.used ?? 0} used total
                    </span>
                  )}
                </div>
              </div>

              {!userPlan?.isPremium && (
                <button
                  onClick={() => setShowPurchaseModal(true)}
                  className="px-6 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors"
                >
                  Buy More Tokens
                </button>
              )}
            </div>

            {/* Next Monthly Token Info */}
            {!userPlan?.isPremium && nextMonthlyTokenDate && (
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">Monthly Free Token</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Your next free token arrives on{" "}
                      <span className="font-medium text-green-500">
                        {new Date(nextMonthlyTokenDate).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Token Packages Preview */}
          {!userPlan?.isPremium && (
            <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6 mb-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                Token Packages
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { tokens: 1, price: "$2.99", perToken: "$2.99" },
                  { tokens: 2, price: "$3.99", perToken: "$2.00", popular: true },
                  { tokens: 5, price: "$5.99", perToken: "$1.20", bestValue: true },
                ].map((pkg) => (
                  <div
                    key={pkg.tokens}
                    className={`relative p-4 rounded-xl border ${
                      pkg.bestValue
                        ? "border-green-500 bg-green-500/5"
                        : pkg.popular
                        ? "border-[var(--primary)] bg-[var(--primary)]/5"
                        : "border-[var(--border)] bg-[var(--surface-2)]"
                    }`}
                  >
                    {pkg.bestValue && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full">
                        Best Value
                      </span>
                    )}
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[var(--foreground)]">
                        {pkg.tokens}
                      </p>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        token{pkg.tokens > 1 ? "s" : ""}
                      </p>
                      <p className="text-lg font-semibold text-[var(--foreground)] mt-2">
                        {pkg.price}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {pkg.perToken}/token
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowPurchaseModal(true)}
                className="w-full mt-4 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors"
              >
                Purchase Tokens
              </button>
            </div>
          )}

          {/* Premium Upsell */}
          {!userPlan?.isPremium && (
            <div className="bg-purple-600/10 rounded-2xl border border-purple-500/30 p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-1">
                    Go Premium for Unlimited Tokens
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Get unlimited course generation plus exams, cheatsheets, and more.
                  </p>
                </div>
                <div className="flex flex-col sm:items-end gap-2">
                  <Link
                    href="/subscription"
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-500 transition-colors text-center"
                  >
                    $14.99/mo
                  </Link>
                  <Link
                    href="/discount"
                    className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    Need a discount?
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Transaction History */}
          <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
              Transaction History
            </h2>

            {transactions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--surface-2)] flex items-center justify-center">
                  <svg className="w-6 h-6 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-[var(--muted-foreground)]">
                  No transactions yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 p-3 bg-[var(--surface-2)] rounded-lg"
                  >
                    {getTransactionIcon(tx.transaction_type)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--foreground)] truncate">
                        {getTransactionLabel(tx.transaction_type, tx.metadata)}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${
                        tx.amount > 0 ? "text-green-500" : "text-red-500"
                      }`}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                      </p>
                      {tx.price_cents && (
                        <p className="text-xs text-[var(--muted-foreground)]">
                          ${(tx.price_cents / 100).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <TokenPurchaseModal
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          onPurchaseComplete={handlePurchaseComplete}
        />
      )}
    </div>
  );
}
