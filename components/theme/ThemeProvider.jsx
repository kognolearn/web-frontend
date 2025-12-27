"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(undefined);

const storageKey = "edtech-theme";
const modeStorageKey = "edtech-theme-mode"; // "system", "light", or "dark"

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");
  const [themeMode, setThemeMode] = useState("system"); // "system", "light", or "dark"
  const [mounted, setMounted] = useState(false);

  // Get system preference
  const getSystemTheme = useCallback(() => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const storedMode = window.localStorage.getItem(modeStorageKey);
    const storedTheme = window.localStorage.getItem(storageKey);
    
    if (storedMode === "system" || storedMode === "light" || storedMode === "dark") {
      setThemeMode(storedMode);
      if (storedMode === "system") {
        setTheme(getSystemTheme());
      } else {
        setTheme(storedMode);
      }
    } else if (storedTheme === "light" || storedTheme === "dark") {
      // Legacy: if only theme is stored, use it as explicit mode
      setThemeMode(storedTheme);
      setTheme(storedTheme);
    } else {
      // Default to system
      setThemeMode("system");
      setTheme(getSystemTheme());
    }
    setMounted(true);
  }, [getSystemTheme]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (typeof window === "undefined" || themeMode !== "system") return;
    
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      setTheme(e.matches ? "dark" : "light");
    };
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themeMode]);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark");
    root.classList.add(`theme-${theme}`);
    window.localStorage.setItem(storageKey, theme);
    window.localStorage.setItem(modeStorageKey, themeMode);
  }, [theme, themeMode, mounted]);

  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => {
      const newMode = prev === "dark" || (prev === "system" && theme === "dark") ? "light" : "dark";
      setTheme(newMode);
      return newMode;
    });
  }, [theme]);

  // Set explicit theme mode
  const setThemeModeExplicit = useCallback((mode) => {
    setThemeMode(mode);
    if (mode === "system") {
      setTheme(getSystemTheme());
    } else {
      setTheme(mode);
    }
  }, [getSystemTheme]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, themeMode, setThemeMode: setThemeModeExplicit, mounted }),
    [theme, toggleTheme, themeMode, setThemeModeExplicit, mounted]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
