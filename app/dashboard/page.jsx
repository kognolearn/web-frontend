"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import CourseCard from "@/components/courses/CourseCard";
import CreateCourseCard from "@/components/courses/CreateCourseCard";
import FlashcardDeck from "@/components/content/FlashcardDeck";
import RichBlock from "@/components/content/RichBlock";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { theme, toggleTheme, mounted } = useTheme();
  
  const cards = {
    "1": [
      "Define cache hit rate and how it’s computed.",
      "Hit rate = hits / total accesses.",
      "Often computed over a trace; miss rate = 1 - hit rate."
    ],
    "2": [
      "What is virtual memory?",
      "Illusion of contiguous address space via paging.",
      "Enables isolation, protection; page tables + TLB."
    ],
    "3": [
      "Explain TLB misses.",
      "A miss in the translation cache requiring a page table walk.",
      "Can trigger page faults if mapping absent."
    ]
  };

  const sampleRichBlock = {
    "content": [
      { "text": "Hi blah blah blah \nHsihshdbnaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
      { "inline-math": "x+5" },
      { "text": "Hi again!" },
      { "block-math": "\\frac{\\partial V}{\\partial t} + \\frac{1}{2}\\sigma^2 S^2 \\frac{\\partial^2 V}{\\partial S^2} + rS \\frac{\\partial V}{\\partial S} - rV = 0" }
    ]
  };

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

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there";
  const hasCourses = courses.length > 0;

  if (loading || !mounted) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[var(--background)] text-[var(--muted-foreground)]">
        <div className="card rounded-[24px] px-10 py-8 text-center text-sm">
          Calibrating your workspace…
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)] transition-colors">
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pb-16 pt-12 sm:px-6 lg:px-8">
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={theme === "dark"}
            aria-label="Toggle color mode"
            className="pill-outline text-[10px]"
          >
            <span className="flex items-center gap-2 text-[var(--muted-foreground-strong)]">
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
          <button
            onClick={handleSignOut}
            className="pill-outline text-[10px] text-[var(--muted-foreground-strong)] hover:text-[var(--foreground)]"
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
              const created = course.created_at ? new Date(course.created_at) : null;
              const when = created
                ? new Intl.DateTimeFormat(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "numeric",
                  }).format(created)
                : "Unknown";
              const courseTitle =
                course?.title ||
                course?.course_title ||
                course?.name ||
                course?.courseName ||
                "Generated course";
              const courseCodeLabel = course?.code || course?.course_code || courseTitle;
              const description = `${courseTitle}${courseTitle ? " · " : ""}Created ${when}`;
              return (
                <CourseCard
                  key={course.id}
                  courseCode={courseCodeLabel}
                  courseName={description}
                  courseId={course.id}
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

       {/* <div className="p-6">
        <FlashcardDeck data={cards} />
        <p className="mt-3 text-xs text-[var(--muted-foreground)]">
          Shortcuts: ←/h/k = Prev • →/l/j = Next • Space/Enter = Flip • Home/End = Jump ends
        </p>
      </div> */} 

      <div className="p-6">
        <RichBlock block={sampleRichBlock} />
      </div>


    </div>
  );
}
