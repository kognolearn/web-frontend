"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useSeeds } from "./SeedsProvider";
import FlyingSeed from "./FlyingSeed";

/**
 * Component that shows a celebration animation when user returns to dashboard
 * with seeds earned since their last visit
 */
export default function DashboardSeedCelebration({ courses = [] }) {
  const {
    balance,
    loading,
    getLastSeenBalance,
    markBalanceAsSeen,
    getSeedsEarnedSinceLastVisit,
    playSound,
    fetchBalance,
  } = useSeeds();

  const [showCelebration, setShowCelebration] = useState(false);
  const [seedsEarned, setSeedsEarned] = useState(0);
  const [flyingSeeds, setFlyingSeeds] = useState([]);
  const [seedSources, setSeedSources] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle, showing, animating, done
  const hasCheckedRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check for earned seeds when balance loads
  useEffect(() => {
    if (loading || balance === null || hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const lastSeen = getLastSeenBalance();
    const earned = getSeedsEarnedSinceLastVisit();

    // Only show celebration if:
    // 1. They've seen the balance before (not first-time user)
    // 2. They earned something since last visit
    // 3. Earned at least 5 seeds (avoid noise for tiny amounts)
    if (lastSeen !== null && earned >= 5) {
      setSeedsEarned(earned);
      setShowCelebration(true);
      setPhase("showing");

      // Fetch recent transactions to determine sources
      fetchRecentTransactions(earned);
    } else {
      // Mark current balance as seen
      markBalanceAsSeen(balance);
    }
  }, [loading, balance, getLastSeenBalance, getSeedsEarnedSinceLastVisit, markBalanceAsSeen]);

  const fetchRecentTransactions = async (earnedAmount) => {
    try {
      const { authFetch } = await import("@/lib/api");
      const res = await authFetch("/api/seeds/transactions?limit=20&type=earn");
      if (res.ok) {
        const data = await res.json();
        const transactions = data.transactions || [];

        // Find which courses the seeds came from
        const courseSeeds = {};
        let totalFromCourses = 0;

        for (const tx of transactions) {
          const courseId = tx.metadata?.course_id;
          if (courseId && (tx.action === "lesson_complete" || tx.action?.startsWith("milestone:"))) {
            courseSeeds[courseId] = (courseSeeds[courseId] || 0) + Math.abs(tx.amount);
            totalFromCourses += Math.abs(tx.amount);
          }
        }

        // Map to source info
        const sources = Object.entries(courseSeeds).map(([courseId, amount]) => ({
          type: "course",
          courseId,
          amount,
        }));

        // If there are seeds not from courses, add a generic source
        const nonCourseSeeds = earnedAmount - totalFromCourses;
        if (nonCourseSeeds > 0) {
          sources.push({
            type: "other",
            amount: nonCourseSeeds,
          });
        }

        setSeedSources(sources);
      }
    } catch (err) {
      console.error("Failed to fetch recent transactions:", err);
      // Fallback to a single center animation
      setSeedSources([{ type: "other", amount: earnedAmount }]);
    }
  };

  const getCounterPosition = useCallback(() => {
    const counter = document.querySelector("[data-seed-counter]");
    if (!counter) return { x: window.innerWidth - 100, y: 50 };
    const rect = counter.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }, []);

  const startAnimation = useCallback(() => {
    setPhase("animating");
    const targetPos = getCounterPosition();
    const seeds = [];
    let seedIndex = 0;

    // Create flying seeds from each source
    for (const source of seedSources) {
      let startX, startY;
      const seedCount = Math.min(Math.ceil(source.amount / 10), 5); // Scale seeds to amount

      if (source.type === "course") {
        // Find the course card
        const courseCard = document.querySelector(`[data-course-id="${source.courseId}"]`);
        if (courseCard) {
          const rect = courseCard.getBoundingClientRect();
          startX = rect.left + rect.width / 2;
          startY = rect.top + rect.height / 2;
        } else {
          // Fallback to center
          startX = window.innerWidth / 2;
          startY = window.innerHeight / 2;
        }
      } else {
        // Center of screen for non-course seeds
        startX = window.innerWidth / 2;
        startY = window.innerHeight / 2;
      }

      for (let i = 0; i < seedCount; i++) {
        seeds.push({
          id: `celebration-${seedIndex++}`,
          startX: startX + (Math.random() - 0.5) * 80,
          startY: startY + (Math.random() - 0.5) * 60,
          endX: targetPos.x,
          endY: targetPos.y,
          delay: seedIndex * 80, // Staggered
        });
      }
    }

    setFlyingSeeds(seeds);
  }, [seedSources, getCounterPosition]);

  const handleSeedComplete = useCallback((seedId) => {
    playSound();

    // Trigger counter pulse
    const counter = document.querySelector("[data-seed-counter]");
    if (counter) {
      counter.classList.add("seed-counter-pulse");
      setTimeout(() => counter.classList.remove("seed-counter-pulse"), 200);
    }

    setFlyingSeeds((prev) => {
      const remaining = prev.filter((s) => s.id !== seedId);
      if (remaining.length === 0) {
        // All done - mark balance as seen
        markBalanceAsSeen();
        setTimeout(() => {
          setPhase("done");
          setShowCelebration(false);
        }, 300);
      }
      return remaining;
    });
  }, [playSound, markBalanceAsSeen]);

  const handleDismiss = useCallback(() => {
    if (phase === "showing") {
      startAnimation();
    }
  }, [phase, startAnimation]);

  // Auto-start animation after a short delay
  useEffect(() => {
    if (phase === "showing" && seedSources.length > 0) {
      const timer = setTimeout(() => {
        startAnimation();
      }, 2000); // Show message for 2 seconds then animate
      return () => clearTimeout(timer);
    }
  }, [phase, seedSources, startAnimation]);

  if (!mounted || !showCelebration) return null;

  return createPortal(
    <>
      {/* Celebration overlay */}
      {phase === "showing" && (
        <div
          className="fixed inset-0 z-[9997] flex items-center justify-center"
          onClick={handleDismiss}
        >
          {/* Semi-transparent backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" />

          {/* Celebration card */}
          <div
            className="relative bg-[var(--surface-1)] border border-[var(--border)] rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative elements */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-32 h-32 bg-[var(--primary)]/30 rounded-full blur-3xl" />

            {/* Seed icon */}
            <div className="relative flex justify-center mb-6">
              <div className="relative animate-bounce-slow">
                <Image
                  src="/images/seed_icon.png"
                  alt="Seeds"
                  width={64}
                  height={64}
                  className="drop-shadow-xl"
                />
                {/* Sparkles */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-[var(--primary)] rounded-full animate-ping animation-delay-200" />
              </div>
            </div>

            {/* Message */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                Welcome back!
              </h2>
              <p className="text-[var(--muted-foreground)]">
                You earned <span className="text-[var(--primary)] font-bold">{seedsEarned}</span> seeds since your last visit
              </p>
            </div>

            {/* Collect button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-3 px-4 rounded-xl bg-[var(--primary)] text-[var(--primary-contrast)] font-semibold hover:bg-[var(--primary)]/90 transition-colors"
            >
              Collect Seeds
            </button>
          </div>
        </div>
      )}

      {/* Flying seeds */}
      {flyingSeeds.map((seed) => (
        <FlyingSeed
          key={seed.id}
          startX={seed.startX}
          startY={seed.startY}
          endX={seed.endX}
          endY={seed.endY}
          delay={seed.delay}
          onComplete={() => handleSeedComplete(seed.id)}
        />
      ))}
    </>,
    document.body
  );
}
