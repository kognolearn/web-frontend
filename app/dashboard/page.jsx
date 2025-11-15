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
        router.push("/auth/sign-up");
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
        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pb-16 pt-12 sm:px-6 lg:px-8">
          {/* Header skeleton */}
          <div className="card relative rounded-[32px] px-8 py-10 sm:px-10 animate-pulse">
            <div className="h-7 w-2/5 rounded bg-[var(--surface-muted)]" />
            <div className="mt-4 h-4 w-3/5 rounded bg-[var(--surface-muted)]" />
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="h-9 w-32 rounded-full bg-[var(--surface-muted)]" />
            </div>
          </div>

          {/* Grid skeleton */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card rounded-2xl p-5 animate-pulse">
                <div className="h-4 w-24 rounded bg-[var(--surface-muted)]" />
                <div className="mt-3 h-5 w-4/5 rounded bg-[var(--surface-muted)]" />
                <div className="mt-2 h-4 w-2/3 rounded bg-[var(--surface-muted)]" />
                <div className="mt-5 h-8 w-full rounded-xl bg-[var(--surface-muted)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)] transition-colors">
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pb-16 pt-12 sm:px-6 lg:px-8">
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleSignOut}
            className="pill-outline text-[10px] text-[var(--muted-foreground-strong)] hover:text-[var(--foreground)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            Sign out
          </button>
        </div>

        <header>
          <div className="card relative rounded-[32px] px-8 py-10 sm:px-10">
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              Welcome back, {displayName}.
            </h1>
            <p className="mt-4 max-w-xl text-sm text-[var(--muted-foreground)] sm:text-base">
              Dip into your study library or spark a brand-new plan. Everything stays clean and focused.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/courses/create"
                className="btn btn-primary"
              >
                Create course
              </Link>
            </div>
          </div>
        </header>

        <main className="space-y-6">
          <h2 className="text-lg font-semibold sm:text-xl">Your courses</h2>
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

          {!hasCourses && (
            <div className="card rounded-[28px] px-8 py-10 text-center text-sm text-[var(--muted-foreground)]">
              No courses yet—spin up your first plan and we&rsquo;ll list it here.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
