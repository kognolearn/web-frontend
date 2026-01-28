"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { authFetch } from "@/lib/api";
import { useTheme } from "@/components/theme/ThemeProvider";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Home",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/achievements",
    label: "Achievements",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    href: "/store",
    label: "Store",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  },
  {
<<<<<<< HEAD
    href: "/tokens",
    label: "Tokens",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" strokeWidth={2} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.5 9.5h5a2 2 0 010 4h-5a2 2 0 100 4h5" />
      </svg>
    ),
  },
  {
=======
>>>>>>> origin/main
    href: "/exams/ad-hoc",
    label: "Grade Exam",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function DashboardSidebar({ activePath }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPremium, setIsPremium] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [activeIndicatorStyle, setActiveIndicatorStyle] = useState({});
  const navRef = useRef(null);
  const itemRefs = useRef({});
  const pathname = usePathname();
  const { themeMode, setThemeMode, mounted } = useTheme();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [activePath]);

  // Persist collapsed state
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  // Check if user is admin
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch('/api/admin/status');
        if (res.ok) {
          const body = await res.json();
          if (!cancelled) {
            setIsAdmin(body?.isAdmin === true);
          }
        }
      } catch {
        // Silently fail - user is not admin
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Check if user is premium (hide upgrade CTA when premium).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/api/user/plan");
        if (!res.ok) return;
        const body = await res.json();
        if (!cancelled) {
          setIsPremium(Boolean(body?.isPremium));
        }
      } catch {
        // Silently fail - default to premium to avoid noisy CTAs on error
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Update active indicator position
  useEffect(() => {
    const updateIndicator = () => {
      const activeHref = activePath || pathname;
      const activeRef = itemRefs.current[activeHref];
      const navElement = navRef.current;

      if (activeRef && navElement) {
        const navRect = navElement.getBoundingClientRect();
        const itemRect = activeRef.getBoundingClientRect();

        setActiveIndicatorStyle({
          top: itemRect.top - navRect.top,
          height: itemRect.height,
          opacity: 1,
        });
      } else {
        setActiveIndicatorStyle({ opacity: 0 });
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(updateIndicator, 50);
    return () => clearTimeout(timer);
  }, [activePath, pathname, isCollapsed]);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", String(newState));
  };

  const handleSendFeedback = () => {
    window.dispatchEvent(new CustomEvent("open-feedback-widget"));
  };

  const toggleTheme = () => {
    setThemeMode(themeMode === "dark" ? "light" : "dark");
  };

  const navItemCount = NAV_ITEMS.length + (isAdmin ? 1 : 0);
  const navSpacingCount = Math.max(0, navItemCount - 1);
  const bottomActionCount = isPremium ? 2 : 3;
  const bottomSpacingCount = Math.max(0, bottomActionCount - 1);

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      const origin = window.location.origin;
      const successUrl = `${origin}/checkout/success?source=sidebar`;
      const cancelUrl = `${origin}${pathname || "/dashboard"}?checkout=cancelled`;

      const res = await authFetch("/api/stripe?endpoint=create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType: "monthly",
          flow: "hosted",
          successUrl,
          cancelUrl,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Failed to open checkout");
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("Upgrade checkout error:", err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] shadow-lg"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5 text-[var(--foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen z-50 lg:z-auto
          flex flex-col
          bg-[var(--surface-1)] border-r border-[var(--border)]
          transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isCollapsed ? "w-[72px]" : "w-64"}
        `}
      >
        {/* Clickable area for expand/collapse - between nav and bottom actions when collapsed, edge only when expanded */}
        <button
          type="button"
          onClick={toggleCollapse}
          className={`hidden lg:block absolute right-0 z-40 ${
            isCollapsed
              ? "w-full cursor-e-resize"
              : "w-6 top-0 h-full cursor-w-resize"
          }`}
          style={isCollapsed ? {
            top: `calc(4rem + 1px + 0.75rem + ${navItemCount} * 2.5rem + ${navSpacingCount} * 0.25rem + 0.75rem)`,
            bottom: `calc(0.75rem + ${bottomActionCount} * 2.5rem + ${bottomSpacingCount} * 0.25rem + 0.75rem + 1px)`
          } : undefined}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        />

        {/* Tab indicator - fixed UI element centered on full sidebar height */}
        <div
          onClick={toggleCollapse}
          className={`hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 w-2 h-20 bg-[var(--primary)]/50 hover:bg-[var(--primary)]/80 transition-all duration-200 rounded-l-lg z-50 items-center justify-center ${
            isCollapsed ? "cursor-e-resize" : "cursor-w-resize"
          }`}
        >
          <svg
            className={`w-3 h-3 text-white/80 transition-all duration-200 ${
              isCollapsed ? "" : "rotate-180"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
          </svg>
        </div>

        {/* Logo section */}
        <div className="flex items-center h-16 px-4 border-b border-[var(--border)] overflow-hidden">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0">
              <Image
                src="/images/kogno_logo.png"
                alt="Kogno Logo"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
            </div>
            <span
              className={`text-xl font-bold tracking-tight text-[var(--primary)] whitespace-nowrap transition-all duration-300 ${
                isCollapsed ? "opacity-0 -translate-x-4" : "opacity-100 translate-x-0"
              }`}
            >
              Kogno
            </span>
          </Link>

          {/* Close button for mobile */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className={`lg:hidden ml-auto p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-all duration-300 ${
              isCollapsed ? "opacity-0 scale-0" : "opacity-100 scale-100"
            }`}
            aria-label="Close menu"
          >
            <svg className="w-5 h-5 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation items */}
        <nav ref={navRef} className="relative flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
          {/* Animated active indicator */}
          <div
            className="absolute left-3 right-3 bg-[var(--primary)]/10 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none"
            style={{
              top: activeIndicatorStyle.top,
              height: activeIndicatorStyle.height,
              opacity: activeIndicatorStyle.opacity ?? 0,
            }}
          />

          {NAV_ITEMS.map((item) => {
            const isActive = activePath === item.href || pathname === item.href;

            return (
              <Link
                key={item.href}
                ref={(el) => { itemRefs.current[item.href] = el; }}
                href={item.href}
                className={`
                  relative flex items-center h-10 px-3 rounded-xl transition-colors duration-200
                  ${isActive
                    ? "text-[var(--primary)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }
                `}
                title={isCollapsed ? item.label : undefined}
              >
                {/* Icon - stays centered */}
                <span className={`flex-shrink-0 w-5 h-5 transition-colors duration-200 ${isActive ? "text-[var(--primary)]" : ""}`}>
                  {item.icon}
                </span>
                {/* Label - slides in/out */}
                <span
                  className={`ml-3 font-medium text-sm whitespace-nowrap transition-all duration-300 ${
                    isCollapsed
                      ? "opacity-0 -translate-x-2 pointer-events-none"
                      : "opacity-100 translate-x-0"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Admin link - only shown for admins */}
          {isAdmin && (
            <Link
              ref={(el) => { itemRefs.current["/admin"] = el; }}
              href="/admin"
              className={`
                relative flex items-center h-10 px-3 rounded-xl transition-colors duration-200
                ${activePath === "/admin" || pathname === "/admin"
<<<<<<< HEAD
                  ? "text-[var(--primary)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--primary)]"
=======
                  ? "text-amber-500"
                  : "text-amber-500/70 hover:text-amber-500"
>>>>>>> origin/main
                }
              `}
              title={isCollapsed ? "Admin" : undefined}
            >
              <span className="flex-shrink-0 w-5 h-5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </span>
              <span
                className={`ml-3 font-medium text-sm whitespace-nowrap transition-all duration-300 ${
                  isCollapsed
                    ? "opacity-0 -translate-x-2 pointer-events-none"
                    : "opacity-100 translate-x-0"
                }`}
              >
                Admin
              </span>
            </Link>
          )}
        </nav>

        {/* Bottom actions (desktop only) */}
        <div className="hidden lg:block p-3 border-t border-[var(--border)] space-y-1">
          {!isPremium && (
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={upgradeLoading}
              className={`
                relative flex items-center h-10 w-full px-3 rounded-xl
                text-white transition-all duration-200
<<<<<<< HEAD
                bg-purple-600
                hover:bg-purple-500
                disabled:opacity-70
                shadow-[0_8px_20px_-12px_rgba(147,51,234,0.8)]
=======
                bg-gradient-to-r from-violet-600 to-indigo-600
                hover:from-violet-500 hover:to-indigo-500
                disabled:opacity-70
                shadow-[0_8px_20px_-12px_rgba(79,70,229,0.8)]
>>>>>>> origin/main
              `}
              title={isCollapsed ? "Upgrade to Premium" : undefined}
            >
              <span className="flex-shrink-0 w-5 h-5">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm0 2h14v2H5v-2z" />
                </svg>
              </span>
              <span
                className={`ml-3 font-semibold text-sm whitespace-nowrap transition-all duration-300 ${
                  isCollapsed
                    ? "opacity-0 -translate-x-2 pointer-events-none"
                    : "opacity-100 translate-x-0"
                }`}
              >
                {upgradeLoading ? "Opening..." : "Upgrade to Premium"}
              </span>
            </button>
          )}

          {/* Feedback button */}
          <button
            type="button"
            onClick={handleSendFeedback}
            className="relative flex items-center h-10 w-full px-3 rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] transition-colors duration-200"
            title={isCollapsed ? "Send Feedback" : undefined}
          >
            <span className="flex-shrink-0 w-5 h-5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </span>
            <span
              className={`ml-3 font-medium text-sm whitespace-nowrap transition-all duration-300 ${
                isCollapsed
                  ? "opacity-0 -translate-x-2 pointer-events-none"
                  : "opacity-100 translate-x-0"
              }`}
            >
              Feedback
            </span>
          </button>

          {/* Theme toggle */}
          {mounted && (
            <button
              type="button"
              onClick={toggleTheme}
              className="relative flex items-center h-10 w-full px-3 rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] transition-colors duration-200"
              title={isCollapsed ? (themeMode === "dark" ? "Light Mode" : "Dark Mode") : undefined}
            >
              <span className="flex-shrink-0 w-5 h-5 relative">
                {/* Sun icon */}
                <svg
                  className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${
                    themeMode === "dark" ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                {/* Moon icon */}
                <svg
                  className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${
                    themeMode === "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </span>
              <span
                className={`ml-3 font-medium text-sm whitespace-nowrap transition-all duration-300 ${
                  isCollapsed
                    ? "opacity-0 -translate-x-2 pointer-events-none"
                    : "opacity-100 translate-x-0"
                }`}
              >
                {themeMode === "dark" ? "Dark Mode" : "Light Mode"}
              </span>
            </button>
          )}

        </div>
      </aside>
    </>
  );
}
