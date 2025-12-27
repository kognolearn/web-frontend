"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import CourseCard from "@/components/courses/CourseCard";
import DeleteCourseModal from "@/components/courses/DeleteCourseModal";
import { useTheme } from "@/components/theme/ThemeProvider";
import Tooltip from "@/components/ui/Tooltip";
import OnboardingTooltip from "@/components/ui/OnboardingTooltip";
import { authFetch } from "@/lib/api";
import {
  getCourseCreateJobs,
  removeCourseCreateJob,
  upsertCourseCreateJob,
} from "@/utils/courseJobs";

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
  const { mounted } = useTheme();
  const pollingRef = useRef(null);
  const jobPollingRef = useRef(null);
  const refreshRetryRef = useRef(null);
  const coursesRef = useRef([]);
  const [courseProgress, setCourseProgress] = useState({});
  const [pendingJobs, setPendingJobs] = useState([]);

  useEffect(() => {
    coursesRef.current = courses;
  }, [courses]);

  const loadCourseProgress = useCallback(async (userId, courseIds) => {
    if (!courseIds || courseIds.length === 0) return;
    
    // Fetch progress for all courses in parallel
    const progressPromises = courseIds.map(async (courseId) => {
      try {
        const res = await authFetch(`/api/courses/${encodeURIComponent(courseId)}/progress?userId=${encodeURIComponent(userId)}`);
        if (res.ok) {
          const data = await res.json();
          console.log(`Progress data for ${courseId}:`, data);
          
          // Helper to safely parse progress values
          const parseVal = (val) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string' && !isNaN(parseFloat(val))) return parseFloat(val);
            return null;
          };

          let progress = null;
          
          // Try to find progress in various fields
          // 1. Direct decimal values (0-1)
          const directProgress = parseVal(data.progress) ?? parseVal(data.topics_progress) ?? parseVal(data.completion);
          
          // 2. Percentage values (0-100)
          const percentProgress = parseVal(data.percentComplete) ?? parseVal(data.percent) ?? parseVal(data.completion_percent) ?? parseVal(data.progress_percent);
          
          if (directProgress !== null) {
            progress = directProgress;
          } else if (percentProgress !== null) {
            progress = percentProgress / 100;
          }
          // 3. Nested data object
          else if (data.data) {
            const nestedDirect = parseVal(data.data.progress) ?? parseVal(data.data.topics_progress) ?? parseVal(data.data.completion);
            const nestedPercent = parseVal(data.data.percentComplete) ?? parseVal(data.data.percent) ?? parseVal(data.data.completion_percent) ?? parseVal(data.data.progress_percent);
            
            if (nestedDirect !== null) {
              progress = nestedDirect;
            } else if (nestedPercent !== null) {
              progress = nestedPercent / 100;
            }
          }
          
          return { courseId, progress };
        }
        // If endpoint returns 404, it's not implemented yet - silently return null
        // Don't log error for expected 404s
        if (res.status !== 404) {
          console.error(`Error fetching progress for course ${courseId}: ${res.status}`);
        }
      } catch (err) {
        console.error(`Error fetching progress for course ${courseId}:`, err);
      }
      return { courseId, progress: null };
    });

    const results = await Promise.all(progressPromises);
    const progressMap = {};
    results.forEach(({ courseId, progress }) => {
      progressMap[courseId] = progress;
    });

    setCourseProgress(prev => {
      const prevStr = JSON.stringify(prev);
      const newStr = JSON.stringify({ ...prev, ...progressMap });
      return prevStr === newStr ? prev : { ...prev, ...progressMap };
    });
  }, []);

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
        
        // Load progress for all ready courses (not pending)
        const readyCourseIds = items
          .filter(c => c.status !== 'pending')
          .map(c => c.id);
        if (readyCourseIds.length > 0) {
          loadCourseProgress(userId, readyCourseIds);
        }

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
  }, [loadCourseProgress]);

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

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there";
  const hasCourses = courses.length > 0;
  const pendingCourseCount = courses.filter((c) => c.status === "pending").length;
  const courseIdSet = new Set(courses.map((course) => course?.id).filter(Boolean));
  const pendingJobCount = pendingJobs.filter((job) => !job.courseId || !courseIdSet.has(job.courseId)).length;
  const pendingCount = pendingCourseCount + pendingJobCount;

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

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[var(--border)]/70 bg-[var(--surface-1)]/60 p-6 shadow-lg shadow-black/10 backdrop-blur-xl">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center">
              <Image 
                src="/images/kogno_logo.png" 
                alt="Kogno Logo" 
                width={240} 
                height={80} 
                className="h-16 w-auto object-contain"
                priority
              />
              <span className="text-2xl font-extrabold tracking-tight text-[var(--primary)]">
                Kogno
              </span>
            </Link>
            <div className="flex items-center gap-2">
              {hasCheckedAdmin && isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 rounded-full border border-[var(--primary)]/50 bg-[var(--primary)]/10 px-4 py-2 text-sm font-semibold text-[var(--primary)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary)]/20"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                  </svg>
                  Admin
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 rounded-full border border-[var(--border)]/70 bg-[var(--surface-2)]/70 px-4 py-2 text-sm font-semibold text-[var(--foreground)]/80 transition-colors hover:border-[var(--primary)]/60 hover:bg-[var(--primary)]/15 hover:text-[var(--primary)]"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          </div>

          {/* Welcome header */}
          <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold sm:text-4xl">
                Welcome back, {displayName}
              </h1>
              <p className="text-[var(--muted-foreground)]">
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
              <Link href="/courses/create" className="btn btn-primary btn-lg">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create your first course
              </Link>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch"
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
                return (
                  <CourseCard
                    key={course.id}
                    courseCode={courseTitle}
                    courseName=""
                    courseId={course.id}
                    secondsToComplete={course.seconds_to_complete || course.secondsToComplete}
                    status={course.status}
                    topicsProgress={courseProgress[course.id]}
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
    </div>
  );
}
