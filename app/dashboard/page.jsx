"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import CourseCard from "@/components/courses/CourseCard";
import DeleteCourseModal from "@/components/courses/DeleteCourseModal";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const { mounted } = useTheme();
  const pollingRef = useRef(null);

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
        return items;
      }
    } catch (err) {
      console.error("Error fetching courses from API:", err);
      setCourses([]);
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
      setLoading(true);
      const courseList = await loadCourses(user.id);
      startPollingForPendingCourses(user.id, courseList);
      setLoading(false);
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

    const res = await fetch(`/api/courses?userId=${user.id}&courseId=${courseToDelete.id}`, {
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
                className="relative rounded-2xl p-5 h-44 flex flex-col overflow-hidden backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-lg animate-pulse"
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
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
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
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-1/2 -left-40 h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-[var(--primary)]/15 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute -bottom-20 right-1/3 h-[350px] w-[350px] rounded-full bg-gradient-to-t from-[var(--primary)]/10 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />

        {/* Mesh gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--background)]/50 to-[var(--background)]" />

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary-rgb),0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary-rgb),0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-[var(--primary)]">
            Kogno
          </Link>
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

        {/* Welcome header - simplified */}
        <header>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold sm:text-4xl">
              Welcome back, {displayName}
            </h1>
            <p className="text-[var(--muted-foreground)]">
              {hasCourses ? "Continue your learning journey." : "Create your first course to get started."}
            </p>
          </div>
        </header>
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
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {/* Create Course Card - always first */}
              <Link
                href="/courses/create"
                className="group relative rounded-2xl border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)]/50 bg-[var(--surface-1)]/50 p-6 h-44 flex flex-col items-center justify-center transition-all hover:bg-[var(--primary)]/5"
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-[var(--primary)]/10 group-hover:bg-[var(--primary)]/20 group-hover:scale-110 transition-all mb-3">
                  <svg className="w-7 h-7 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="font-semibold text-[var(--foreground)]">Create New Course</span>
                <span className="text-sm text-[var(--muted-foreground)] mt-1">Build your study plan</span>
              </Link>

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
