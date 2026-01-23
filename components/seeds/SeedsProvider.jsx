"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { authFetch } from "@/lib/api";

const SeedsContext = createContext(null);

// Storage keys
const LAST_SEEN_BALANCE_KEY = "kogno_seeds_last_seen_balance";
const LAST_SEEN_TIMESTAMP_KEY = "kogno_seeds_last_seen_timestamp";

export function SeedsProvider({ children }) {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingAnimations, setPendingAnimations] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const audioRef = useRef(null);
  const hasInitialFetchRef = useRef(false);

  // Load the seed sound effect
  // Note: Add a "seed_collect.mp3" file to /public/sounds/ for the sound to play
  useEffect(() => {
    if (typeof window !== "undefined") {
      const audio = new Audio("/sounds/seed_collect.mp3");
      audio.volume = 0.3;
      // Preload the audio - silently handle missing file
      audio.addEventListener("error", () => {
        // Sound file not found, disable sound
        audioRef.current = null;
      });
      audio.load();
      audioRef.current = audio;
    }
  }, []);

  const playSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
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

  // Queue an animation
  const queueAnimation = useCallback((animation) => {
    setPendingAnimations((prev) => [...prev, { ...animation, id: Date.now() + Math.random() }]);
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

  const value = {
    balance,
    loading,
    fetchBalance,
    getLastSeenBalance,
    markBalanceAsSeen,
    getSeedsEarnedSinceLastVisit,
    animateSeedsFromCourse,
    animateSeedsFromAction,
    pendingAnimations,
    processNextAnimation,
    completeAnimation,
    isAnimating,
    incrementBalance,
    playSound,
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
