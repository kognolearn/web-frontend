"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { authFetch } from "@/lib/api";
import { resolveAsyncJobResponse } from "@/utils/asyncJobs";
import { useTheme } from "@/components/theme/ThemeProvider";
import DashboardSidebar from "@/components/navigation/DashboardSidebar";

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

function formatFileSize(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export default function AdHocExamGradingPage() {
  const router = useRouter();
  const { mounted } = useTheme();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [adHocCourseId, setAdHocCourseId] = useState("");

  // Primary input: Your Answers (file-first)
  const [answersFile, setAnswersFile] = useState(null);
  const [answersMode, setAnswersMode] = useState("file");
  const [answersText, setAnswersText] = useState("");
  const [isAnswersDragActive, setIsAnswersDragActive] = useState(false);
  const answersFileInputRef = useRef(null);

  // Secondary input: Answer Key (file-first, optional)
  const [keyFile, setKeyFile] = useState(null);
  const [keyMode, setKeyMode] = useState("file");
  const [keyText, setKeyText] = useState("");
  const [isKeyDragActive, setIsKeyDragActive] = useState(false);
  const keyFileInputRef = useRef(null);

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

      // Anonymous users should not access exam grading - redirect to home
      if (user.is_anonymous) {
        router.push("/");
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

  // Validation
  const hasAnswers = answersMode === "file"
    ? Boolean(answersFile)
    : answersText.trim().length > 0;

  const canSubmitAdHoc =
    !isFreeTier &&
    hasCourses &&
    Boolean(adHocCourseId) &&
    hasAnswers &&
    !isAdHocGrading;

  const resetFeedback = () => {
    setAdHocError("");
    setAdHocResult(null);
    if (adHocStatus !== "grading") {
      setAdHocStatus("idle");
    }
  };

  // Drag and drop handlers for answers
  const handleAnswersDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAnswersDragActive(true);
  };

  const handleAnswersDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAnswersDragActive(false);
  };

  const handleAnswersDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleAnswersDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAnswersDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setAnswersFile(file);
      setAnswersMode("file");
      resetFeedback();
    }
  };

  // Drag and drop handlers for key
  const handleKeyDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsKeyDragActive(true);
  };

  const handleKeyDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsKeyDragActive(false);
  };

  const handleKeyDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleKeyDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsKeyDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setKeyFile(file);
      setKeyMode("file");
      resetFeedback();
    }
  };

  const handleAdHocSubmit = useCallback(async (event) => {
    event.preventDefault();
    setAdHocError("");
    setAdHocResult(null);

    if (isFreeTier) {
      setAdHocError("This feature is available on the Pro plan.");
      return;
    }

    if (!adHocCourseId) {
      setAdHocError("Select a course before grading.");
      return;
    }

    if (!hasAnswers) {
      setAdHocError("Please upload your answers or enter them as text.");
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

      // Add answers (file or text)
      if (answersMode === "file" && answersFile) {
        formData.append("submission_file", answersFile);
      } else if (answersMode === "text" && answersText.trim()) {
        formData.append("student_answers", answersText);
      }

      // Add reference (file or text) if provided
      if (keyMode === "file" && keyFile) {
        formData.append("reference_file", keyFile);
      } else if (keyMode === "text" && keyText.trim()) {
        formData.append("solutions_text", keyText);
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
        errorLabel: "smart grader",
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
    answersFile,
    answersText,
    answersMode,
    keyFile,
    keyText,
    keyMode,
    adHocCourseId,
    isFreeTier,
    hasAnswers,
  ]);

  const handleReset = () => {
    setAdHocResult(null);
    setAnswersFile(null);
    setAnswersText("");
    setKeyFile(null);
    setKeyText("");
    setAdHocStatus("idle");
    setAdHocError("");
    if (answersFileInputRef.current) answersFileInputRef.current.value = "";
    if (keyFileInputRef.current) keyFileInputRef.current.value = "";
  };

  if (loading || !mounted) {
    return (
      <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <DashboardSidebar activePath="/exams/ad-hoc" />
        <div className="flex-1 relative overflow-hidden">
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
          </div>
        </div>
      </div>
    );
  }

  const score = typeof adHocResult?.overall_score === "number" ? adHocResult.overall_score : 0;

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <DashboardSidebar activePath="/exams/ad-hoc" />

      <div className="flex-1 relative overflow-hidden transition-colors">
        {/* Subtle background effects */}
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
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--background)]/50 to-[var(--background)]" />
        </div>

        {/* Main content */}
        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 pb-20 pt-10 sm:px-8 lg:px-12">

          {/* Hero section for free tier */}
          {isFreeTier && (
            <div className="relative overflow-hidden rounded-2xl border border-[var(--primary)]/20 bg-gradient-to-br from-[var(--primary)]/10 via-[var(--surface-1)] to-[var(--surface-2)] p-10 lg:p-12">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)]/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[var(--primary)]/5 rounded-full blur-2xl" />

              <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-8">
                {/* Large icon */}
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/70 flex items-center justify-center shadow-lg shadow-[var(--primary)]/25">
                    <svg className="w-12 h-12 sm:w-14 sm:h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                <div className="flex-1">
                  <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] mb-3">
                    Instant Feedback
                  </h2>
                  <p className="text-lg text-[var(--muted-foreground)] mb-6 max-w-2xl">
                    Upload any assignment and get AI-powered grading with detailed feedback.
                    Works with exams, homework, essays, problem sets, and more.
                  </p>
                  <a
                    href="/?continueNegotiation=1"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-medium text-lg hover:bg-[var(--primary)]/90 transition-all shadow-lg shadow-[var(--primary)]/25 hover:shadow-xl hover:shadow-[var(--primary)]/30 hover:-translate-y-0.5"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Unlock This Feature
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Input Section */}
          <div className={`${isFreeTier ? 'opacity-40 pointer-events-none select-none' : ''}`}>

            {/* Upload zones side by side */}
            <div className="grid gap-8 lg:grid-cols-2">

              {/* Zone 1: Your Work (Required) */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/15 flex items-center justify-center">
                    <span className="text-base font-bold text-[var(--primary)]">1</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Your Work</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">Upload your assignment or answers</p>
                  </div>
                </div>

                {/* Mode toggle */}
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg border border-[var(--border)] p-0.5 bg-[var(--surface-1)]">
                    <button
                      type="button"
                      onClick={() => {
                        setAnswersMode("file");
                        resetFeedback();
                      }}
                      className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                        answersMode === "file"
                          ? "bg-[var(--primary)]/15 text-[var(--primary)] font-medium"
                          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      File
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAnswersMode("text");
                        resetFeedback();
                      }}
                      className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                        answersMode === "text"
                          ? "bg-[var(--primary)]/15 text-[var(--primary)] font-medium"
                          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      Text
                    </button>
                  </div>
                </div>

                {answersMode === "file" ? (
                  <>
                    {/* Drop zone */}
                    <label
                      onDragEnter={handleAnswersDragEnter}
                      onDragLeave={handleAnswersDragLeave}
                      onDragOver={handleAnswersDragOver}
                      onDrop={handleAnswersDrop}
                      className={`
                        group relative flex flex-col items-center justify-center
                        min-h-[260px] rounded-2xl border-2 border-dashed cursor-pointer
                        transition-all duration-200
                        ${isAnswersDragActive
                          ? 'border-[var(--primary)] bg-[var(--primary)]/10 scale-[1.02]'
                          : answersFile
                            ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5'
                            : 'border-[var(--primary)]/30 bg-[var(--surface-1)] hover:border-[var(--primary)]/60 hover:bg-[var(--primary)]/5'
                        }
                      `}
                    >
                      <input
                        ref={answersFileInputRef}
                        type="file"
                        accept=".pdf,.txt,.doc,.docx,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setAnswersFile(file);
                            resetFeedback();
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />

                      {answersFile ? (
                        <div className="text-center px-6">
                          <div className="mb-4 p-4 rounded-full bg-[var(--primary)]/15 inline-flex">
                            <svg className="w-8 h-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <p className="text-lg font-medium text-[var(--foreground)] truncate max-w-[280px]">{answersFile.name}</p>
                          <p className="text-sm text-[var(--muted-foreground)] mt-1">{formatFileSize(answersFile.size)}</p>
                        </div>
                      ) : (
                        <>
                          <div className="mb-4 p-4 rounded-full bg-[var(--primary)]/10 group-hover:bg-[var(--primary)]/15 transition-colors">
                            <svg className="w-10 h-10 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <p className="text-lg font-medium text-[var(--foreground)]">Drop your work here</p>
                          <p className="text-[var(--muted-foreground)] mt-1">or click to browse</p>
                          <p className="text-sm text-[var(--muted-foreground)] mt-4 opacity-60">PDF, DOC, DOCX, or images</p>
                        </>
                      )}
                    </label>

                    {/* Clear file button */}
                    {answersFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setAnswersFile(null);
                          if (answersFileInputRef.current) answersFileInputRef.current.value = "";
                          resetFeedback();
                        }}
                        className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                      >
                        Remove file
                      </button>
                    )}
                  </>
                ) : (
                  <textarea
                    value={answersText}
                    onChange={(e) => {
                      setAnswersText(e.target.value);
                      resetFeedback();
                    }}
                    placeholder="Paste your work here...

You can include the questions too, like:
Q1: What is photosynthesis?
A: Photosynthesis is the process..."
                    className="w-full min-h-[260px] rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-5 py-4 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-transparent transition-all resize-y"
                  />
                )}
              </div>

              {/* Zone 2: Reference Material (Optional) */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] flex items-center justify-center">
                    <span className="text-base font-bold text-[var(--muted-foreground)]">2</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Reference Material</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">Optional - questions, rubric, or answer key</p>
                  </div>
                </div>

                {/* Mode toggle */}
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg border border-[var(--border)] p-0.5 bg-[var(--surface-1)]">
                    <button
                      type="button"
                      onClick={() => {
                        setKeyMode("file");
                        resetFeedback();
                      }}
                      className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                        keyMode === "file"
                          ? "bg-[var(--surface-2)] text-[var(--foreground)] font-medium"
                          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      File
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setKeyMode("text");
                        resetFeedback();
                      }}
                      className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                        keyMode === "text"
                          ? "bg-[var(--surface-2)] text-[var(--foreground)] font-medium"
                          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      Text
                    </button>
                  </div>
                </div>

                {keyMode === "file" ? (
                  <>
                    {/* Drop zone */}
                    <label
                      onDragEnter={handleKeyDragEnter}
                      onDragLeave={handleKeyDragLeave}
                      onDragOver={handleKeyDragOver}
                      onDrop={handleKeyDrop}
                      className={`
                        group relative flex flex-col items-center justify-center
                        min-h-[260px] rounded-2xl border-2 border-dashed cursor-pointer
                        transition-all duration-200
                        ${isKeyDragActive
                          ? 'border-[var(--border)] bg-[var(--surface-2)] scale-[1.02]'
                          : keyFile
                            ? 'border-[var(--border)] bg-[var(--surface-1)]'
                            : 'border-[var(--border)]/60 bg-[var(--surface-1)] hover:border-[var(--border)] hover:bg-[var(--surface-2)]/50'
                        }
                      `}
                    >
                      <input
                        ref={keyFileInputRef}
                        type="file"
                        accept=".pdf,.txt,.doc,.docx,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setKeyFile(file);
                            resetFeedback();
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />

                      {keyFile ? (
                        <div className="text-center px-6">
                          <div className="mb-4 p-4 rounded-full bg-[var(--surface-2)] inline-flex">
                            <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <p className="text-lg font-medium text-[var(--foreground)] truncate max-w-[280px]">{keyFile.name}</p>
                          <p className="text-sm text-[var(--muted-foreground)] mt-1">{formatFileSize(keyFile.size)}</p>
                        </div>
                      ) : (
                        <>
                          <div className="mb-4 p-4 rounded-full bg-[var(--surface-2)] group-hover:bg-[var(--surface-3)] transition-colors">
                            <svg className="w-10 h-10 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <p className="text-lg font-medium text-[var(--foreground)]">Drop reference here</p>
                          <p className="text-[var(--muted-foreground)] mt-1">or click to browse</p>
                          <p className="text-sm text-[var(--muted-foreground)] mt-4 opacity-60">PDF, DOC, DOCX, or images</p>
                        </>
                      )}
                    </label>

                    {/* Clear file button */}
                    {keyFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setKeyFile(null);
                          if (keyFileInputRef.current) keyFileInputRef.current.value = "";
                          resetFeedback();
                        }}
                        className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                      >
                        Remove file
                      </button>
                    )}
                  </>
                ) : (
                  <textarea
                    value={keyText}
                    onChange={(e) => {
                      setKeyText(e.target.value);
                      resetFeedback();
                    }}
                    placeholder="Paste the questions, rubric, or answer key here..."
                    className="w-full min-h-[260px] rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-5 py-4 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-transparent transition-all resize-y"
                  />
                )}
              </div>
            </div>

            {/* Course selector + Submit row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-5 mt-10">
              <div className="sm:w-72">
                <label className="block text-base font-medium text-[var(--foreground)] mb-2">
                  Course
                </label>
                <select
                  value={adHocCourseId}
                  onChange={(event) => {
                    setAdHocCourseId(event.target.value);
                    resetFeedback();
                  }}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-5 py-4 text-base text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-transparent transition-all"
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {getCourseTitle(course)}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleAdHocSubmit}
                disabled={!canSubmitAdHoc}
                className="flex-1 h-14 rounded-xl bg-[var(--primary)] text-white text-lg font-semibold hover:bg-[var(--primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20 hover:shadow-xl hover:shadow-[var(--primary)]/25 hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
              >
                {isAdHocGrading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  "Grade My Work"
                )}
              </button>
            </div>

            {/* Error message */}
            {adHocError && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {adHocError}
              </div>
            )}

            {/* Grading progress */}
            {isAdHocGrading && (
              <div className="mt-10 p-8 rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary)]/5">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-[var(--primary)]/20 border-t-[var(--primary)] animate-spin" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-[var(--foreground)]">Analyzing your work...</p>
                    <p className="text-[var(--muted-foreground)] mt-1">Our AI is reviewing your submission and generating detailed feedback</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Section */}
          {adHocResult && (
            <div className="space-y-8 animate-fadeIn">
              {/* Score Hero */}
              <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface-1)] to-[var(--surface-2)] p-10 lg:p-12">
                <div className="relative flex flex-col sm:flex-row items-center gap-10">
                  {/* Large circular score */}
                  <div className="relative flex-shrink-0">
                    <svg className="w-44 h-44 -rotate-90">
                      <circle
                        cx="88"
                        cy="88"
                        r="76"
                        strokeWidth="12"
                        className="text-[var(--surface-3)]"
                        fill="none"
                        stroke="currentColor"
                      />
                      <circle
                        cx="88"
                        cy="88"
                        r="76"
                        strokeWidth="12"
                        className={
                          score >= 80 ? "text-emerald-500" :
                          score >= 60 ? "text-amber-500" :
                          "text-red-500"
                        }
                        fill="none"
                        stroke="currentColor"
                        strokeDasharray={`${score * 4.78} 478`}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dasharray 1.5s ease-out" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-bold text-[var(--foreground)]">{score}</span>
                      <span className="text-sm text-[var(--muted-foreground)]">out of 100</span>
                    </div>
                  </div>

                  <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] mb-3">
                      {score >= 90 ? "Excellent!" :
                       score >= 80 ? "Great job!" :
                       score >= 70 ? "Good work!" :
                       score >= 60 ? "Not bad!" :
                       "Keep practicing!"}
                    </h2>
                    {adHocResult?.overall_feedback && (
                      <p className="text-lg text-[var(--muted-foreground)] max-w-xl">
                        {adHocResult.overall_feedback}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Topic Breakdown Grid */}
              {Array.isArray(adHocResult?.topic_list) && adHocResult.topic_list.length > 0 && (
                <div className="space-y-5">
                  <h3 className="text-xl font-semibold text-[var(--foreground)]">Topic Breakdown</h3>
                  <div className="grid gap-5 lg:grid-cols-2">
                    {adHocResult.topic_list.map((topic, index) => {
                      const grade = topic?.grade ?? 0;
                      const gradeLabel = grade >= 3 ? "Strong" : grade >= 2 ? "Average" : "Needs Work";

                      let badgeClasses = "px-3 py-1.5 rounded-full text-sm font-medium ";
                      if (grade >= 3) {
                        badgeClasses += "bg-emerald-500/15 text-emerald-500";
                      } else if (grade >= 2) {
                        badgeClasses += "bg-amber-500/15 text-amber-500";
                      } else {
                        badgeClasses += "bg-red-500/15 text-red-500";
                      }

                      return (
                        <div
                          key={`${topic?.topic || "topic"}-${index}`}
                          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 hover:shadow-md hover:border-[var(--border)]/80 transition-all"
                        >
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <h4 className="text-lg font-medium text-[var(--foreground)]">
                              {topic?.topic || `Topic ${index + 1}`}
                            </h4>
                            <span className={badgeClasses}>
                              {gradeLabel}
                            </span>
                          </div>
                          {topic?.explanation && (
                            <p className="text-[var(--muted-foreground)] leading-relaxed">
                              {topic.explanation}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Try Again CTA */}
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--foreground)] text-lg font-medium hover:bg-[var(--surface-2)] transition-all"
              >
                Grade Another Assignment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
