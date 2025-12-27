"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import CourseCard from "@/components/courses/CourseCard";
import DeleteCourseModal from "@/components/courses/DeleteCourseModal";
import { useTheme } from "@/components/theme/ThemeProvider";
import Tooltip from "@/components/ui/Tooltip";
import OnboardingTooltip from "@/components/ui/OnboardingTooltip";
import { authFetch } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const { mounted } = useTheme();
  const pollingRef = useRef(null);

  const loadCourses = useCallback(async (userId, silent = false) => {
    try {
      const res = await authFetch(`/api/courses?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) {
        console.error("Failed to fetch courses from API", res.status);
        if (!silent) setCourses([]);
      } else {
        const body = await res.json();
        const items = Array.isArray(body?.courses) ? body.courses : [];
        // Only update if data has changed (compare by JSON)
        setCourses(prev => {
          const prevStr = JSON.stringify(prev);
          const newStr = JSON.stringify(items);
          return prevStr === newStr ? prev : items;
        });
        return items;
      }
    } catch (err) {
      console.error("Error fetching courses from API:", err);
      if (!silent) setCourses([]);
    }
    return [];
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
      const updatedCourses = await loadCourses(userId);
      const stillPending = updatedCourses.some(c => c.status === 'pending');
      
      if (!stillPending && pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, 5000);
  }, [loadCourses]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
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

      setLoading(false);
    };

    loadUserAndCourses();
  }, [router, loadCourses, startPollingForPendingCourses]);

  // Listen for course updates triggered elsewhere (e.g., CreateCourseCard/Modal)
  useEffect(() => {
    if (!user?.id) return;
    const handler = async () => {
      // Silent refresh - don't show loading state, just update if data changed
      const courseList = await loadCourses(user.id);
      startPollingForPendingCourses(user.id, courseList);
    };
    window.addEventListener("courses:updated", handler);
    return () => window.removeEventListener("courses:updated", handler);
  }, [user, loadCourses, startPollingForPendingCourses]);

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
  const pendingCount = courses.filter((c) => c.status === "pending").length;

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
            <Link href="/" className="text-2xl font-extrabold tracking-tight text-[var(--primary)]">
              Kogno
            </Link>
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
                <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300">
                  <span className="flex h-2 w-2 rounded-full bg-amber-400"></span>
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
                className="w-full"
              >
                <Tooltip content="Create a new course" position="bottom" delay={300} className="w-full">
                  <Link
                    href="/courses/create"
                    className="group relative flex h-full min-h-[11.5rem] flex-col justify-between overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-5 py-4 transition-all duration-200 hover:border-[var(--primary)]/50 hover:shadow-lg hover:shadow-[var(--primary)]/5"
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/8 via-transparent to-[var(--primary)]/6" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-[var(--foreground)]">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)]/15 text-[var(--primary)]">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <p className="text-lg font-bold">Create New Course</p>
                      </div>
                      <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                        Upload a syllabus and get a tailored study path.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
                      Start building
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                </Tooltip>
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
