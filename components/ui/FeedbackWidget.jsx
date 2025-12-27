"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase/client";
import { authFetch } from "@/lib/api";

const PUBLIC_PATHS = ["/", "/auth/create-account", "/auth/sign-in"];

const FEEDBACK_TYPES = [
  { 
    id: "bug", 
    label: "Bug Report", 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    description: "Something isn't working" 
  },
  { 
    id: "feature", 
    label: "Feature Request", 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    description: "Suggest an improvement" 
  },
  { 
    id: "content", 
    label: "Content Issue", 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    description: "Problem with course material" 
  },
  { 
    id: "other", 
    label: "Other", 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    description: "General feedback" 
  },
];

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarClosedOnCourse, setSidebarClosedOnCourse] = useState(false);
  const [hasCourseSidebar, setHasCourseSidebar] = useState(false);
  const [courseUiReady, setCourseUiReady] = useState(false);
  const [chatOverlayActive, setChatOverlayActive] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const pathname = usePathname();
  const isPublicPage = useMemo(() => {
    if (!pathname) return false;
    return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  }, [pathname]);
  const panelRef = useRef(null);

  // Get current context from URL
  const getContext = () => {
    const context = {
      url: typeof window !== "undefined" ? window.location.href : "",
      pathname,
      timestamp: new Date().toISOString(),
    };

    // Extract courseId if on a course page
    const courseMatch = pathname.match(/\/courses\/([^\/]+)/);
    if (courseMatch) {
      context.courseId = courseMatch[1];
    }

    // Check if on review page
    if (pathname.includes("/review")) {
      context.page = "review";
    } else if (pathname.includes("/dashboard")) {
      context.page = "dashboard";
    } else if (courseMatch) {
      context.page = "course";
    }

    // Get viewport info
    if (typeof window !== "undefined") {
      context.viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      context.userAgent = navigator.userAgent;
    }

    return context;
  };

  useEffect(() => {
    setMounted(true);
    
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => sub?.subscription?.unsubscribe?.();
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
      setSidebarClosedOnCourse(body.classList.contains("course-sidebar-closed"));
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

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Reset form when closing
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setSelectedType(null);
        setMessage("");
        setError(null);
        setSubmitted(false);
      }, 300);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!selectedType || !message.trim() || !user) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        userId: user.id,
        userEmail: user.email,
        type: selectedType,
        message: message.trim(),
        context: getContext(),
      };

      const res = await authFetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to submit feedback");
      }

      setSubmitted(true);
      setTimeout(() => setIsOpen(false), 2000);
    } catch (err) {
      setError("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || (!user && !isPublicPage)) return null;
  
  // Don't show on course pages until UI is ready
  if (hasCourseSidebar && !courseUiReady) return null;

  const shouldShift = hasCourseSidebar && !sidebarClosedOnCourse;
  const hideForChat = chatOverlayActive && isMobileViewport;
  const effectiveZIndex = hideForChat ? 5 : 50;

  return (
    <div
      className="fixed transition-all duration-200 ease-in-out"
      style={{
        left: shouldShift ? 'calc(var(--course-sidebar-width, 300px) + 4.5rem)' : '4.5rem',
        bottom: hasCourseSidebar ? '5rem' : '1rem',
        zIndex: effectiveZIndex,
        pointerEvents: hideForChat ? 'none' : 'auto',
        opacity: hideForChat ? 0 : 1,
        transform: hideForChat ? 'translateY(8px)' : 'translateY(0)'
      }}
      ref={panelRef}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-14 left-0 w-80 sm:w-96 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)] shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-[var(--surface-2)] border-b border-[var(--border)]">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[var(--foreground)]">Send Feedback</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--muted-foreground)] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {!user ? (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Sign in to share feedback with the team.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/auth/sign-in"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-center text-sm font-semibold hover:border-[var(--primary)]/40 hover:bg-[var(--surface-muted)] transition-colors"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/auth/create-account"
                      className="w-full rounded-xl bg-[var(--primary)] px-4 py-2 text-center text-sm font-semibold text-white shadow-lg shadow-[var(--primary)]/30 hover:bg-[var(--primary)]/90 transition-colors"
                    >
                      Create account
                    </Link>
                  </div>
                </div>
              ) : submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-8 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="font-medium text-[var(--foreground)]">Thank you!</p>
                  <p className="text-sm text-[var(--muted-foreground)]">Your feedback has been submitted.</p>
                </motion.div>
              ) : (
                <>
                  {/* Type Selection */}
                  <div className="mb-4">
                    <label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-2 block">
                      Feedback Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {FEEDBACK_TYPES.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => setSelectedType(type.id)}
                          className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                            selectedType === type.id
                              ? "border-[var(--primary)] bg-[var(--primary)]/5"
                              : "border-[var(--border)] hover:border-[var(--primary)]/40 hover:bg-[var(--surface-2)]"
                          }`}
                        >
                          <span className={`flex-shrink-0 ${selectedType === type.id ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`}>{type.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--foreground)] truncate">{type.label}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message Input */}
                  <div className="mb-4">
                    <label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-2 block">
                      Your Feedback
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your feedback in detail..."
                      rows={4}
                      className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none resize-none text-sm transition-all"
                    />
                  </div>

                  {/* Context Info */}
                  <div className="mb-4 p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-[var(--muted-foreground)] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        We'll include your current page context to help us understand the issue better.
                      </p>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-sm text-rose-600 dark:text-rose-400">
                      {error}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    onClick={handleSubmit}
                    disabled={!selectedType || !message.trim() || submitting}
                    className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Submitting...
                      </span>
                    ) : (
                      "Submit Feedback"
                    )}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-glass btn-icon"
        aria-label="Send feedback"
        aria-expanded={isOpen}
      >
        <span
          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
            isOpen ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-75 rotate-90"
          }`}
          aria-hidden={!isOpen}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
        <span
          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
            isOpen ? "opacity-0 scale-75 -rotate-90" : "opacity-100 scale-100 rotate-0"
          }`}
          aria-hidden={isOpen}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </span>
      </button>
    </div>
  );
}
