"use client";

import { Suspense, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import * as api from "@/lib/onboarding";
import CompletionModal from "@/components/onboarding/CompletionModal";
import { supabase } from "@/lib/supabase/client";
import ReadingRenderer from "@/components/content/ReadingRenderer";
import Quiz from "@/components/content/Quiz";
import FlashcardDeck from "@/components/content/FlashcardDeck";
import VideoBlock from "@/components/content/VideoBlock";
import TaskRenderer from "@/components/content/TaskRenderer";
import { V2ContentRenderer, isV2Content } from "@/components/content/v2";

const normalizeFormat = (fmt) => {
  if (!fmt) return "";
  const f = String(fmt).trim().toLowerCase().replace(/[-\s]+/g, "_");
  if (f === "miniquiz" || f === "mini_quiz") return "mini_quiz";
  return f;
};

const prettyFormat = (fmt) => {
  const base = String(fmt || "").toLowerCase().replace(/[_-]+/g, " ");
  return base.replace(/\b\w/g, (m) => m.toUpperCase());
};

function CoursePreviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = searchParams.get("jobId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeContentType, setActiveContentType] = useState(null);
  const [completedTypes, setCompletedTypes] = useState(() => new Set());
  const [showModal, setShowModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Track viewport for responsive adjustments
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => {
      setIsMobile(mq.matches);
      if (mq.matches) setSidebarOpen(false);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Fetch job status and data
  useEffect(() => {
    if (!jobId) {
      setError("Missing Job ID");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const status = await api.getLessonStatus(jobId);

        if (status.status === "completed" && status.nodes) {
          setData(status);
        } else if (status.status === "failed") {
          setError("Generation failed.");
        } else {
          if (status.status !== "completed") setError("Job not ready yet.");
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load lesson.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [jobId]);

  const currentNode = useMemo(() => {
    if (!data?.nodes) return null;
    return data.nodes[0];
  }, [data]);

  const currentPayload = useMemo(() => {
    return currentNode?.data || currentNode?.content_payload || null;
  }, [currentNode]);

  const availableTypes = useMemo(() => {
    if (!currentPayload) return [];

    // Check for V2 content
    if (currentPayload?.version === 2 && Array.isArray(currentPayload?.sections)) {
      return [{ key: "v2", label: "Lesson" }];
    }

    const typeAvailability = {
      reading: Boolean(currentPayload.reading),
      video:
        (Array.isArray(currentPayload.video) && currentPayload.video.length > 0) ||
        (Array.isArray(currentPayload.videos) && currentPayload.videos.length > 0),
      mini_quiz: Array.isArray(currentPayload.quiz) && currentPayload.quiz.length > 0,
      flashcards: Array.isArray(currentPayload.flashcards) && currentPayload.flashcards.length > 0,
      interactive_task: Boolean(currentPayload.interactive_task),
    };

    const labelMap = {
      reading: "Reading",
      video: "Video",
      mini_quiz: "Quiz",
      flashcards: "Flashcards",
      interactive_task: "Practice Task",
    };

    const ordered = [];
    const seen = new Set();
    const sequence = Array.isArray(currentPayload.content_sequence) ? currentPayload.content_sequence : [];
    sequence.forEach((entry) => {
      const normalized = entry === "quiz" ? "mini_quiz" : entry;
      if (typeAvailability[normalized] && !seen.has(normalized)) {
        ordered.push({ key: normalized, label: labelMap[normalized] || normalized });
        seen.add(normalized);
      }
    });

    Object.keys(typeAvailability).forEach((key) => {
      if (typeAvailability[key] && !seen.has(key)) {
        ordered.push({ key, label: labelMap[key] || key });
        seen.add(key);
      }
    });

    return ordered;
  }, [currentPayload]);

  useEffect(() => {
    if (!availableTypes.length) {
      setActiveContentType(null);
      return;
    }
    setActiveContentType(availableTypes[0].key);
    setCompletedTypes(new Set());
    setShowModal(false);
  }, [availableTypes]);

  const handleTypeCompleted = useCallback((typeKey) => {
    setCompletedTypes((prev) => {
      if (prev.has(typeKey)) return prev;
      const next = new Set(prev);
      next.add(typeKey);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!availableTypes.length || !activeContentType) return;
    const keys = availableTypes.map((entry) => entry.key);
    const allDone = keys.every((key) => completedTypes.has(key));
    if (allDone) {
      setShowModal(true);
      return;
    }

    if (completedTypes.has(activeContentType)) {
      const nextType = keys.find((key) => !completedTypes.has(key));
      if (nextType) {
        setActiveContentType(nextType);
      }
    }
  }, [availableTypes, activeContentType, completedTypes]);

  const handleGenerateFullCourse = async () => {
    if (typeof window !== "undefined" && data?.courseContext) {
      localStorage.setItem(
        "kogno_onboarding_session",
        JSON.stringify({
          collegeName: data.courseContext.college,
          courseName: data.courseContext.title,
          completedLessonId: currentNode?.id,
          jobId: jobId,
        })
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      router.push("/courses/create?from_onboarding=true");
    } else {
      router.push("/auth/create-account?next=" + encodeURIComponent("/courses/create?from_onboarding=true"));
    }
  };

  // Render content based on type
  const renderContent = () => {
    if (!currentPayload || !activeContentType) return null;

    const normFmt = normalizeFormat(activeContentType);

    // V2 Content
    if (normFmt === "v2" && isV2Content(currentPayload)) {
      return (
        <V2ContentRenderer
          content={currentPayload}
          isPreview={true}
          onComplete={() => handleTypeCompleted("v2")}
        />
      );
    }

    // Reading
    if (normFmt === "reading" && currentPayload.reading) {
      return (
        <ReadingRenderer
          content={currentPayload.reading}
          isPreview={true}
          onCompleted={() => handleTypeCompleted("reading")}
        />
      );
    }

    // Video
    if (normFmt === "video") {
      const videos = currentPayload.video || currentPayload.videos || [];
      if (videos.length > 0) {
        return (
          <VideoBlock
            videos={videos}
            isPreview={true}
            onVideoViewed={() => handleTypeCompleted("video")}
          />
        );
      }
    }

    // Quiz
    if (normFmt === "mini_quiz" && Array.isArray(currentPayload.quiz)) {
      return (
        <Quiz
          questions={currentPayload.quiz}
          isPreview={true}
          onCompleted={() => handleTypeCompleted("mini_quiz")}
        />
      );
    }

    // Flashcards
    if (normFmt === "flashcards" && Array.isArray(currentPayload.flashcards)) {
      return (
        <FlashcardDeck
          cards={currentPayload.flashcards}
          isPreview={true}
          onCompleted={() => handleTypeCompleted("flashcards")}
        />
      );
    }

    // Interactive Task
    if (normFmt === "interactive_task" && currentPayload.interactive_task) {
      return (
        <TaskRenderer
          task={currentPayload.interactive_task}
          isPreview={true}
          onCompleted={() => handleTypeCompleted("interactive_task")}
        />
      );
    }

    return <div className="text-center p-10 text-[var(--muted-foreground)]">No content available for this type.</div>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--background)] p-4 text-center">
        <h1 className="text-xl font-bold text-red-500 mb-2">Oops!</h1>
        <p className="text-[var(--muted-foreground)]">{error || "Something went wrong."}</p>
        <button onClick={() => router.push("/")} className="mt-4 text-[var(--primary)] hover:underline">
          Go Home
        </button>
      </div>
    );
  }

  const sidebarWidth = 280;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex">
      {/* Sidebar */}
      <aside
        data-course-sidebar="true"
        className={`fixed top-0 left-0 h-full bg-[var(--surface-1)] border-r border-[var(--border)] z-40 transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: sidebarWidth }}
      >
        {/* Sidebar Header */}
        <div className="h-16 border-b border-[var(--border)] flex items-center px-4 gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
            title="Back to Home"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">{data.courseContext?.title || "Preview"}</h2>
            <span className="text-xs text-[var(--muted-foreground)]">Preview Mode</span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors md:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Module/Lesson List */}
        <div className="p-4 overflow-y-auto" style={{ height: "calc(100% - 64px)" }}>
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
              Preview Module
            </div>
            <div
              className="flex items-center gap-3 p-3 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white text-sm font-medium">
                1
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{currentNode?.title || "Preview Lesson"}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {availableTypes.length} content type{availableTypes.length !== 1 ? "s" : ""}
                </p>
              </div>
              {completedTypes.size === availableTypes.length && availableTypes.length > 0 && (
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar toggle */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 flex items-center justify-center w-10 h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/90 shadow-lg backdrop-blur-xl transition-all hover:bg-[var(--surface-2)] md:hidden"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>
      )}

      {/* Desktop collapsed sidebar rail */}
      {!sidebarOpen && !isMobile && (
        <aside className="fixed top-0 left-0 h-full w-12 bg-[var(--surface-1)] border-r border-[var(--border)] z-40 flex flex-col items-center py-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors mb-4"
            title="Expand Sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
            title="Back to Home"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
        </aside>
      )}

      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <main
        className="flex-1 min-h-screen transition-all duration-200"
        style={{
          marginLeft: !isMobile ? (sidebarOpen ? sidebarWidth : 48) : 0,
        }}
      >
        {/* Top header */}
        <header className="h-16 border-b border-[var(--border)] flex items-center justify-between px-6 bg-[var(--surface-1)]/50 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-4">
            {isMobile && !sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <h1 className="font-semibold">{currentNode?.title || "Preview Lesson"}</h1>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-xs font-medium text-amber-500">Preview Mode</span>
          </div>
        </header>

        {/* Content area */}
        <div className="max-w-4xl mx-auto p-6">
          {/* Content type tabs */}
          {availableTypes.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {availableTypes.map((entry) => (
                <button
                  key={entry.key}
                  onClick={() => setActiveContentType(entry.key)}
                  className={`px-4 py-2 text-sm rounded-xl border transition-all ${
                    activeContentType === entry.key
                      ? "bg-[var(--primary)] text-white border-transparent shadow-lg shadow-[var(--primary)]/25"
                      : "bg-[var(--surface-1)] text-[var(--foreground)] border-[var(--border)] hover:border-[var(--primary)]/50"
                  }`}
                >
                  {entry.label}
                  {completedTypes.has(entry.key) && (
                    <svg className="w-4 h-4 ml-2 inline-block text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-6 shadow-sm">
            {renderContent()}
          </div>

          {/* Bottom navigation */}
          <div className="mt-6 flex justify-between items-center" data-course-bottom-bar="true">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="px-4 py-2 text-sm rounded-xl border border-[var(--border)] hover:bg-[var(--surface-1)] transition-colors"
            >
              Back to Home
            </button>
            {completedTypes.size === availableTypes.length && availableTypes.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="px-6 py-2 text-sm font-medium rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 transition-colors shadow-lg shadow-[var(--primary)]/25"
              >
                Generate Full Course
              </button>
            ) : (
              <div className="text-sm text-[var(--muted-foreground)]">
                {completedTypes.size} of {availableTypes.length} completed
              </div>
            )}
          </div>
        </div>
      </main>

      <CompletionModal isOpen={showModal} onClose={() => setShowModal(false)} onGenerate={handleGenerateFullCourse} />
    </div>
  );
}

export default function CoursePreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CoursePreviewContent />
    </Suspense>
  );
}
