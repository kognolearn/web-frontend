"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { authFetch } from "@/lib/api";
import HomeContent from "@/components/onboarding/HomeContent";

export default function TrialNegotiationGate() {
  const pathname = usePathname();
  const [showGate, setShowGate] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    let active = true;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const scheduleCheck = (trialEndsAt) => {
      if (!trialEndsAt) return;
      const endsAt = new Date(trialEndsAt);
      if (!Number.isFinite(endsAt.getTime())) return;
      const ms = endsAt.getTime() - Date.now();
      if (ms <= 0) return;
      clearTimer();
      timerRef.current = setTimeout(() => {
        if (active) {
          void loadStatus();
        }
      }, ms + 1000);
    };

    const loadStatus = async () => {
      try {
        const subRes = await authFetch("/api/stripe?endpoint=subscription-status");
        if (!active || !subRes.ok) {
          setShowGate(false);
          return;
        }
        const subData = await subRes.json().catch(() => ({}));
        if (subData?.hasSubscription) {
          setShowGate(false);
          return;
        }

        const negRes = await authFetch("/api/onboarding/negotiation-status");
        if (!active || !negRes.ok) {
          setShowGate(false);
          return;
        }
        const negData = await negRes.json().catch(() => ({}));
        if (negData?.trialStatus === "expired") {
          setShowGate(true);
        } else {
          setShowGate(false);
        }
        if (negData?.trialStatus === "active") {
          scheduleCheck(negData?.trialEndsAt);
        }
      } catch (error) {
        setShowGate(false);
      }
    };

    void loadStatus();

    return () => {
      active = false;
      clearTimer();
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = showGate ? "hidden" : "";
  }, [showGate]);

  if (pathname === "/") {
    return null;
  }

  if (!showGate) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--background)]/80 backdrop-blur-sm">
      <HomeContent />
    </div>
  );
}
