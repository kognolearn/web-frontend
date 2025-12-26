"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/theme/ThemeProvider";
import { supabase } from "@/lib/supabase/client";

const PUBLIC_PATHS = ["/", "/auth/create-account", "/auth/sign-in"];

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();
  const pathname = usePathname();
  const [hasSession, setHasSession] = useState(false);
  const [courseSidebarClosed, setCourseSidebarClosed] = useState(false);
  const [hasCourseSidebar, setHasCourseSidebar] = useState(false);
  const [courseUiReady, setCourseUiReady] = useState(false);
  const [chatOverlayActive, setChatOverlayActive] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!active) return;
        setHasSession(!!user);
      } catch {
        if (!active) return;
        setHasSession(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session?.user);
    });
    return () => {
      active = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  // Track when the course sidebar is closed via body class
  useEffect(() => {
    if (typeof document === "undefined") return;

    const updateStateFromBody = () => {
      const body = document.body;
      if (!body) return;
      const hasSidebar = body.classList.contains("has-course-sidebar");
      const isReady = body.classList.contains("course-ui-ready");
      const chatOpen = body.classList.contains("course-chat-open");
      setCourseSidebarClosed(body.classList.contains("course-sidebar-closed"));
      setHasCourseSidebar(hasSidebar);
      setCourseUiReady(isReady);
      setChatOverlayActive(chatOpen);
    };

    updateStateFromBody();

    const observer = new MutationObserver(updateStateFromBody);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
    };
  }, []);

  // Track viewport size for mobile-specific behavior
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const handle = () => setIsMobileViewport(mq.matches);
    handle();
    mq.addEventListener("change", handle);
    return () => mq.removeEventListener("change", handle);
  }, []);

  const isPublicPage = useMemo(() => {
    if (!pathname) return false;
    return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  }, [pathname]);

  if (!mounted || (!hasSession && !isPublicPage)) return null;
  
  // Don't show on course pages until UI is ready
  if (hasCourseSidebar && !courseUiReady) return null;

  const isDark = theme === "dark";
  const shouldShift = hasCourseSidebar && !courseSidebarClosed && !isMobileViewport;
  const hideForChat = chatOverlayActive && isMobileViewport;
  const isSidebarOpenOnMobile = isMobileViewport && hasCourseSidebar && !courseSidebarClosed;
  // On mobile course pages, always use lower z-index so sidebar can slide over smoothly
  const isOnMobileCoursePage = isMobileViewport && hasCourseSidebar;
  const effectiveZIndex = hideForChat ? 5 : (isOnMobileCoursePage ? 10 : 50);

  return (
    <div 
      className="fixed transition-all duration-200 ease-in-out"
      style={{ 
        left: shouldShift ? 'calc(var(--course-sidebar-width, 300px) + 1rem)' : '1rem',
        bottom: hasCourseSidebar ? '5rem' : '1rem',
        zIndex: effectiveZIndex,
        pointerEvents: hideForChat ? 'none' : 'auto',
        opacity: hideForChat ? 0 : 1,
        transform: hideForChat ? 'translateY(8px)' : 'translateY(0)'
      }}
    >
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle color mode"
        aria-pressed={isDark}
        className="btn btn-glass btn-icon"
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
