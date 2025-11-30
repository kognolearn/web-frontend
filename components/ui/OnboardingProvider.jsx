"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "kogno_onboarding_dismissed";
const MIN_TIME_BETWEEN_TOOLTIPS = 600; // Minimum ms between tooltip transitions

const OnboardingContext = createContext({
  dismissedTooltips: new Set(),
  dismissTooltip: () => {},
  dismissAllTooltips: () => {},
  resetTooltips: () => {},
  hasSeenTooltip: () => false,
  isNewUser: true,
  activeTooltip: null,
  requestTooltip: () => {},
  releaseTooltip: () => {},
});

export function OnboardingProvider({ children }) {
  const [dismissedTooltips, setDismissedTooltips] = useState(new Set());
  const [isLoaded, setIsLoaded] = useState(false);
  const [isNewUser, setIsNewUser] = useState(true);
  
  // Queue system for tooltips - only one shows at a time
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [tooltipQueue, setTooltipQueue] = useState([]);
  const lastTooltipTime = useRef(0);
  
  // Use refs to avoid stale closures
  const activeTooltipRef = useRef(null);
  const tooltipQueueRef = useRef([]);
  
  // Keep refs in sync
  useEffect(() => {
    activeTooltipRef.current = activeTooltip;
  }, [activeTooltip]);
  
  useEffect(() => {
    tooltipQueueRef.current = tooltipQueue;
  }, [tooltipQueue]);

  // Load dismissed tooltips from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setDismissedTooltips(new Set(parsed.dismissed || []));
        setIsNewUser(parsed.isNewUser ?? true);
      }
    } catch (e) {
      console.error("Failed to load onboarding state:", e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever dismissed tooltips change
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          dismissed: Array.from(dismissedTooltips),
          isNewUser,
        })
      );
    } catch (e) {
      console.error("Failed to save onboarding state:", e);
    }
  }, [dismissedTooltips, isNewUser, isLoaded]);

  // Process the queue to show next tooltip
  const processQueue = useCallback(() => {
    // Already have an active tooltip - wait
    if (activeTooltipRef.current) return;
    
    const currentQueue = tooltipQueueRef.current;
    
    // No tooltips waiting
    if (currentQueue.length === 0) return;
    
    // Check if enough time has passed since last tooltip
    const now = Date.now();
    const timeSinceLastTooltip = now - lastTooltipTime.current;
    
    if (timeSinceLastTooltip < MIN_TIME_BETWEEN_TOOLTIPS) {
      // Schedule retry after remaining time
      setTimeout(processQueue, MIN_TIME_BETWEEN_TOOLTIPS - timeSinceLastTooltip + 50);
      return;
    }
    
    // Find highest priority tooltip
    const sortedQueue = [...currentQueue].sort((a, b) => a.priority - b.priority);
    const nextTooltip = sortedQueue[0];
    
    if (nextTooltip) {
      setActiveTooltip(nextTooltip.id);
      setTooltipQueue((prev) => prev.filter((t) => t.id !== nextTooltip.id));
      lastTooltipTime.current = now;
    }
  }, []);

  // Process queue when active tooltip is cleared or queue changes
  useEffect(() => {
    if (!activeTooltip && tooltipQueue.length > 0 && isLoaded) {
      const timer = setTimeout(processQueue, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTooltip, tooltipQueue.length, isLoaded, processQueue]);

  // Request to show a tooltip (adds to queue with priority)
  const requestTooltip = useCallback((tooltipId, priority = 10) => {
    setTooltipQueue((prev) => {
      // Don't add duplicates
      if (prev.some((t) => t.id === tooltipId)) return prev;
      // Don't add if it's already active
      if (activeTooltipRef.current === tooltipId) return prev;
      
      return [...prev, { id: tooltipId, priority, requestedAt: Date.now() }];
    });
    
    // Trigger queue processing after a short delay
    setTimeout(processQueue, 50);
  }, [processQueue]);

  // Release a tooltip (either dismissed or component unmounted)
  const releaseTooltip = useCallback((tooltipId) => {
    setTooltipQueue((prev) => prev.filter((t) => t.id !== tooltipId));
    setActiveTooltip((current) => (current === tooltipId ? null : current));
  }, []);

  const dismissTooltip = useCallback((tooltipId) => {
    setDismissedTooltips((prev) => {
      const next = new Set(prev);
      next.add(tooltipId);
      return next;
    });
    releaseTooltip(tooltipId);
  }, [releaseTooltip]);

  const dismissAllTooltips = useCallback(() => {
    setIsNewUser(false);
    setActiveTooltip(null);
    setTooltipQueue([]);
  }, []);

  const resetTooltips = useCallback(() => {
    setDismissedTooltips(new Set());
    setIsNewUser(true);
    setActiveTooltip(null);
    setTooltipQueue([]);
    lastTooltipTime.current = 0;
  }, []);

  const hasSeenTooltip = useCallback(
    (tooltipId) => {
      return dismissedTooltips.has(tooltipId) || !isNewUser;
    },
    [dismissedTooltips, isNewUser]
  );

  return (
    <OnboardingContext.Provider
      value={{
        dismissedTooltips,
        dismissTooltip,
        dismissAllTooltips,
        resetTooltips,
        hasSeenTooltip,
        isNewUser,
        isLoaded,
        activeTooltip,
        requestTooltip,
        releaseTooltip,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}
