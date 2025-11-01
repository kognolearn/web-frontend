"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { supabase } from "@/lib/supabase/client";

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!active) return;
        setShow(!!user);
      } catch {
        if (!active) return;
        setShow(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setShow(!!session?.user);
    });
    return () => {
      active = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  if (!mounted || !show) return null;

  const isDark = theme === "dark";

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle color mode"
        aria-pressed={isDark}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-muted)] bg-[var(--surface-2)] shadow-sm transition-colors hover:border-[var(--border)] focus:outline-none focus:ring-4 focus:ring-primary/20"
      >
        {/* Icons layered and cross-faded/rotated for smooth transition */}
        <span
          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
            isDark ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-75 -rotate-90"
          }`}
          aria-hidden="true"
        >
          {/* Moon icon */}
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        </span>
        <span
          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
            isDark ? "opacity-0 scale-75 rotate-90" : "opacity-100 scale-100 rotate-0"
          }`}
          aria-hidden="true"
        >
          {/* Sun icon */}
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M6.05 6.05 4.636 4.636m12.728 0l-1.414 1.414M6.05 17.95l-1.414 1.414M12 8a4 4 0 100 8 4 4 0 000-8z" />
          </svg>
        </span>
      </button>
    </div>
  );
}
