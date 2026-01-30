"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { authFetch } from "@/lib/api";

const TOUR_STATE_KEY = "kogno_tour_state";
const TOUR_STATE_VERSION = 2;

/**
 * Tour types
 * @typedef {'course-creation' | 'course-features' | null} TourType
 */

/**
 * Tour context value
 * @typedef {Object} TourContextValue
 * @property {TourType} currentTour - The currently active tour
 * @property {number} currentStep - Current step index (0-based)
 * @property {string|null} currentStepId - Stable step identifier
 * @property {boolean} requiresInteraction - Whether current step requires user action
 * @property {Function} startTour - Start a specific tour
 * @property {Function} nextStep - Move to next step
 * @property {Function} completeStep - Mark current step as complete (for interactive steps)
 * @property {Function} endTour - End the current tour
 * @property {Function} skipTour - Skip the current tour (only if allowed)
 * @property {boolean} isTourActive - Whether any tour is currently active
 * @property {Object|null} currentStepConfig - Config for current step
 */

const GuidedTourContext = createContext(null);

/**
 * Load tour state from localStorage
 */
function loadTourState() {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(TOUR_STATE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      version: TOUR_STATE_VERSION,
      currentTour: parsed.currentTour ?? null,
      currentStep: Number.isInteger(parsed.currentStep) ? parsed.currentStep : 0,
      completedTours: Array.isArray(parsed.completedTours) ? parsed.completedTours : [],
      lastUpdatedAt: parsed.lastUpdatedAt || null,
    };
  } catch (e) {
    console.error("[Tour] Failed to load tour state:", e);
    return null;
  }
}

/**
 * Save tour state to localStorage
 */
function saveTourState(state) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOUR_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("[Tour] Failed to save tour state:", e);
  }
}

/**
 * GuidedTourProvider - Provides tour context for the entire app
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @param {Object} props.tourConfigs - Map of tour configurations { tourName: steps[] }
 */
export function GuidedTourProvider({ children, tourConfigs = {} }) {
  const [currentTour, setCurrentTour] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepCompleted, setStepCompleted] = useState(false);
  const [completedTours, setCompletedTours] = useState(new Set());

  // Load persisted state on mount
  useEffect(() => {
    const savedState = loadTourState();
    if (savedState) {
      if (savedState.completedTours) {
        setCompletedTours(new Set(savedState.completedTours));
      }
      // Resume incomplete tour if any
      if (savedState.currentTour && !savedState.completedTours?.includes(savedState.currentTour)) {
        setCurrentTour(savedState.currentTour);
        setCurrentStep(savedState.currentStep || 0);
      }
    }
  }, []);

  // Persist state changes
  useEffect(() => {
    saveTourState({
      version: TOUR_STATE_VERSION,
      currentTour,
      currentStep,
      completedTours: Array.from(completedTours),
      lastUpdatedAt: new Date().toISOString(),
    });
  }, [currentTour, currentStep, completedTours]);

  // Get current step configuration
  const currentStepConfig = currentTour && tourConfigs[currentTour]
    ? tourConfigs[currentTour][currentStep] || null
    : null;

  const requiresInteraction = currentStepConfig?.interactive === true;
  const isTourActive = currentTour !== null;

  /**
   * Start a specific tour
   */
  const startTour = useCallback((tourName, options = {}) => {
    if (!tourConfigs[tourName]) {
      console.warn(`[Tour] Unknown tour: ${tourName}`);
      return;
    }

    // Don't restart completed tours unless forced
    if (completedTours.has(tourName) && !options.force) {
      console.log(`[Tour] Tour "${tourName}" already completed`);
      return;
    }

    setCurrentTour(tourName);
    setCurrentStep(options.startStep || 0);
    setStepCompleted(false);
    console.log(`[Tour] Started tour: ${tourName}`);
  }, [tourConfigs, completedTours]);

  /**
   * Move to the next step
   */
  const nextStep = useCallback(() => {
    if (!currentTour || !tourConfigs[currentTour]) return;

    const steps = tourConfigs[currentTour];
    const nextStepIndex = currentStep + 1;

    // Check if current step requires interaction and isn't completed
    if (requiresInteraction && !stepCompleted) {
      console.log("[Tour] Step requires interaction before proceeding");
      return;
    }

    if (nextStepIndex >= steps.length) {
      // Tour complete
      endTour(true);
    } else {
      setCurrentStep(nextStepIndex);
      setStepCompleted(false);
    }
  }, [currentTour, currentStep, tourConfigs, requiresInteraction, stepCompleted]);

  /**
   * Mark current step as complete (for interactive steps)
   */
  const completeStep = useCallback(() => {
    setStepCompleted(true);
  }, []);

  /**
   * End the current tour
   */
  const endTour = useCallback(async (markComplete = true) => {
    if (!currentTour) return;

    const tourName = currentTour;
    console.log(`[Tour] Ending tour: ${tourName}, markComplete: ${markComplete}`);

    if (markComplete) {
      setCompletedTours(prev => new Set([...prev, tourName]));

      // Persist to server
      try {
        await authFetch("/api/user/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tour_completed: true,
            tour_phase: tourName,
          }),
        });
      } catch (e) {
        console.error("[Tour] Failed to save tour completion to server:", e);
      }
    }

    setCurrentTour(null);
    setCurrentStep(0);
    setStepCompleted(false);
  }, [currentTour]);

  /**
   * Skip the current tour (only if skippable)
   */
  const skipTour = useCallback(() => {
    if (!currentTour || !tourConfigs[currentTour]) return;

    const steps = tourConfigs[currentTour];
    const isSkippable = steps.every(step => step.skippable !== false);

    if (!isSkippable) {
      console.log("[Tour] This tour cannot be skipped");
      return;
    }

    endTour(false);
  }, [currentTour, tourConfigs, endTour]);

  /**
   * Check if a tour is completed
   */
  const isTourCompleted = useCallback((tourName) => {
    return completedTours.has(tourName);
  }, [completedTours]);

  /**
   * Reset tour state (for testing)
   */
  const resetTours = useCallback(() => {
    setCompletedTours(new Set());
    setCurrentTour(null);
    setCurrentStep(0);
    setStepCompleted(false);
    saveTourState(null);
  }, []);

  const currentStepId = currentStepConfig?.id || (currentTour ? `${currentTour}:${currentStep}` : null);

  const contextValue = {
    currentTour,
    currentStep,
    currentStepId,
    requiresInteraction,
    isTourActive,
    currentStepConfig,
    startTour,
    nextStep,
    completeStep,
    endTour,
    skipTour,
    isTourCompleted,
    resetTours,
    totalSteps: currentTour && tourConfigs[currentTour] ? tourConfigs[currentTour].length : 0,
  };

  return (
    <GuidedTourContext.Provider value={contextValue}>
      {children}
    </GuidedTourContext.Provider>
  );
}

/**
 * Hook to access tour context
 */
export function useGuidedTour() {
  const context = useContext(GuidedTourContext);
  if (!context) {
    throw new Error("useGuidedTour must be used within a GuidedTourProvider");
  }
  return context;
}

/**
 * Hook to check if a specific element should be highlighted
 */
export function useTourHighlight(targetId) {
  const { currentStepConfig, isTourActive } = useGuidedTour();

  if (!isTourActive || !currentStepConfig) return false;
  return currentStepConfig.target === targetId;
}

export default GuidedTourProvider;
