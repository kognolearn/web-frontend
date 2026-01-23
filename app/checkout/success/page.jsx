"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isDesktopApp, getRedirectDestination } from "@/lib/platform";

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);
  const [isApp, setIsApp] = useState(false);

  useEffect(() => {
    setIsApp(isDesktopApp());
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Desktop app users go to dashboard, web users go to download
          router.push(getRedirectDestination("/dashboard"));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const destination = isApp ? "/dashboard" : "/download";
  const destinationLabel = isApp ? "dashboard" : "download";
  const buttonLabel = isApp ? "Go to Dashboard" : "Download the App";

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-8 border border-[var(--border)]">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-green-500"
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

          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
            Payment Successful!
          </h1>

          <p className="text-[var(--text-secondary)] mb-6">
            Thank you for your subscription. You now have unlimited access to all features.
          </p>

          <div className="text-sm text-[var(--text-secondary)] mb-6">
            Redirecting to {destinationLabel} in {countdown} seconds...
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href={destination}
              className="w-full py-3 px-4 bg-[var(--accent)] text-white rounded-lg font-medium hover:bg-[var(--accent-hover)] transition-colors"
            >
              {buttonLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
