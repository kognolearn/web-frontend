"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fetchUserSettings, patchUserSettings } from "@/lib/userSettings";

const OnboardingContext = createContext({
  userSettings: null,
  refreshUserSettings: () => Promise.resolve(null),
  updateUserSettings: () => Promise.resolve(null),
});

export function OnboardingProvider({ children }) {
  const [userSettings, setUserSettings] = useState(null);

  const refreshUserSettings = useCallback(async () => {
    try {
      const settings = await fetchUserSettings();
      if (!settings) {
        return null;
      }
      setUserSettings(settings);
      if (settings.tour_completed && typeof window !== "undefined") {
        try {
          localStorage.removeItem("kogno_tour_state");
        } catch (e) {
          console.error("Failed to clear tour state:", e);
        }
      }
      return settings;
    } catch (e) {
      console.error("Failed to load user settings:", e);
      return null;
    }
  }, []);

  const updateUserSettings = useCallback(async (updates) => {
    try {
      const nextSettings = await patchUserSettings(updates);
      if (!nextSettings) return null;
      setUserSettings(nextSettings);
      return nextSettings;
    } catch (e) {
      console.error("Failed to update user settings:", e);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshUserSettings();
  }, [refreshUserSettings]);

  return (
    <OnboardingContext.Provider value={{ userSettings, refreshUserSettings, updateUserSettings }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
