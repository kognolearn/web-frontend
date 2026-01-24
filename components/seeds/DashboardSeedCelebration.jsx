"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useSeeds } from "./SeedsProvider";
import FlyingSeed from "./FlyingSeed";

/**
 * Component that handles seed animations on dashboard:
 * 1. Welcome back modal (on fresh website open with earned seeds)
 * 2. Flying animation from course cards (when returning from course with earned seeds)
 */
export default function DashboardSeedCelebration({ courses = [] }) {
  const {
    balance,
    loading,
    getLastSeenBalance,
    markBalanceAsSeen,
    getSeedsEarnedSinceLastVisit,
    playSound,
    isNewSession,
    markWelcomeShown,
    pendingDashboardSeeds,
    consumePendingDashboardSeeds,
  } = useSeeds();

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [seedsEarned, setSeedsEarned] = useState(0);
  const [flyingSeeds, setFlyingSeeds] = useState([]);
  const [seedSources, setSeedSources] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle, showing, animating, done
  const hasCheckedWelcomeRef = useRef(false);
  const hasCheckedPendingRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const completedSeedsRef = useRef(new Set());
  const totalSeedsRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check for pending in-session seeds (from course activity) - runs on every dashboard mount
  useEffect(() => {
    if (!mounted || loading) return;

    // Small delay to ensure course cards are rendered
    const timer = setTimeout(() => {
      if (pendingDashboardSeeds.length > 0 && phase === "idle") {
        const seeds = consumePendingDashboardSeeds();
        if (seeds.length > 0) {
          // Group by courseId
          const grouped = {};
          for (const seed of seeds) {
            const key = seed.courseId || "other";
            if (!grouped[key]) {
              grouped[key] = { type: seed.courseId ? "course" : "other", courseId: seed.courseId, amount: 0 };
            }
            grouped[key].amount += seed.amount;
          }
          setSeedSources(Object.values(grouped));
          setPhase("animating");
          startAnimationFromSources(Object.values(grouped));
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [mounted, loading, pendingDashboardSeeds, phase]);

  // Check for welcome back seeds (on fresh website open)
  useEffect(() => {
    if (loading || balance === null || hasCheckedWelcomeRef.current) return;
    hasCheckedWelcomeRef.current = true;

    const lastSeen = getLastSeenBalance();
    const earned = getSeedsEarnedSinceLastVisit();

    // Only show welcome modal if:
    // 1. This is a fresh website open (new session)
    // 2. They've seen the balance before (not first-time user)
    // 3. They earned something since last visit
    // 4. Earned at least 5 seeds (avoid noise for tiny amounts)
    if (isNewSession && lastSeen !== null && earned >= 5) {
      setSeedsEarned(earned);
      setShowWelcomeModal(true);
      setPhase("showing");

      // Fetch recent transactions to determine sources
      fetchRecentTransactions(earned);
    } else {
      // Mark current balance as seen
      markBalanceAsSeen(balance);
    }
  }, [loading, balance, getLastSeenBalance, getSeedsEarnedSinceLastVisit, markBalanceAsSeen, isNewSession]);

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

  const startAnimationFromSources = useCallback((sources) => {
    const targetPos = getCounterPosition();
    const seeds = [];
    let seedIndex = 0;

    // Constant interval between seeds for consistent flow rate (100ms between each seed)
    const SEED_INTERVAL = 100;

    // Create flying seeds from each source - one visual seed per actual seed earned
    for (const source of sources) {
      let startX, startY;
      // Show exactly the number of seeds earned (cap at 50 for performance)
      const seedCount = Math.min(source.amount, 50);

      if (source.type === "course" && source.courseId) {
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
          id: `celebration-${seedIndex}`,
          startX: startX + (Math.random() - 0.5) * 80,
          startY: startY + (Math.random() - 0.5) * 60,
          endX: targetPos.x,
          endY: targetPos.y,
          delay: seedIndex * SEED_INTERVAL, // Constant rate flow
        });
        seedIndex++;
      }
    }

    // Reset completion tracking
    completedSeedsRef.current = new Set();
    totalSeedsRef.current = seeds.length;
    setFlyingSeeds(seeds);
  }, [getCounterPosition]);

  const startWelcomeAnimation = useCallback(() => {
    setPhase("animating");
    startAnimationFromSources(seedSources);
  }, [seedSources, startAnimationFromSources]);

  const handleSeedComplete = useCallback((seedId) => {
    // Prevent duplicate calls for same seed
    if (completedSeedsRef.current.has(seedId)) return;
    completedSeedsRef.current.add(seedId);

    playSound();

    // Trigger counter pulse
    const counter = document.querySelector("[data-seed-counter]");
    if (counter) {
      counter.classList.add("seed-counter-pulse");
      setTimeout(() => counter.classList.remove("seed-counter-pulse"), 200);
    }

    // Check if all seeds are done (don't update state until the end)
    if (completedSeedsRef.current.size >= totalSeedsRef.current) {
      // All done - mark balance as seen and mark welcome as shown for this session
      markBalanceAsSeen();
      if (showWelcomeModal) {
        markWelcomeShown();
      }
      setTimeout(() => {
        setPhase("done");
        setShowWelcomeModal(false);
        setFlyingSeeds([]); // Clear only at the very end
      }, 300);
    }
  }, [playSound, markBalanceAsSeen, markWelcomeShown, showWelcomeModal]);

  const handleDismiss = useCallback(() => {
    if (phase === "showing") {
      startWelcomeAnimation();
    }
  }, [phase, startWelcomeAnimation]);

  // Auto-start welcome animation after a short delay
  useEffect(() => {
    if (phase === "showing" && seedSources.length > 0 && showWelcomeModal) {
      const timer = setTimeout(() => {
        startWelcomeAnimation();
      }, 2000); // Show message for 2 seconds then animate
      return () => clearTimeout(timer);
    }
  }, [phase, seedSources, startWelcomeAnimation, showWelcomeModal]);

  if (!mounted) return null;
  if (phase === "idle" || phase === "done") return null;

  return createPortal(
    <>
      {/* Welcome back modal (only for fresh session) */}
      {showWelcomeModal && phase === "showing" && (
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
