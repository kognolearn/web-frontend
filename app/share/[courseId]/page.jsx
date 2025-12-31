"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { authFetch } from "@/lib/api";

export default function ShareCoursePage() {
  const router = useRouter();
  const { courseId } = useParams();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courseTitle, setCourseTitle] = useState("Shared course");
  const [modules, setModules] = useState([]);
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sharePath = `/share/${courseId}`;
  const redirectTarget = searchParams.get("redirectTo") || sharePath;

  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) {
        router.replace(`/auth/sign-in?redirectTo=${encodeURIComponent(sharePath)}`);
        return;
      }
      setUser(user);
    })();
    return () => {
      mounted = false;
    };
  }, [router, sharePath]);

  useEffect(() => {
    if (!user?.id || !courseId) return;
    let aborted = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const res = await authFetch(`/api/courses/${courseId}/plan`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Failed to load course (${res.status})`);
        }
        const json = await res.json();
        if (aborted) return;
        const title =
          json?.title ||
          json?.course_title ||
          json?.name ||
          json?.courseName ||
          "Shared course";
        setCourseTitle(title);
        setModules(Array.isArray(json?.modules) ? json.modules : []);
      } catch (e) {
        if (aborted) return;
        setError(e?.message || "Failed to load course details.");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [user?.id, courseId]);

  const totalSeconds = useMemo(() => {
    const h = Number.parseInt(hours, 10) || 0;
    const m = Number.parseInt(minutes, 10) || 0;
    if (h < 0 || m < 0) return 0;
    return (h * 60 + m) * 60;
  }, [hours, minutes]);

  const handleLoadCourse = async () => {
    if (!user?.id || !courseId || totalSeconds <= 0) return;
    setSubmitError("");
    setSubmitSuccess("");
    setSubmitting(true);
    try {
      const res = await authFetch("/api/courses/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          seconds_to_complete: totalSeconds,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to load course.");
      }
      const data = await res.json().catch(() => ({}));
      setSubmitSuccess("Course loaded. Redirecting…");
      if (data?.courseId) {
        router.push(`/courses/${data.courseId}`);
      }
    } catch (e) {
      setSubmitError(e?.message || "Failed to load course.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <Link href="/dashboard" className="hover:text-[var(--primary)]">
            Dashboard
          </Link>
          <span>/</span>
          <span>Shared course</span>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)]/80 backdrop-blur-xl shadow-xl overflow-hidden">
          <div className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--primary)]/10 via-[var(--primary)]/5 to-transparent px-6 py-5 sm:px-8">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)] font-semibold mb-1">
              Course share
            </p>
            <h1 className="text-2xl font-bold leading-snug">
              Someone shared a course with you
            </h1>
            <p className="text-[var(--muted-foreground)] mt-2">
              Review the course outline and set how much time you want to spend. We will clone it to your account with fresh progress.
            </p>
          </div>

          <div className="grid gap-6 p-6 sm:grid-cols-3 sm:p-8">
            <div className="sm:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)] font-semibold">Course</p>
                  <h2 className="text-xl font-semibold">{courseTitle}</h2>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Modules</h3>
                  <span className="text-xs text-[var(--muted-foreground)]">{modules.length} total</span>
                </div>
                {loading ? (
                  <p className="text-sm text-[var(--muted-foreground)]">Loading modules…</p>
                ) : error ? (
                  <p className="text-sm text-red-500">{error}</p>
                ) : modules.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">No modules found for this course.</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                    {modules.map((module, idx) => {
                      const lessonCount = Array.isArray(module?.lessons) ? module.lessons.length : 0;
                      return (
                        <div
                          key={module?.id || idx}
                          className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/70 px-3 py-2.5"
                        >
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] font-semibold">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium leading-tight truncate">{module?.title || `Module ${idx + 1}`}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">{lessonCount} lesson{lessonCount === 1 ? "" : "s"}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold">Set your study time</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">Tell us how long you want to complete this course.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1 text-sm">
                    <span className="text-[var(--muted-foreground)]">Hours</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 focus:border-[var(--primary)] focus:outline-none"
                      placeholder="e.g. 2"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-[var(--muted-foreground)]">Minutes</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      inputMode="numeric"
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 focus:border-[var(--primary)] focus:outline-none"
                      placeholder="e.g. 30"
                    />
                  </label>
                </div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  Total: {totalSeconds > 0 ? `${Math.floor(totalSeconds / 3600)}h ${Math.floor((totalSeconds % 3600) / 60)}m` : "Set a duration"}
                </div>
                {submitError && <p className="text-sm text-red-500">{submitError}</p>}
                {submitSuccess && <p className="text-sm text-green-600">{submitSuccess}</p>}
                {totalSeconds > 0 && (
                  <button
                    type="button"
                    onClick={handleLoadCourse}
                    disabled={submitting}
                    className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:translate-y-[-1px] hover:shadow-xl disabled:opacity-70"
                  >
                    {submitting ? "Loading…" : "Load course"}
                  </button>
                )}
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/70 p-3 text-xs text-[var(--muted-foreground)]">
                By loading, we will clone this course into your account with fresh progress so you can track your own completion.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
