"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import CourseCard from "@/components/courses/CourseCard";
import DeleteCourseModal from "@/components/courses/DeleteCourseModal";
import ProfileSettingsModal from "@/components/ui/ProfileSettingsModal";
import PersonalizationModal from "@/components/ui/PersonalizationModal";
import { useTheme } from "@/components/theme/ThemeProvider";
import Tooltip from "@/components/ui/Tooltip";
import OnboardingTooltip from "@/components/ui/OnboardingTooltip";
import { authFetch } from "@/lib/api";
import {
  getCourseCreateJobs,
  removeCourseCreateJob,
  upsertCourseCreateJob,
} from "@/utils/courseJobs";
import SubscriptionBadge from "@/components/ui/SubscriptionBadge";

const terminalJobStatuses = new Set([
  "completed",
  "succeeded",
  "success",
  "failed",
  "error",
  "canceled",
  "cancelled",
]);

function extractJobPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (payload.job && typeof payload.job === "object") return payload.job;
  if (payload.data?.job && typeof payload.data.job === "object") return payload.data.job;
  if (payload.result?.job && typeof payload.result.job === "object") return payload.result.job;
  return payload;
}

function resolveJobCourseId(job) {
  if (!job || typeof job !== "object") return null;
  const candidates = [
    job.course_id,
    job.courseId,
    job.result?.course_id,
    job.result?.courseId,
    job.result?.course?.id,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasCheckedAdmin, setHasCheckedAdmin] = useState(false);
  const { theme, themeMode, setThemeMode, mounted } = useTheme();
  const pollingRef = useRef(null);
  const jobPollingRef = useRef(null);
  const refreshRetryRef = useRef(null);
  const coursesRef = useRef([]);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);

  // Profile menu state
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileSettingsModalOpen, setIsProfileSettingsModalOpen] = useState(false);
  const [isPersonalizationModalOpen, setIsPersonalizationModalOpen] = useState(false);
  const [showCourseLimitModal, setShowCourseLimitModal] = useState(false);
  const profileMenuRef = useRef(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }
    if (isProfileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  // Handle send feedback
  const handleSendFeedback = () => {
    setIsProfileMenuOpen(false);
    window.dispatchEvent(new CustomEvent('open-feedback-widget'));
  };

  useEffect(() => {
    coursesRef.current = courses;
  }, [courses]);

  const loadCourses = useCallback(async (userId, silent = false) => {
    if (!userId) return coursesRef.current;

    const scheduleRetry = () => {
      if (silent || refreshRetryRef.current) return;
      refreshRetryRef.current = setTimeout(() => {
        refreshRetryRef.current = null;
        loadCourses(userId, true);
      }, 2500);
    };

    try {
      const res = await authFetch(`/api/courses`);
      if (!res.ok) {
        console.error("Failed to fetch courses from API", res.status);
        scheduleRetry();
      } else {
        const body = await res.json();
        const items = Array.isArray(body?.courses) ? body.courses : [];
        // Only update if data has changed (compare by JSON)
        setCourses(prev => {
          const prevStr = JSON.stringify(prev);
          const newStr = JSON.stringify(items);
          return prevStr === newStr ? prev : items;
        });
        coursesRef.current = items;

        if (refreshRetryRef.current) {
          clearTimeout(refreshRetryRef.current);
          refreshRetryRef.current = null;
        }

        return items;
      }
    } catch (err) {
      console.error("Error fetching courses from API:", err);
      scheduleRetry();
    }
    return coursesRef.current;
  }, []);

  // Poll for pending courses to check their status
  const startPollingForPendingCourses = useCallback((userId, courseList) => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    // Check if there are any pending courses
    const hasPendingCourses = courseList.some(c => c.status === 'pending');
    
    if (!hasPendingCourses) return;

    // Poll every 5 seconds for pending courses
    pollingRef.current = setInterval(async () => {
      const updatedCourses = await loadCourses(userId, true);
      const stillPending = updatedCourses.some(c => c.status === 'pending');
      
      if (!stillPending && pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, 5000);
  }, [loadCourses]);

  const loadPendingJobs = useCallback((userId) => {
    if (!userId) return [];
    const jobs = getCourseCreateJobs(userId);
    setPendingJobs(jobs);
    return jobs;
  }, []);

  const pollCourseJobs = useCallback(async (userId) => {
    const jobs = getCourseCreateJobs(userId);
    if (!jobs.length) {
      setPendingJobs([]);
      if (jobPollingRef.current) {
        clearInterval(jobPollingRef.current);
        jobPollingRef.current = null;
      }
      return;
    }

    let shouldRefreshCourses = false;

    await Promise.all(
      jobs.map(async (job) => {
        try {
          const res = await authFetch(`/api/jobs/${encodeURIComponent(job.jobId)}`);
          if (!res.ok) {
            if (res.status === 400 || res.status === 404) {
              removeCourseCreateJob(userId, job.jobId);
              shouldRefreshCourses = true;
            }
            return;
          }

          const payload = await res.json().catch(() => ({}));
          const jobData = extractJobPayload(payload);
          if (!jobData) return;

          const status = typeof jobData.status === "string" ? jobData.status : null;
          const normalizedStatus = status ? status.toLowerCase() : "";
          const courseId = resolveJobCourseId(jobData);
          const hasNewCourseId = courseId && courseId !== job.courseId;

          if (courseId || status) {
            upsertCourseCreateJob(userId, { jobId: job.jobId, courseId, status });
          }

          const isFinished =
            Boolean(jobData.finished_at) ||
            Boolean(jobData.error) ||
            (normalizedStatus && terminalJobStatuses.has(normalizedStatus));

          if (isFinished) {
            removeCourseCreateJob(userId, job.jobId);
            shouldRefreshCourses = true;
          }

          if (hasNewCourseId) {
            shouldRefreshCourses = true;
          }
        } catch (err) {
          console.error(`Error checking job ${job.jobId}:`, err);
        }
      })
    );

    const updatedJobs = getCourseCreateJobs(userId);
    setPendingJobs(updatedJobs);

    if (!updatedJobs.length && jobPollingRef.current) {
      clearInterval(jobPollingRef.current);
      jobPollingRef.current = null;
    }

    if (shouldRefreshCourses) {
      const updatedCourses = await loadCourses(userId, true);
      startPollingForPendingCourses(userId, updatedCourses);
    }
  }, [loadCourses, startPollingForPendingCourses]);

  const startPollingForCourseJobs = useCallback((userId) => {
    if (jobPollingRef.current) {
      clearInterval(jobPollingRef.current);
      jobPollingRef.current = null;
    }

    const jobs = loadPendingJobs(userId);
    if (!jobs.length) return;

    pollCourseJobs(userId);
    jobPollingRef.current = setInterval(() => {
      pollCourseJobs(userId);
    }, 5000);
  }, [loadPendingJobs, pollCourseJobs]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (jobPollingRef.current) {
        clearInterval(jobPollingRef.current);
      }
      if (refreshRetryRef.current) {
        clearTimeout(refreshRetryRef.current);
      }
    };
  }, []);

  // Course deletion handled via the course details page if needed

  useEffect(() => {
    const loadUserAndCourses = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/create-account");
        return;
      }

      setUser(user);
      const courseList = await loadCourses(user.id);

      // Start polling if there are pending courses
      startPollingForPendingCourses(user.id, courseList);
      startPollingForCourseJobs(user.id);

      setLoading(false);
    };

    loadUserAndCourses();
  }, [router, loadCourses, startPollingForPendingCourses, startPollingForCourseJobs]);

  // Listen for course updates triggered elsewhere (e.g., CreateCourseCard/Modal)
  useEffect(() => {
    if (!user?.id) return;
    const handler = async () => {
      // Silent refresh - don't show loading state, just update if data changed
      const courseList = await loadCourses(user.id);
      startPollingForPendingCourses(user.id, courseList);
      startPollingForCourseJobs(user.id);
    };
    window.addEventListener("courses:updated", handler);
    return () => window.removeEventListener("courses:updated", handler);
  }, [user, loadCourses, startPollingForPendingCourses, startPollingForCourseJobs]);

  // Check if the signed-in user is an admin
  useEffect(() => {
    let cancelled = false;
    if (!user) return undefined;

    (async () => {
      try {
        const res = await authFetch('/api/admin/status');
        if (!res.ok) {
          throw new Error(`Failed to verify admin (${res.status})`);
        }
        const body = await res.json().catch(() => ({}));
        if (!cancelled) {
          setIsAdmin(body?.isAdmin === true);
        }
      } catch (err) {
        console.error('Failed to check admin status:', err);
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setHasCheckedAdmin(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Fetch subscription status
  useEffect(() => {
    let cancelled = false;
    if (!user) return undefined;

    (async () => {
      try {
        const res = await authFetch('/api/stripe?endpoint=subscription-status');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setSubscriptionStatus(data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch subscription status:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleDeleteCourse = async () => {
    if (!user?.id || !courseToDelete) return;

    const res = await authFetch(`/api/courses?userId=${user.id}&courseId=${courseToDelete.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setCourses((prev) => prev.filter((c) => c.id !== courseToDelete.id));
      setCourseToDelete(null);
    } else {
      throw new Error("Failed to delete course");
    }
  };

  const handleCreateCourseClick = (e) => {
    // Check if user is on free tier and has hit the course limit
    const isFree = subscriptionStatus?.planLevel === 'free' || !subscriptionStatus?.hasSubscription;
    const courseLimit = 1; // Free tier limit

    if (isFree && courses.length >= courseLimit) {
      e.preventDefault();
      setShowCourseLimitModal(true);
      return false;
    }
    // Allow navigation to proceed
    return true;
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there";
  
  // Compute user initials (first and last initial if full name, otherwise first 2 chars)
  const userInitials = (() => {
    const fullName = user?.user_metadata?.full_name;
    if (fullName) {
      const parts = fullName.trim().split(/\s+/);
      return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].substring(0, 2).toUpperCase();
    }
    const email = user?.email;
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return "?";
  })();
  
  const hasCourses = courses.length > 0;
  // Count courses that are pending or generating based on course status only
  const pendingCount = courses.filter((c) =>
    c.status === "pending" || c.status === "generating"
  ).length;

  if (loading || !mounted) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[var(--primary)]/10 to-[var(--primary)]/5 blur-3xl" />
          <div className="absolute top-1/2 -left-40 h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-[var(--primary)]/10 to-transparent blur-3xl" />
        </div>

        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
          {/* Top bar skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-8 w-24 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            <div className="h-9 w-24 rounded-lg bg-[var(--surface-2)] animate-pulse" />
          </div>

          {/* Welcome header skeleton */}
          <header className="space-y-2">
            <div className="h-9 w-64 sm:w-80 rounded-lg bg-[var(--surface-2)] animate-pulse" />
            <div className="h-5 w-48 rounded-lg bg-[var(--surface-2)] animate-pulse" />
          </header>

          {/* Grid skeleton */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Create course card skeleton */}
            <div className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-1)]/50 p-6 h-44 flex flex-col items-center justify-center animate-pulse">
              <div className="w-14 h-14 rounded-full bg-[var(--surface-2)] mb-3" />
              <div className="h-5 w-32 rounded bg-[var(--surface-2)] mb-2" />
              <div className="h-4 w-28 rounded bg-[var(--surface-2)]" />
            </div>

            {/* Course card skeletons */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div 
                key={i} 
                className="relative rounded-2xl p-5 h-44 flex flex-col overflow-hidden backdrop-blur-xl bg-[var(--surface-1)] border border-[var(--border)] shadow-lg animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Top section */}
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)]" />
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-20 rounded-full bg-[var(--surface-2)]" />
                    <div className="w-7 h-7 rounded-full bg-[var(--surface-2)]" />
                  </div>
                </div>

                {/* Title */}
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-4/5 rounded bg-[var(--surface-2)]" />
                  <div className="h-4 w-3/5 rounded bg-[var(--surface-2)]" />
                </div>

                {/* Bottom section */}
                <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-[var(--surface-2)]" />
                    <div className="h-4 w-12 rounded bg-[var(--surface-2)]" />
                  </div>
                  <div className="w-4 h-4 rounded bg-[var(--surface-2)]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)] transition-colors">
      {/* Enhanced animated background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Primary gradient orbs */}
        <div 
          className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full blur-3xl animate-pulse" 
          style={{ animationDuration: '8s', background: `radial-gradient(circle, rgba(var(--primary-rgb), var(--grid-glow-opacity)) 0%, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.25)) 100%)` }} 
        />
        <div 
          className="absolute top-1/2 -left-40 h-[400px] w-[400px] rounded-full blur-3xl animate-pulse" 
          style={{ animationDuration: '10s', animationDelay: '2s', background: `radial-gradient(circle, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.75)) 0%, transparent 100%)` }} 
        />
        <div 
          className="absolute -bottom-20 right-1/3 h-[350px] w-[350px] rounded-full blur-3xl animate-pulse" 
          style={{ animationDuration: '12s', animationDelay: '4s', background: `radial-gradient(circle, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.5)) 0%, transparent 100%)` }} 
        />

        {/* Mesh gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--background)]/50 to-[var(--background)]" />

        {/* Subtle grid pattern - uses theme-aware grid color */}
        <div 
          className="absolute inset-0"
          style={{ 
            backgroundImage: `linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 sm:gap-8 px-3 sm:px-4 pb-16 pt-6 sm:pt-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl sm:rounded-3xl border border-[var(--border)]/70 bg-[var(--surface-1)]/60 p-4 sm:p-6 shadow-lg shadow-black/10 backdrop-blur-xl relative z-10">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <Link href="/" className="flex items-center">
              <Image 
                src="/images/kogno_logo.png" 
                alt="Kogno Logo" 
                width={240} 
                height={80} 
                className="h-10 sm:h-16 w-auto object-contain"
                priority
              />
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--primary)]">
                Kogno
              </span>
            </Link>
            <div className="flex items-center gap-1 sm:gap-2">
              {subscriptionStatus && (
                <SubscriptionBadge
                  planLevel={subscriptionStatus.planLevel}
                  expiresAt={subscriptionStatus.subscription?.currentPeriodEnd}
                  className="hidden sm:inline-flex"
                />
              )}
              {hasCheckedAdmin && isAdmin && (
                <Link
                  href="/admin"
                  className="hidden sm:flex items-center gap-2 rounded-full border border-[var(--primary)]/50 bg-[var(--primary)]/10 px-4 py-2 text-sm font-semibold text-[var(--primary)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary)]/20"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                  </svg>
                  Admin
                </Link>
              )}
              {hasCheckedAdmin && isAdmin && (
                <Link
                  href="/admin"
                  className="flex sm:hidden items-center justify-center w-9 h-9 rounded-full border border-[var(--primary)]/50 bg-[var(--primary)]/10 text-[var(--primary)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary)]/20"
                  title="Admin"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                  </svg>
                </Link>
              )}
              {/* Profile icon with dropdown */}
              <div className="relative z-[100]" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--primary)] text-white text-xs sm:text-sm font-semibold transition-all hover:opacity-90 hover:scale-105"
                  title="Profile Menu"
                >
                  {userInitials}
                </button>
                
                {/* Profile dropdown menu */}
                {isProfileMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] shadow-lg backdrop-blur-xl">
                    <div className="p-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsProfileSettingsModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile Settings
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsPersonalizationModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                        Personalization
                      </button>
                      <button
                        type="button"
                        onClick={handleSendFeedback}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Send Feedback
                      </button>
                    </div>
                    <div className="border-t border-[var(--border)]">
                      <div className="p-2">
                        <button
                          type="button"
                          onClick={() => { setIsProfileMenuOpen(false); handleSignOut(); }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Welcome header */}
          <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold sm:text-4xl">
                Welcome back, {displayName}
              </h1>
              <p className="text-sm sm:text-base text-[var(--muted-foreground)]">
                {hasCourses ? "Continue your learning journey." : "Create your first course to get started."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {pendingCount > 0 ? (
                <div className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  <span className="flex h-2 w-2 rounded-full bg-amber-500"></span>
                  Building: {pendingCount}
                </div>
              ) : null}
            </div>
          </header>
        </div>
        {/* Courses section */}
        <main className="space-y-6">
          {!hasCourses ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Link href="/courses/create" onClick={handleCreateCourseClick} className="btn btn-primary btn-lg">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create your first course
              </Link>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch"
            >
              {/* Create Course Card - always first */}
              <OnboardingTooltip
                id="dashboard-create-course"
                content="Click here to create a new course! Upload your syllabus, set your study time, and we'll generate a personalized learning plan with readings, flashcards, and quizzes."
                position="bottom"
                pointerPosition="center"
                delay={800}
                priority={1}
                className="w-full h-full"
              >
                <Link
                  href="/courses/create"
                  onClick={handleCreateCourseClick}
                  className="group relative flex min-h-[11.5rem] h-full w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-1)] overflow-hidden transition-all duration-300 hover:border-[var(--primary)] hover:shadow-xl hover:shadow-[var(--primary)]/15 hover:-translate-y-0.5"
                >
                  {/* Hover gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/0 via-transparent to-[var(--primary)]/0 group-hover:from-[var(--primary)]/10 group-hover:to-[var(--primary)]/5 transition-all duration-300" />

                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/20 text-[var(--primary)] group-hover:bg-[var(--primary)]/30 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="relative text-base font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">Create Course</span>
                </Link>
              </OnboardingTooltip>

              {courses.map((course) => {
                const courseTitle =
                  course?.title ||
                  course?.course_title ||
                  course?.name ||
                  course?.courseName ||
                  "Untitled Course";
                // Show as pending/building if course status is pending or generating
                const effectiveStatus = (course.status === "pending" || course.status === "generating") ? "pending" : course.status;
                // Use percent_complete from the course object (0-100 range)
                const progress = course.percent_complete !== undefined ? course.percent_complete / 100 : null;
                return (
                  <CourseCard
                    key={course.id}
                    courseCode={courseTitle}
                    courseName=""
                    courseId={course.id}
                    secondsToComplete={course.seconds_to_complete || course.secondsToComplete}
                    status={effectiveStatus}
                    topicsProgress={progress}
                    onDelete={() => setCourseToDelete({ id: course.id, title: courseTitle })}
                  />
                );
              })}
            </div>
          )}
        </main>
      </div>

      <DeleteCourseModal
        isOpen={!!courseToDelete}
        course={courseToDelete}
        onClose={() => setCourseToDelete(null)}
        onConfirm={handleDeleteCourse}
      />

      <ProfileSettingsModal
        isOpen={isProfileSettingsModalOpen}
        onClose={() => setIsProfileSettingsModalOpen(false)}
      />

      <PersonalizationModal
        isOpen={isPersonalizationModalOpen}
        onClose={() => setIsPersonalizationModalOpen(false)}
      />

      {/* Course Limit Modal */}
      {showCourseLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCourseLimitModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setShowCourseLimitModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>

            {/* Content */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">
                Free Plan Limit Reached
              </h3>
              <p className="text-[var(--muted-foreground)]">
                You've reached the maximum of 1 course on the free plan. Upgrade to Pro for unlimited courses, exams, and cheatsheets.
              </p>
            </div>

            {/* Features list */}
            <div className="bg-[var(--surface-2)] rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-[var(--foreground)] mb-3">Pro includes:</p>
              <ul className="space-y-2">
                {['Unlimited courses', 'Unlimited practice exams', 'Unlimited cheatsheets', 'Priority support'].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Link
                href="/pricing"
                onClick={() => setShowCourseLimitModal(false)}
                className="w-full py-3 px-4 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors text-center"
              >
                Upgrade to Pro
              </Link>
              <button
                onClick={() => setShowCourseLimitModal(false)}
                className="w-full py-3 px-4 bg-[var(--surface-2)] text-[var(--foreground)] rounded-lg font-medium hover:bg-[var(--surface-3)] transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
