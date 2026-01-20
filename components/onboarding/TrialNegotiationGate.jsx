"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authFetch } from "@/lib/api";
import HomeContent from "@/components/onboarding/HomeContent";
import { supabase } from "@/lib/supabase/client";

export default function TrialNegotiationGate() {
  const [showGate, setShowGate] = useState(false);

  useEffect(() => {
    let active = true;

    const loadStatus = async () => {
      try {
        const subRes = await authFetch("/api/stripe?endpoint=subscription-status");
        if (!active || !subRes.ok) {
          if (active) {
            setShowGate(false);
          }
          return;
        }
        const subData = await subRes.json().catch(() => ({}));
        if (subData?.hasSubscription) {
          setShowGate(false);
          return;
        }

        const negRes = await authFetch("/api/onboarding/negotiation-status");
        if (!active || !negRes.ok) {
          if (active) {
            setShowGate(false);
          }
          return;
        }
        const negData = await negRes.json().catch(() => ({}));
        if (negData?.trialStatus === "expired") {
          setShowGate(true);
        } else {
          setShowGate(false);
        }
      } catch (error) {
        if (active) {
          setShowGate(false);
        }
      }
    };

    void loadStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        void loadStatus();
      }
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleDismiss = () => {
      setShowGate(false);
    };
    window.addEventListener("kogno:trial-gate-dismiss", handleDismiss);
    return () => {
      window.removeEventListener("kogno:trial-gate-dismiss", handleDismiss);
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
