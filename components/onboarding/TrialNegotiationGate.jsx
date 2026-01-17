"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authFetch } from "@/lib/api";
import HomeContent from "@/components/onboarding/HomeContent";

export default function TrialNegotiationGate() {
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

  return (
    <AnimatePresence>
      {showGate && (
        <motion.div
          key="trial-expired-gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/25 backdrop-blur-md px-4 py-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="h-[85vh] w-full max-w-4xl"
          >
            <HomeContent variant="overlay" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
