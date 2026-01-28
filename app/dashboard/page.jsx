"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import CourseCard from "@/components/courses/CourseCard";
import EmptyStateCard from "@/components/courses/EmptyStateCard";
import DeleteCourseModal from "@/components/courses/DeleteCourseModal";
import TokenRequiredModal from "@/components/tokens/TokenRequiredModal";
import { useTheme } from "@/components/theme/ThemeProvider";
import Tooltip from "@/components/ui/Tooltip";
import OnboardingTooltip from "@/components/ui/OnboardingTooltip";
import { useOnboarding } from "@/components/ui/OnboardingProvider";
import { authFetch } from "@/lib/api";
import {
  getCourseCreateJobs,
  removeCourseCreateJob,
  upsertCourseCreateJob,
} from "@/utils/courseJobs";
import SubscriptionBadge from "@/components/ui/SubscriptionBadge";
import NotificationBell from "@/components/notifications/NotificationBell";
import { isDesktopApp } from "@/lib/platform";
import { isDownloadRedirectEnabled } from "@/lib/featureFlags";
import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates";
import SeedsDisplay from "@/components/ui/SeedsDisplay";
import UserAvatar from "@/components/ui/UserAvatar";
import DashboardSeedCelebration from "@/components/seeds/DashboardSeedCelebration";
import DashboardSidebar from "@/components/navigation/DashboardSidebar";

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

function getCourseTitle(course) {
  if (!course || typeof course !== "object") return "Untitled Course";
  return (
    course.title ||
    course.course_title ||
    course.name ||
    course.courseName ||
    "Untitled Course"
  );
}

