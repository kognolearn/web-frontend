"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { authFetch } from "@/lib/api";
import { resolveAsyncJobResponse } from "@/utils/asyncJobs";
import { useTheme } from "@/components/theme/ThemeProvider";
import SubscriptionBadge from "@/components/ui/SubscriptionBadge";

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

export default function AdHocExamGradingPage() {
  const router = useRouter();
  const { mounted } = useTheme();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [adHocCourseId, setAdHocCourseId] = useState("");
  const [adHocMode, setAdHocMode] = useState("combined");
  const [adHocBlankFile, setAdHocBlankFile] = useState(null);
  const [adHocSubmissionFile, setAdHocSubmissionFile] = useState(null);
  const [adHocCombinedFile, setAdHocCombinedFile] = useState(null);
  const [adHocStatus, setAdHocStatus] = useState("idle");
  const [adHocError, setAdHocError] = useState("");
  const [adHocResult, setAdHocResult] = useState(null);
  const adHocAbortRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/sign-in?redirect=/exams/ad-hoc");
        return;
      }

      if (cancelled) return;
      try {
        const [coursesRes, subscriptionRes] = await Promise.all([
          authFetch("/api/courses"),
          authFetch("/api/stripe?endpoint=subscription-status"),
        ]);

        if (!cancelled) {
          if (coursesRes.ok) {
            const body = await coursesRes.json();
            setCourses(Array.isArray(body?.courses) ? body.courses : []);
          }
          if (subscriptionRes.ok) {
            const status = await subscriptionRes.json();
            setSubscriptionStatus(status);
          }
        }
      } catch (err) {
        console.error("Failed to load ad-hoc grading data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!courses.length) {
      if (adHocCourseId) {
        setAdHocCourseId("");
      }
      return;
    }

    const hasSelection = courses.some((course) => course.id === adHocCourseId);
    if (!hasSelection) {
      setAdHocCourseId(courses[0].id);
    }
  }, [adHocCourseId, courses]);

  useEffect(() => {
    return () => {
      if (adHocAbortRef.current) {
        adHocAbortRef.current.abort();
      }
    };
  }, []);

  const hasPremiumAccess =
    subscriptionStatus?.planLevel === "paid" || subscriptionStatus?.trialActive;
  const isFreeTier = !hasPremiumAccess;
  const hasCourses = courses.length > 0;
  const isAdHocGrading = adHocStatus === "grading";
  const isAdHocCombined = adHocMode === "combined";
  const adHocHasFiles = isAdHocCombined
    ? Boolean(adHocCombinedFile)
    : Boolean(adHocBlankFile && adHocSubmissionFile);
  const adHocInputsDisabled = isFreeTier || !hasCourses || isAdHocGrading;
  const canSubmitAdHoc =
    !isFreeTier &&
    hasCourses &&
    Boolean(adHocCourseId) &&
    adHocHasFiles &&
    !isAdHocGrading;

  const resetAdHocFeedback = () => {
    setAdHocError("");
    setAdHocResult(null);
    if (adHocStatus !== "grading") {
      setAdHocStatus("idle");
    }
  };

  const handleAdHocModeChange = (event) => {
    const nextMode = event.target.value;
    setAdHocMode(nextMode);
    setAdHocBlankFile(null);
    setAdHocSubmissionFile(null);
    setAdHocCombinedFile(null);
    resetAdHocFeedback();
  };

  const handleAdHocSubmit = useCallback(async (event) => {
    event.preventDefault();
    setAdHocError("");
    setAdHocResult(null);

    if (isFreeTier) {
      setAdHocError("Custom exam grading is available on the Pro plan.");
      return;
    }

    if (!adHocCourseId) {
      setAdHocError("Select a course before grading an exam.");
      return;
    }

    const useCombined = adHocMode === "combined";
    if (useCombined && !adHocCombinedFile) {
      setAdHocError("Upload a combined PDF to continue.");
      return;
    }
    if (!useCombined && (!adHocBlankFile || !adHocSubmissionFile)) {
      setAdHocError("Upload both the blank exam and student submission PDFs.");
      return;
    }

    if (adHocAbortRef.current) {
      adHocAbortRef.current.abort();
    }

    const abortController = new AbortController();
    adHocAbortRef.current = abortController;

    setAdHocStatus("grading");

    try {
      const formData = new FormData();
      if (useCombined) {
        formData.append("combined_pdf", adHocCombinedFile);
      } else {
        formData.append("blank_exam_pdf", adHocBlankFile);
        formData.append("student_submission_pdf", adHocSubmissionFile);
      }

      const res = await authFetch(
        `/api/courses/${adHocCourseId}/exams/grade-ad-hoc`,
        {
          method: "POST",
          body: formData,
          signal: abortController.signal,
        }
      );

      const { result } = await resolveAsyncJobResponse(res, {
        signal: abortController.signal,
        errorLabel: "grade ad-hoc exam",
      });

      if (!result) {
        throw new Error("Grading completed but no result was returned.");
      }

      setAdHocResult(result);
      setAdHocStatus("success");
    } catch (err) {
      if (err?.name === "AbortError") return;
      setAdHocStatus("error");
      setAdHocError(err?.message || "Failed to grade the exam.");
    }
  }, [
    adHocBlankFile,
    adHocCombinedFile,
    adHocCourseId,
    adHocMode,
    adHocSubmissionFile,
    isFreeTier,
  ]);

  if (loading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)] transition-colors">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full blur-3xl animate-pulse"
          style={{
            animationDuration: "8s",
            background: `radial-gradient(circle, rgba(var(--primary-rgb), var(--grid-glow-opacity)) 0%, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.25)) 100%)`,
          }}
        />
        <div
          className="absolute top-1/2 -left-40 h-[400px] w-[400px] rounded-full blur-3xl animate-pulse"
          style={{
            animationDuration: "10s",
            animationDelay: "2s",
            background: `radial-gradient(circle, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.75)) 0%, transparent 100%)`,
          }}
        />
        <div
          className="absolute -bottom-20 right-1/3 h-[350px] w-[350px] rounded-full blur-3xl animate-pulse"
          style={{
            animationDuration: "12s",
            animationDelay: "4s",
            background: `radial-gradient(circle, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.5)) 0%, transparent 100%)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--background)]/50 to-[var(--background)]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-16 pt-8">
        <div className="rounded-2xl border border-[var(--border)]/70 bg-[var(--surface-1)]/60 p-4 sm:p-6 shadow-lg shadow-black/10 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/images/kogno_logo.png"
                alt="Kogno Logo"
                width={200}
                height={70}
                className="h-10 w-auto object-contain"
                priority
              />
              <span className="text-xl font-extrabold tracking-tight text-[var(--primary)]">
                Kogno
              </span>
            </Link>
            <div className="flex items-center gap-2">
              {subscriptionStatus && (
                <SubscriptionBadge
                  planLevel={subscriptionStatus.planLevel}
                  expiresAt={subscriptionStatus.subscription?.currentPeriodEnd}
                  className="hidden sm:inline-flex"
                />
              )}
              <Link href="/dashboard" className="btn btn-ghost btn-sm">
                Back to dashboard
              </Link>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold">
              Ad-hoc exam grading
            </h1>
            <p className="text-sm sm:text-base text-[var(--muted-foreground)]">
              Upload PDFs for a one-off exam and get async grading with topic feedback.
            </p>
          </div>
        </div>

        <section className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-lg">
          <div
            className={`space-y-4 transition ${isFreeTier ? "blur-sm pointer-events-none select-none" : ""}`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">
                  Upload your PDFs
                </h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Provide a combined exam PDF or a blank + submission pair.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--muted-foreground)]">
                <span className={`h-2 w-2 rounded-full ${isFreeTier ? "bg-amber-500" : "bg-emerald-500"}`}></span>
                {isFreeTier ? "Pro feature" : "Ready"}
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleAdHocSubmit}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                    Course
                  </label>
                  <select
                    value={adHocCourseId}
                    onChange={(event) => {
                      setAdHocCourseId(event.target.value);
                      resetAdHocFeedback();
                    }}
                    disabled={adHocInputsDisabled}
                    className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 disabled:opacity-60"
                  >
                    {courses.map((course) => {
                      const courseTitle = getCourseTitle(course);
                      return (
                        <option key={course.id} value={course.id}>
                          {courseTitle}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                    Upload mode
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <label
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        isAdHocCombined
                          ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                          : "border-[var(--border)] text-[var(--muted-foreground)]"
                      } ${adHocInputsDisabled ? "opacity-60" : ""}`}
                    >
                      <input
                        type="radio"
                        name="ad-hoc-mode"
                        value="combined"
                        checked={isAdHocCombined}
                        onChange={handleAdHocModeChange}
                        disabled={adHocInputsDisabled}
                        className="sr-only"
                      />
                      Combined PDF
                    </label>
                    <label
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        !isAdHocCombined
                          ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                          : "border-[var(--border)] text-[var(--muted-foreground)]"
                      } ${adHocInputsDisabled ? "opacity-60" : ""}`}
                    >
                      <input
                        type="radio"
                        name="ad-hoc-mode"
                        value="split"
                        checked={!isAdHocCombined}
                        onChange={handleAdHocModeChange}
                        disabled={adHocInputsDisabled}
                        className="sr-only"
                      />
                      Blank + submission PDFs
                    </label>
                  </div>
                </div>
              </div>

              {isAdHocCombined ? (
                <div>
                  <label className="text-sm font-medium text-[var(--foreground)]">
                    Combined PDF (questions + answers)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => {
                      setAdHocCombinedFile(event.target.files?.[0] || null);
                      resetAdHocFeedback();
                    }}
                    disabled={adHocInputsDisabled}
                    className="mt-2 block w-full text-sm text-[var(--muted-foreground)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface-2)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--foreground)] hover:file:bg-[var(--surface-3)] disabled:opacity-60"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-[var(--foreground)]">
                      Blank exam PDF
                    </label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(event) => {
                        setAdHocBlankFile(event.target.files?.[0] || null);
                        resetAdHocFeedback();
                      }}
                      disabled={adHocInputsDisabled}
                      className="mt-2 block w-full text-sm text-[var(--muted-foreground)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface-2)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--foreground)] hover:file:bg-[var(--surface-3)] disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--foreground)]">
                      Student submission PDF
                    </label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(event) => {
                        setAdHocSubmissionFile(event.target.files?.[0] || null);
                        resetAdHocFeedback();
                      }}
                      disabled={adHocInputsDisabled}
                      className="mt-2 block w-full text-sm text-[var(--muted-foreground)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface-2)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--foreground)] hover:file:bg-[var(--surface-3)] disabled:opacity-60"
                    />
                  </div>
                </div>
              )}

              {adHocError ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
                  {adHocError}
                </div>
              ) : null}

              {isAdHocGrading ? (
                <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--primary)] animate-pulse" />
                  Grading in progress. This can take a few minutes.
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={!canSubmitAdHoc}
                >
                  {isAdHocGrading ? "Grading..." : "Grade ad-hoc exam"}
                </button>
                <span className="text-xs text-[var(--muted-foreground)]">
                  We will enqueue the grading job and notify you here once it completes.
                </span>
              </div>
            </form>

            {adHocResult ? (
              <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                      Overall score
                    </p>
                    <p className="text-2xl font-semibold text-[var(--foreground)]">
                      {typeof adHocResult?.overall_score === "number"
                        ? `${adHocResult.overall_score}/100`
                        : "Score unavailable"}
                    </p>
                  </div>
                  <div className="max-w-xl text-sm text-[var(--muted-foreground)]">
                    {adHocResult?.overall_feedback || "No overall feedback was returned."}
                  </div>
                </div>
                {Array.isArray(adHocResult?.topic_list) && adHocResult.topic_list.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                      Topic breakdown
                    </p>
                    <div className="mt-2 grid gap-3 md:grid-cols-2">
                      {adHocResult.topic_list.map((topic, index) => (
                        <div
                          key={`${topic?.topic || "topic"}-${index}`}
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-[var(--foreground)]">
                              {topic?.topic || `Topic ${index + 1}`}
                            </p>
                            <span className="text-xs font-semibold text-[var(--primary)]">
                              Grade {topic?.grade ?? "?"}
                            </span>
                          </div>
                          {topic?.explanation ? (
                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                              {topic.explanation}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {isFreeTier ? (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="max-w-lg w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/95 p-6 text-center shadow-2xl backdrop-blur-xl">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)]/15 text-[var(--primary)]">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[var(--foreground)]">
                  Custom exam grading is a premium feature
                </h3>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  Upgrade to Pro to unlock ad-hoc exam grading, faster queues, and detailed feedback.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <Link href="/?continueNegotiation=1" className="btn btn-primary btn-sm">
                    Resume Pricing Chat
                  </Link>
                  <Link href="/dashboard" className="btn btn-outline btn-sm">
                    Back to dashboard
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
