"use client";

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
  const { theme, toggleTheme, mounted } = useTheme();

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

  useEffect(() => {
    const loadUserAndCourses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/auth/signup");
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

  if (loading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-[var(--muted-foreground)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors">
      {/* Header */}
      <div className="border-b border-[var(--border-muted)] bg-[var(--surface-1)]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-[var(--foreground)]">
                Ed Platform
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={toggleTheme}
                aria-pressed={theme === "dark"}
                aria-label="Toggle color mode"
                className="relative inline-flex items-center justify-center rounded-full border border-[var(--border-muted)] bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:bg-primary/20 hover:text-[var(--foreground)]"
              >
                <span className="flex items-center gap-2">
                  {theme === "dark" ? (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M6.05 6.05 4.636 4.636m12.728 0l-1.414 1.414M6.05 17.95l-1.414 1.414M12 8a4 4 0 100 8 4 4 0 000-8z" />
                    </svg>
                  )}
                  {theme === "dark" ? "Dark" : "Light"} mode
                </span>
              </button>
              <span className="text-sm text-[var(--muted-foreground)]">
                {user?.user_metadata?.full_name || user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card-shell gradient-border rounded-2xl mb-8 px-6 py-5">
          <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-2">
            My Courses
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {courses.length === 0
              ? "You haven't created any courses yet. Start by generating a tailored plan."
              : `You have ${courses.length} course${courses.length !== 1 ? "s" : ""} ready to explore.`}
          </p>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {courses.map((course) => {
            const created = course.created_at ? new Date(course.created_at) : null;
            const when = created ? created.toLocaleString() : "Unknown date";
            return (
              <CourseCard
                key={course.id}
                courseCode={"Generated Course"}
                courseName={`Created ${when}`}
                courseId={course.id}
              />
            );
          })}
          
          {/* Create New Course Card */}
          <CreateCourseCard />
        </div>
      </div>
    </div>
  );
}