function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userSettings, updateUserSettings } = useOnboarding();
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
  const forceDownloadRedirect = isDownloadRedirectEnabled();

  // Profile menu state
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showTokenRequiredModal, setShowTokenRequiredModal] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);
  const profileMenuRef = useRef(null);

  // Redirect web users to download page (backup guard - middleware handles this primarily)
  useEffect(() => {
    if (forceDownloadRedirect && !isDesktopApp()) {
      router.replace('/download');
    }
  }, [forceDownloadRedirect, router]);

  // Persist payment success to user settings and strip the URL param
  useEffect(() => {
    const paymentParam = searchParams?.get("payment");
    if (paymentParam !== "success") return;

    if (userSettings && !userSettings.tour_completed && userSettings.tour_phase !== "course-creation") {
      updateUserSettings({ tour_phase: "course-creation" });
    }

    router.replace("/dashboard");
  }, [searchParams, userSettings, updateUserSettings, router]);

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
      const res = await authFetch(`/api/courses?userId=${encodeURIComponent(userId)}`);
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

    // Reduced polling frequency - realtime handles most updates now
    // This is a fallback in case realtime misses something
    pollingRef.current = setInterval(async () => {
      const updatedCourses = await loadCourses(userId, true);
      const stillPending = updatedCourses.some(c => c.status === 'pending');

      if (!stillPending && pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, 30000); // Reduced from 5s to 30s - realtime handles most updates
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

    // Initial check immediately
    pollCourseJobs(userId);
    // Reduced polling frequency - realtime handles most updates now
    // This is a fallback in case realtime misses something
    jobPollingRef.current = setInterval(() => {
      pollCourseJobs(userId);
    }, 30000); // Reduced from 5s to 30s - realtime handles most updates
  }, [loadPendingJobs, pollCourseJobs]);

  // Handle realtime job updates - called when backend broadcasts job status changes
  const handleRealtimeJobUpdate = useCallback((payload) => {
    if (!user?.id) return;

    const { jobId, status, courseId } = payload;
    const normalizedStatus = status?.toLowerCase() || '';

    // Update local job tracking
    if (courseId || status) {
      upsertCourseCreateJob(user.id, { jobId, courseId, status });
    }

    const isFinished = terminalJobStatuses.has(normalizedStatus);

    if (isFinished) {
      // Remove from local storage and state
      removeCourseCreateJob(user.id, jobId);
      setPendingJobs(prev => prev.filter(j => j.jobId !== jobId));

      // Refresh courses list to show the new/updated course
      loadCourses(user.id, true).then(courseList => {
        startPollingForPendingCourses(user.id, courseList);
      });
    } else {
      // Update pending jobs state
      setPendingJobs(prev => {
        const existing = prev.find(j => j.jobId === jobId);
        if (existing) {
          return prev.map(j => j.jobId === jobId ? { ...j, status, courseId: courseId || j.courseId } : j);
        }
        return prev;
      });
    }
  }, [user?.id, loadCourses, startPollingForPendingCourses]);

  // Handle realtime course updates - called when course status changes in DB
  const handleRealtimeCourseUpdate = useCallback((payload) => {
    const { courseId, status, title } = payload;

    setCourses(prev => {
      const existingIndex = prev.findIndex(c => c.id === courseId);
      if (existingIndex >= 0) {
        // Update existing course
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], status, ...(title && { title }) };
        return updated;
      }
      // Course not in list yet - might be newly created, trigger refresh
      if (user?.id) {
        loadCourses(user.id, true);
      }
      return prev;
    });
  }, [user?.id, loadCourses]);

  const handleRealtimeModuleComplete = useCallback((payload) => {
    const courseId = payload?.courseId;
    if (!courseId) return;
    setCourses(prev => prev.map(course => (
      course.id === courseId
        ? { ...course, has_ready_modules: true }
        : course
    )));
  }, []);

  // Subscribe to realtime updates
  useRealtimeUpdates(user?.id, {
    onJobUpdate: handleRealtimeJobUpdate,
    onCourseUpdate: handleRealtimeCourseUpdate,
    onModuleComplete: handleRealtimeModuleComplete,
  });

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

  // Fetch token balance for free tier users
  useEffect(() => {
    let cancelled = false;
    if (!user) return undefined;

    (async () => {
      try {
        const res = await authFetch('/api/tokens/balance');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
<<<<<<< HEAD
            const available =
              data?.balance?.available ??
              data?.tokensAvailable ??
              0;
            setTokenBalance(available);
=======
            setTokenBalance(data.tokensAvailable || 0);
>>>>>>> origin/main
          }
        }
      } catch (err) {
        console.error('Failed to fetch token balance:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const hasPremiumAccess =
    subscriptionStatus?.planLevel === 'paid' || subscriptionStatus?.trialActive;
  const isFreeTier = !hasPremiumAccess;
  const premiumBadgeLabel = subscriptionStatus?.trialActive ? "Free Trial" : "Pro";

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
    // Check if user is on free tier and has no tokens
    if (isFreeTier && tokenBalance <= 0) {
      e.preventDefault();
      setShowTokenRequiredModal(true);
      return false;
    }

    if (userSettings && !userSettings.tour_completed && userSettings.tour_phase !== "course-creation") {
      updateUserSettings({ tour_phase: "course-creation" });
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
  const hasActiveCourseCards = hasCourses;
  const isTourCompleted = userSettings?.tour_completed === true;
  const shouldShowOnboardingEmptyState = !hasCourses && !isTourCompleted;
  const generatedCourseCount = courses.filter((c) => c.is_generated).length;
  // Count courses that are pending or generating based on course status only
  const pendingCount = courses.filter((c) =>
    c.status === "pending" || c.status === "generating"
  ).length;

  if (loading || !mounted) {
    return (
      <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <DashboardSidebar activePath="/dashboard" />
        <div className="flex-1 relative overflow-hidden">
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
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <DashboardSidebar activePath="/dashboard" />

      <div className="flex-1 relative overflow-hidden transition-colors">
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

        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-8 px-4 pb-16 pt-6 sm:pt-8 sm:px-6 lg:px-8">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold">
                Welcome back, {displayName}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <SeedsDisplay />
              {/* Notifications */}
              <NotificationBell />
              {/* Profile with connected subscription badge */}
              <div className="relative z-[100]" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="group flex items-center transition-all"
                  title="Profile Menu"
                >
                  {/* Avatar with optional connected badge */}
                  <div className="relative flex items-center">
                    {/* Avatar circle */}
                    <UserAvatar
                      user={user}
                      size="md"
                      className="relative z-10 ring-[var(--surface-1)] group-hover:ring-[var(--primary)]/20 transition-all"
                    />
                    {/* Pro badge - positioned to overlap slightly */}
                    {subscriptionStatus?.planLevel === "paid" && (
                      <div className="hidden sm:flex items-center gap-1 h-6 pl-5 pr-2.5 -ml-4 rounded-r-full bg-[var(--primary)]/20 text-[var(--primary)] text-xs font-semibold">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {premiumBadgeLabel}
                      </div>
                    )}
                  </div>
                </button>

                {/* Profile dropdown menu */}
                {isProfileMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] shadow-lg backdrop-blur-xl">
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
                )}
              </div>
            </div>
          </div>

          {/* Courses section */}
          <main className="space-y-6">
            {!hasActiveCourseCards ? (
              <div className="flex flex-col items-center justify-center py-16">
                {shouldShowOnboardingEmptyState ? (
                  <EmptyStateCard
                    title="Create your first course"
                    description="Get started by creating a personalized study plan."
                    ctaText="Create Course"
                    ctaHref="/courses/create"
                    onCtaClick={handleCreateCourseClick}
                    ctaDataTour="dashboard-create-course"
                  />
                ) : (
                  <Link
                    href="/courses/create"
                    onClick={handleCreateCourseClick}
                    className="btn btn-primary btn-lg"
                    data-tour="dashboard-create-course"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create your first course
                  </Link>
                )}
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
                    data-tour="dashboard-create-course"
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
                  const courseTitle = getCourseTitle(course);
                  // Show as pending/building if course status is pending or generating
                  const effectiveStatus = (course.status === "pending" || course.status === "generating") ? "pending" : course.status;
                  // Use percent_complete from the course object (0-100 range)
                  const progress = course.percent_complete !== undefined ? course.percent_complete / 100 : null;
                  const isSharedWithMe = course.is_shared_with_me === true;
                  return (
                    <CourseCard
                      key={course.id}
                      courseCode={courseTitle}
                      courseName=""
                      courseId={course.id}
                      secondsToComplete={course.seconds_to_complete || course.secondsToComplete}
                      status={effectiveStatus}
                      topicsProgress={progress}
                      canOpen={effectiveStatus !== "pending" || Boolean(course.has_ready_modules)}
                      onDelete={() => setCourseToDelete({ id: course.id, title: courseTitle, isSharedWithMe })}
                      isSharedWithMe={isSharedWithMe}
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

        <TokenRequiredModal
          isOpen={showTokenRequiredModal}
          onClose={() => setShowTokenRequiredModal(false)}
          tokensAvailable={tokenBalance}
        />

        {/* Seed celebration for seeds earned since last visit */}
        <DashboardSeedCelebration courses={courses} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <DashboardClient />
    </Suspense>
  );
}
