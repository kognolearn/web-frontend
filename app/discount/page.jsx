"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DiscountNegotiationChat from "@/components/negotiation/DiscountNegotiationChat";
import { authFetch } from "@/lib/api";

export default function DiscountPage() {
  const router = useRouter();
  const [userStatus, setUserStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    try {
      const res = await authFetch("/api/user/plan");
      if (!res.ok) {
        // User not authenticated
        router.push("/login?redirect=/discount");
        return;
      }
      const data = await res.json();
      setUserStatus(data);
    } catch (err) {
      console.error("Error checking user status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscountAccepted = (data) => {
    // Redirect handled by the component itself
    console.log("Discount accepted:", data);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  // If user is already premium, show a message
  if (userStatus?.isPremium) {
    return (
      <div className="min-h-screen bg-[var(--background)] py-12 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-3">
            You're Already Premium!
          </h1>
          <p className="text-[var(--muted-foreground)] mb-6">
            You have access to all premium features including unlimited course generation, exams, and cheatsheets.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            Go to Dashboard
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/subscription"
            className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Subscription
          </Link>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-3">
            Need a Discount?
          </h1>
          <p className="text-[var(--muted-foreground)] max-w-md mx-auto">
            We believe everyone deserves access to quality learning tools. Chat with our assistant to see if you qualify for a discounted rate.
          </p>
        </div>

        {/* Chat Container */}
        <div className="h-[600px]">
          <DiscountNegotiationChat onDiscountAccepted={handleDiscountAccepted} />
        </div>

        {/* Info Section */}
        <div className="mt-8 p-4 bg-[var(--surface-1)] rounded-lg border border-[var(--border)]">
          <h3 className="font-medium text-[var(--foreground)] mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How it works
          </h3>
          <ul className="text-sm text-[var(--muted-foreground)] space-y-2">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">1</span>
              Tell us about your situation and why you're seeking a discount
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">2</span>
              Upload any relevant documentation to support your request
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">3</span>
              If approved, you'll receive a personalized discount on Premium
            </li>
          </ul>
        </div>

        {/* Alternative Options */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center justify-center text-sm">
          <Link
            href="/subscription"
            className="text-[var(--primary)] hover:underline"
          >
            View full pricing
          </Link>
          <span className="hidden sm:inline text-[var(--muted-foreground)]">•</span>
          <Link
            href="/tokens"
            className="text-[var(--primary)] hover:underline"
          >
            Buy generation tokens instead
          </Link>
        </div>
      </div>
    </div>
  );
}
