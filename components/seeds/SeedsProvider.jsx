"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { authFetch } from "@/lib/api";

const SeedsContext = createContext(null);

// Storage keys
const LAST_SEEN_BALANCE_KEY = "kogno_seeds_last_seen_balance";
const LAST_SEEN_TIMESTAMP_KEY = "kogno_seeds_last_seen_timestamp";
const SESSION_START_KEY = "kogno_session_start";

export function SeedsProvider({ children }) {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingAnimations, setPendingAnimations] = useState([]);
  const [pendingNotifications, setPendingNotifications] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isNewSession, setIsNewSession] = useState(false);
  // Track seeds earned in current session that should animate on dashboard
  const [pendingDashboardSeeds, setPendingDashboardSeeds] = useState([]);
  const audioRef = useRef(null);
  const hasInitialFetchRef = useRef(false);

  // Check if this is a new session (fresh website open)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const sessionStart = sessionStorage.getItem(SESSION_START_KEY);
    if (!sessionStart) {
      // This is a new session (fresh tab/window)
      sessionStorage.setItem(SESSION_START_KEY, String(Date.now()));
      setIsNewSession(true);
    } else {
      setIsNewSession(false);
    }
  }, []);

  // Load the seed sound effect with audio pool for overlapping sounds
  // Note: Add a "seed_collect.mp3" file to /public/sounds/ for the sound to play
  const audioPoolRef = useRef([]);
  const audioPoolIndexRef = useRef(0);
  const AUDIO_POOL_SIZE = 10; // Allow up to 10 overlapping sounds

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Create a pool of audio elements for overlapping playback
      const pool = [];
      let hasError = false;

      for (let i = 0; i < AUDIO_POOL_SIZE; i++) {
        const audio = new Audio("/sounds/seed_collect.mp3");
        audio.volume = 0.3;
        audio.addEventListener("error", () => {
          hasError = true;
        });
        audio.load();
        pool.push(audio);
      }

      audioPoolRef.current = pool;

      // Check if first audio loaded successfully
      pool[0].addEventListener("canplaythrough", () => {
        if (!hasError) {
          audioRef.current = pool[0]; // Mark as available
        }
      }, { once: true });
    }
  }, []);

  const playSound = useCallback(() => {
    if (audioPoolRef.current.length === 0) return;

    // Get next audio element from pool (round-robin)
    const audio = audioPoolRef.current[audioPoolIndexRef.current];
    audioPoolIndexRef.current = (audioPoolIndexRef.current + 1) % AUDIO_POOL_SIZE;

    if (audio) {
      // Clone and play for truly independent playback
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }, []);

  // Fetch current seed balance
  const fetchBalance = useCallback(async () => {
    try {
      const res = await authFetch("/api/seeds");
      if (res.ok) {
        const data = await res.json();
        const newBalance = data.seeds?.balance ?? 0;
        setBalance(newBalance);
        return newBalance;
      }
    } catch (err) {
      console.error("Failed to fetch seeds:", err);
    }
    return null;
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    if (hasInitialFetchRef.current) return;
    hasInitialFetchRef.current = true;

    const init = async () => {
      await fetchBalance();
      setLoading(false);
    };
    init();
  }, [fetchBalance]);

  // Get the last seen balance from localStorage
  const getLastSeenBalance = useCallback(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(LAST_SEEN_BALANCE_KEY);
    return stored ? parseInt(stored, 10) : null;
  }, []);

  // Save the current balance as "last seen"
  const markBalanceAsSeen = useCallback((balanceToMark) => {
    if (typeof window === "undefined") return;
    const bal = balanceToMark ?? balance;
    if (bal !== null) {
      localStorage.setItem(LAST_SEEN_BALANCE_KEY, String(bal));
      localStorage.setItem(LAST_SEEN_TIMESTAMP_KEY, String(Date.now()));
    }
  }, [balance]);

  // Calculate seeds earned since last visit
  const getSeedsEarnedSinceLastVisit = useCallback(() => {
    if (balance === null) return 0;
    const lastSeen = getLastSeenBalance();
    if (lastSeen === null) return 0;
    return Math.max(0, balance - lastSeen);
  }, [balance, getLastSeenBalance]);

  // Queue an animation (for dashboard)
  const queueAnimation = useCallback((animation) => {
    setPendingAnimations((prev) => [...prev, { ...animation, id: Date.now() + Math.random() }]);
  }, []);

  // Show a notification toast (for in-course awards)
  // Also queues seeds for dashboard animation when user returns
  const showSeedNotification = useCallback((amount, reason = "Seeds earned!", courseId = null) => {
    if (amount <= 0) return;
    const notification = {
      id: Date.now() + Math.random(),
      amount,
      reason,
    };
    setPendingNotifications((prev) => [...prev, notification]);

    // Queue these seeds for animation when returning to dashboard
    setPendingDashboardSeeds((prev) => [...prev, {
      id: Date.now() + Math.random(),
      amount,
      reason,
      courseId,
    }]);

    // Also increment balance immediately for visual feedback
    setBalance((prev) => (prev !== null ? prev + amount : amount));
  }, []);

  // Remove a notification
  const dismissNotification = useCallback((notificationId) => {
    setPendingNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  }, []);

  // Trigger animation for seeds earned from a course (flies from course card to counter)
  const animateSeedsFromCourse = useCallback((courseId, amount, reason = "Completed a lesson") => {
    if (amount <= 0) return;
    queueAnimation({
      type: "course",
      courseId,
      amount,
      reason,
    });
  }, [queueAnimation]);

  // Trigger animation for seeds earned from non-course actions (shows modal)
  const animateSeedsFromAction = useCallback((amount, reason, description = null) => {
    if (amount <= 0) return;
    queueAnimation({
      type: "modal",
      amount,
      reason,
      description,
    });
  }, [queueAnimation]);

  // Process the next animation in the queue
  const processNextAnimation = useCallback(() => {
    if (pendingAnimations.length === 0) {
      setIsAnimating(false);
      return null;
    }
    setIsAnimating(true);
    return pendingAnimations[0];
  }, [pendingAnimations]);

  // Remove a completed animation from the queue
  const completeAnimation = useCallback((animationId) => {
    setPendingAnimations((prev) => prev.filter((a) => a.id !== animationId));
  }, []);

  // Increment balance locally (for optimistic updates)
  const incrementBalance = useCallback((amount) => {
    setBalance((prev) => (prev !== null ? prev + amount : amount));
  }, []);

  // Mark that the welcome back celebration has been shown this session
  const markWelcomeShown = useCallback(() => {
    setIsNewSession(false);
  }, []);

  // Get and clear pending dashboard seeds (for animation when returning to dashboard)
  const consumePendingDashboardSeeds = useCallback(() => {
    const seeds = pendingDashboardSeeds;
    setPendingDashboardSeeds([]);
    return seeds;
  }, [pendingDashboardSeeds]);

  const value = {
    balance,
    loading,
    fetchBalance,
    getLastSeenBalance,
    markBalanceAsSeen,
    getSeedsEarnedSinceLastVisit,
    animateSeedsFromCourse,
    animateSeedsFromAction,
    showSeedNotification,
    pendingNotifications,
    dismissNotification,
    pendingAnimations,
    processNextAnimation,
    completeAnimation,
    isAnimating,
    incrementBalance,
    playSound,
    isNewSession,
    markWelcomeShown,
    pendingDashboardSeeds,
    consumePendingDashboardSeeds,
  };

  return (
    <SeedsContext.Provider value={value}>
      {children}
    </SeedsContext.Provider>
  );
}

export function useSeeds() {
  const context = useContext(SeedsContext);
  if (!context) {
    throw new Error("useSeeds must be used within a SeedsProvider");
  }
  return context;
}

export default SeedsProvider;
