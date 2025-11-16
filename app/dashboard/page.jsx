"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import CourseCard from "@/components/courses/CourseCard";
import CreateCourseCard from "@/components/courses/CreateCourseCard";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { mounted } = useTheme();

  const loadCourses = useCallback(async (userId) => {
    try {
      const res = await fetch(`/api/courses?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) {
        console.error("Failed to fetch courses from API", res.status);
        setCourses([]);
      } else {
        const body = await res.json();
        const items = Array.isArray(body?.courses) ? body.courses : [];
        setCourses(items);
      }
    } catch (err) {
      console.error("Error fetching courses from API:", err);
      setCourses([]);
    }
  }, []);

  const handleDeleteCourse = useCallback((courseId) => {
    setCourses((prev) => prev.filter((course) => course.id !== courseId));
    window.dispatchEvent(new Event("courses:updated"));
  }, []);

  useEffect(() => {
    const loadUserAndCourses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/auth/create-account");
        return;
      }

      setUser(user);
      await loadCourses(user.id);

      setLoading(false);
    };

    loadUserAndCourses();
  }, [router, loadCourses]);

  // Listen for course updates triggered elsewhere (e.g., CreateCourseCard/Modal)
  useEffect(() => {
    if (!user?.id) return;
    const handler = () => {
      setLoading(true);
      loadCourses(user.id).finally(() => setLoading(false));
    };
    window.addEventListener("courses:updated", handler);
    return () => window.removeEventListener("courses:updated", handler);
  }, [user, loadCourses]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there";
  const hasCourses = courses.length > 0;

  if (loading || !mounted) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-16 pt-12 sm:px-6 lg:px-8">
          {/* Header skeleton */}
          <div className="card rounded-[28px] px-8 py-10 animate-pulse">
            <div className="h-8 w-2/5 rounded bg-[var(--surface-muted)]" />
            <div className="mt-4 h-5 w-3/5 rounded bg-[var(--surface-muted)]" />
          </div>

          {/* Stats skeleton */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card rounded-2xl p-6 animate-pulse">
                <div className="h-4 w-24 rounded bg-[var(--surface-muted)]" />
                <div className="mt-3 h-8 w-16 rounded bg-[var(--surface-muted)]" />
              </div>
            ))}
          </div>

          {/* Grid skeleton */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card rounded-2xl p-6 animate-pulse">
                <div className="h-5 w-4/5 rounded bg-[var(--surface-muted)]" />
                <div className="mt-3 h-4 w-2/3 rounded bg-[var(--surface-muted)]" />
                <div className="mt-5 h-10 w-full rounded-xl bg-[var(--surface-muted)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)] transition-colors">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-[var(--primary)]/5 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-[var(--primary)]/5 blur-3xl"></div>
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-2xl font-bold text-[var(--primary)]">
              Kogno
            </Link>
            <span className="text-sm text-[var(--muted-foreground)]">/</span>
            <span className="text-sm font-medium text-[var(--muted-foreground)]">Dashboard</span>
          </div>
          <button
            onClick={handleSignOut}
            className="btn btn-ghost btn-sm"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>

        {/* Welcome header */}
        <header className="card rounded-[28px] border-2 border-[var(--primary)]/20 bg-gradient-to-br from-[var(--surface-1)] to-[var(--surface-2)] p-8 sm:p-10 shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold sm:text-4xl">
                Welcome back, {displayName}
              </h1>
              <p className="text-[var(--muted-foreground)] max-w-2xl">
                Continue your learning journey or start a new course. Track your progress and achieve your goals.
              </p>
            </div>
            <Link
              href="/courses/create"
              className="btn btn-primary btn-lg group"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create course
            </Link>
          </div>
        </header>

        {/* Stats cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card group rounded-2xl border border-[var(--border)] p-6 hover:border-[var(--primary)]/50 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Total Courses</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 group-hover:from-blue-500/30 group-hover:to-blue-500/10 transition-all">
                <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-[var(--foreground)]">{courses.length}</p>
          </div>

          <div className="card group rounded-2xl border border-[var(--border)] p-6 hover:border-[var(--primary)]/50 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Active</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/5 group-hover:from-green-500/30 group-hover:to-green-500/10 transition-all">
                <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-[var(--foreground)]">{courses.length}</p>
          </div>

          <div className="card group rounded-2xl border border-[var(--border)] p-6 hover:border-[var(--primary)]/50 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Study Hours</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 group-hover:from-purple-500/30 group-hover:to-purple-500/10 transition-all">
                <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-[var(--foreground)]">{courses.length * 12}</p>
          </div>

          <div className="card group rounded-2xl border border-[var(--border)] p-6 hover:border-[var(--primary)]/50 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Progress</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 group-hover:from-[var(--primary)]/30 group-hover:to-[var(--primary)]/10 transition-all">
                <svg className="h-5 w-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-[var(--foreground)]">68%</p>
          </div>
        </div>

        {/* Courses section */}
        <main className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Your courses</h2>
            {hasCourses && (
              <Link href="/courses/create" className="btn btn-outline btn-sm">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New course
              </Link>
            )}
          </div>

          {!hasCourses ? (
            <div className="card rounded-[28px] border-2 border-dashed border-[var(--border)] p-16 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--primary)]/10">
                <svg className="h-10 w-10 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">No courses yet</h3>
              <p className="text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
                Create your first course to start your learning journey. Track progress, set goals, and achieve success.
              </p>
              <Link href="/courses/create" className="btn btn-primary btn-lg">
                Create your first course
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                    endDate={course.end_date || course.endDate}
                    userId={user?.id}
                    onDelete={handleDeleteCourse}
                  />
                );
              })}
              <CreateCourseCard />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
