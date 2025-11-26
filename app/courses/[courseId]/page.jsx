"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase/client";
import ChatBot from "@/components/chat/ChatBot";
import FlashcardDeck from "@/components/content/FlashcardDeck";
import Quiz from "@/components/content/Quiz";

// Utility functions moved outside
const normalizeFormat = (fmt) => {
  if (!fmt) return "";
  const f = String(fmt).trim().toLowerCase().replace(/[-\s]+/g, "_");
  if (f === "miniquiz" || f === "mini_quiz") return "mini_quiz";
  if (f === "practiceexam" || f === "practice_exam") return "practice_exam";
  return f;
};

const prettyFormat = (fmt) => {
  const base = String(fmt || "").toLowerCase().replace(/[_-]+/g, " ");
  return base.replace(/\b\w/g, (m) => m.toUpperCase());
};

// ItemContent component moved outside CoursePage
function ItemContent({
  fmt,
  id,
  userId,
  courseId,
  contentCache,
  setContentCache,
  setCurrentViewingItem,
  handleCardChange,
  onQuizQuestionChange,
  handleQuizCompleted
}) {
  const normFmt = normalizeFormat(fmt);
  const key = `${normFmt}:${id}:${userId || ''}:${courseId || ''}`;
  const cached = contentCache[key];
  const fetchInitiatedRef = useRef(new Set());

  useEffect(() => {
    if (!normFmt || !id) return undefined;
    if (fetchInitiatedRef.current.has(key)) return undefined;
    const existing = contentCache[key];
    if (existing && (existing.status === "loaded" || existing.status === "loading")) return undefined;

    fetchInitiatedRef.current.add(key);
    const ac = new AbortController();
    setContentCache((prev) => ({ ...prev, [key]: { status: "loading" } }));

    (async () => {
      try {
        const params = new URLSearchParams({ format: normFmt, id: String(id) });
        if (userId) params.set("userId", String(userId));
        if (courseId) params.set("courseId", String(courseId));
        const url = `/api/content?${params.toString()}`;
        const res = await fetch(url, { signal: ac.signal });
        let data;
        try {
          data = await res.json();
        } catch (_) {
          const raw = await res.text().catch(() => "");
          data = raw ? { raw } : {};
        }
        if (!res.ok) {
          throw new Error((data && data.error) || `Failed (${res.status})`);
        }
        setContentCache((prev) => ({ ...prev, [key]: { status: "loaded", data } }));
      } catch (e) {
        if (e.name === 'AbortError') return;
        setContentCache((prev) => ({ ...prev, [key]: { status: "error", error: String(e?.message || e) } }));
      }
    })();

    return () => {
      fetchInitiatedRef.current.delete(key);
      ac.abort();
    };
    // We intentionally exclude contentCache from deps to avoid aborting in-flight fetches
    // whenever cache state updates to "loading" or "loaded".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normFmt, id, key, userId, courseId]);

  const cachedEnvelope = cached?.data || {};
  const cachedPayload = cachedEnvelope.data;
  const cardsArray = cachedPayload?.cards;
  const flashcardData = useMemo(() => {
    if (!Array.isArray(cardsArray)) return {};
    return cardsArray.reduce((acc, card, idx) => {
      acc[String(idx + 1)] = card;
      return acc;
    }, {});
  }, [cardsArray]);

  if (!normFmt || !id) {
    return <div className="text-xs text-red-600">Missing format or id.</div>;
  }
  if (!cached || cached.status === "loading") {
    return <div className="text-xs text-[var(--muted-foreground)]">Loading {normFmt}…</div>;
  }
  if (cached.status === "error") {
    return <div className="text-xs text-red-600">{cached.error}</div>;
  }
  const data = cachedPayload || {};
  const resolvedFormat = normalizeFormat(cachedEnvelope.format) || normFmt;

  // Clear quiz context if this content is not a quiz
  useEffect(() => {
    if (!onQuizQuestionChange) return;
    if (resolvedFormat !== "mini_quiz" && resolvedFormat !== "practice_exam") {
      onQuizQuestionChange(null);
    }
  }, [resolvedFormat, onQuizQuestionChange]);

  switch (resolvedFormat) {
    case "video": {
      // Set the first video as currently viewing when component mounts
      useEffect(() => {
        if (data?.videos?.[0]) {
          setCurrentViewingItem({
            type: 'video',
            index: 0,
            title: data.videos[0].title,
            duration_min: data.videos[0].duration_min,
            summary: data.videos[0].summary,
            total: data.videos.length
          });
        }
      // Added setCurrentViewingItem (which is stable) to dependencies
      }, [data?.videos, setCurrentViewingItem]);
      
      return (
        <article className="card rounded-[28px] px-6 py-6 sm:px-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-[var(--foreground)]">Video</span>
          </div>
          <div className="space-y-4">
            {data?.videos?.map((vid, idx) => {
              if (!vid) return null;
              const rawUrl = typeof vid.url === "string" ? vid.url.trim() : "";
              let embedUrl = rawUrl || null;
              try {
                if (!rawUrl) throw new Error("missing url");
                const u = new URL(rawUrl);
                if (u.hostname === "youtu.be") {
                  embedUrl = `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
                } else if (u.hostname.includes("youtube.com")) {
                  if (u.pathname === "/watch") {
                    const v = u.searchParams.get("v");
                    if (v) embedUrl = `https://www.youtube.com/embed/${v}`;
                  } else if (u.pathname.startsWith("/shorts/") || u.pathname.startsWith("/embed/")) {
                    const id = u.pathname.split("/").filter(Boolean).pop();
                    if (id) embedUrl = `https://www.youtube.com/embed/${id}`;
                  }
                }
              } catch {}
              if (!embedUrl) {
                return (
                  <div key={idx} className="rounded-lg border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
                    Video link missing or invalid.
                  </div>
                );
              }
              return (
                <div key={idx}>
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      src={embedUrl}
                      title={vid.title}
                      className="absolute top-0 left-0 w-full h-full rounded-lg"
                      frameBorder="0"
                      allowFullScreen
                    />
                  </div>
                  <div className="mt-3">
                    <p className="text-base font-semibold">{vid.title}</p>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">{vid.duration_min} min</p>
                    {vid.summary && (
                      <p className="text-sm text-[var(--muted-foreground)] mt-2">{vid.summary}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      );
    }
    case "reading": {
      const latexContent = data?.body || data?.reading || "";
      
      return (
        <article className="card rounded-[28px] px-6 py-6 sm:px-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-[var(--foreground)]">Reading</span>
          </div>
          <div className="prose prose-sm max-w-none text-[var(--foreground)]">
            <div dangerouslySetInnerHTML={{ __html: latexContent }} />
          </div>
        </article>
      );
    }
    case "flashcards": {
      return <FlashcardDeck data={flashcardData} onCardChange={handleCardChange} />;
    }
    case "mini_quiz":
    case "practice_exam": {
      // Pass the data directly to Quiz component which handles normalization
  return (
    <Quiz 
      questions={data?.questions || data} 
      onQuestionChange={onQuizQuestionChange}
      onQuizCompleted={handleQuizCompleted}
      userId={userId}
      courseId={courseId}
      lessonId={id}
    />
  );
    }
    default:
      return (
        <article className="card rounded-[28px] px-6 py-6 sm:px-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-[var(--foreground)]">Content</span>
          </div>
          <pre className="overflow-auto text-xs p-4 bg-[var(--surface-2)] rounded-lg">
            {JSON.stringify(data ?? cached.data, null, 2)}
          </pre>
        </article>
      );
  }
}

export default function CoursePage() {
  const { courseId } = useParams();
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courseName, setCourseName] = useState("");
  const [studyPlan, setStudyPlan] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [contentCache, setContentCache] = useState({});
  const [chatBotWidth, setChatBotWidth] = useState(0);
  const [chatQuizContext, setChatQuizContext] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState("syllabus"); // "syllabus" or "topic"
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [expandedLessons, setExpandedLessons] = useState(new Set());
  const [selectedContentType, setSelectedContentType] = useState(null); // { lessonId, type }
  const [currentViewingItem, setCurrentViewingItem] = useState(null); // Current flashcard or video being viewed

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!mounted) return;
        if (!user) {
          setError("No user session found.");
          setLoading(false);
          return;
        }
        setUserId(user.id);
      } catch (e) {
        if (!mounted) return;
        setError("Failed to load user.");
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Track viewport for responsive adjustments
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => {
      setIsMobile(mq.matches);
      if (mq.matches) {
        setSidebarOpen(false);
      }
    };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Sidebar resize handler
  useEffect(() => {
    if (!isResizingSidebar) return;

    const handleMouseMove = (e) => {
      const newWidth = e.clientX;
      if (newWidth >= 250 && newWidth <= 500) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingSidebar]);

  useEffect(() => {
    if (!userId || !courseId) return;
    let aborted = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        // Fetch course metadata first to get the course name
        const courseMetaUrl = `/api/courses?userId=${encodeURIComponent(userId)}&courseId=${encodeURIComponent(courseId)}`;
        const courseMetaRes = await fetch(courseMetaUrl);
        if (courseMetaRes.ok) {
          const courseMeta = await courseMetaRes.json();
          if (!aborted && courseMeta?.name) {
            setCourseName(courseMeta.name);
          }
        }
        
        // Fetch study plan
        const url = `/api/courses/${encodeURIComponent(courseId)}/plan?userId=${encodeURIComponent(userId)}&hours=50`;
        const res = await fetch(url);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Request failed: ${res.status}`);
        }
        const json = await res.json();
        if (aborted) return;
        setStudyPlan(json);
        
        // Auto-select first lesson if available
        if (json?.modules?.[0]?.lessons?.[0]) {
          setSelectedLesson(json.modules[0].lessons[0]);
        }
      } catch (e) {
        if (aborted) return;
        setError(e?.message || "Failed to load study plan.");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [userId, courseId]);

  const refetchStudyPlan = useCallback(async () => {
    if (!userId || !courseId) return;
    try {
      const url = `/api/courses/${encodeURIComponent(courseId)}/plan?userId=${encodeURIComponent(userId)}&hours=50`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }
      const json = await res.json();
      setStudyPlan(json);
    } catch (e) {
      console.error('Failed to refetch study plan:', e);
    }
  }, [userId, courseId]);

  // Prefetch all unlocked content when study plan loads
  useEffect(() => {
    if (!studyPlan || !userId || !courseId) return;

    const allUnlockedLessons = studyPlan.modules?.flatMap(module => 
      module.lessons?.filter(lesson => !lesson.is_locked) || []
    ) || [];

    // Prefetch all content types for all unlocked lessons
    allUnlockedLessons.forEach(lesson => {
      if (lesson.id) {
        // Prefetch all available content types
        prefetchLessonContent(lesson.id, ['reading', 'video', 'flashcards', 'mini_quiz']);
      }
    });
  }, [studyPlan, userId, courseId]);

  const handleLessonClick = (lesson) => {
    if (lesson.is_locked) return;
    
    // Toggle expanded state
    const newExpanded = new Set(expandedLessons);
    if (newExpanded.has(lesson.id)) {
      newExpanded.delete(lesson.id);
    } else {
      newExpanded.add(lesson.id);
      // Prefetch content to determine available content types
      prefetchLessonContent(lesson.id);
    }
    setExpandedLessons(newExpanded);
  };

  const prefetchLessonContent = (lessonId, formats = ['reading']) => {
    formats.forEach(format => {
      const normFmt = normalizeFormat(format);
      const key = `${normFmt}:${lessonId}:${userId || ''}:${courseId || ''}`;
      
      // If already cached or loading, skip
      if (contentCache[key]) return;
      
      // Start fetch
      setContentCache((prev) => ({ ...prev, [key]: { status: "loading" } }));
      
      (async () => {
        try {
          const params = new URLSearchParams({ 
            format: normFmt, 
            id: String(lessonId) 
          });
          if (userId) params.set("userId", String(userId));
          if (courseId) params.set("courseId", String(courseId));
          const url = `/api/content?${params.toString()}`;
          const res = await fetch(url);
          let data;
          try {
            data = await res.json();
          } catch (_) {
            const raw = await res.text().catch(() => "");
            data = raw ? { raw } : {};
          }
          if (!res.ok) {
            throw new Error((data && data.error) || `Failed (${res.status})`);
          }
          setContentCache((prev) => ({ ...prev, [key]: { status: "loaded", data } }));
        } catch (e) {
          setContentCache((prev) => ({ ...prev, [key]: { status: "error", error: String(e?.message || e) } }));
        }
      })();
    });
  };

  const handleContentTypeClick = (lesson, contentType) => {
    setSelectedLesson(lesson);
    setSelectedContentType({ lessonId: lesson.id, type: contentType });
    setViewMode("topic");
    setCurrentViewingItem(null); // Reset when switching content
  };

  const handleBackToSyllabus = () => {
    setViewMode("syllabus");
    setSelectedLesson(null);
    setSelectedContentType(null);
    setCurrentViewingItem(null); // Reset when going back
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Memoized callback for flashcard changes
  const handleCardChange = useCallback((cardInfo) => {
    setCurrentViewingItem({
      type: 'flashcard',
      ...cardInfo
    });
  }, []);

  // Callback for quiz completion
  const handleQuizCompleted = useCallback(async () => {
    await refetchStudyPlan();
  }, [refetchStudyPlan]);

  // Get available content types from cached data
  const getAvailableContentTypes = (lessonId) => {
    const types = [];
    const cacheKeys = Object.keys(contentCache);
    
    // Check what content is available for this lesson
    const lessonCacheKey = cacheKeys.find(key => key.includes(`:${lessonId}:`));
    if (lessonCacheKey) {
      const cached = contentCache[lessonCacheKey];
      if (cached?.status === "loaded" && cached?.data?.data) {
        const data = cached.data.data;
        if (data.body || data.reading) types.push({ label: "Reading", value: "reading" });
        if (data.videos && data.videos.length > 0) types.push({ label: "Video", value: "video" });
        if (data.cards && data.cards.length > 0) types.push({ label: "Flashcards", value: "flashcards" });
        if (data.questions || data.mcq || data.frq) types.push({ label: "Quiz", value: "mini_quiz" });
      }
    }
    
    // Fallback: assume all lessons have reading by default
    if (types.length === 0) {
      types.push({ label: "Reading", value: "reading" });
    }
    
    return types;
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)] transition-colors flex">
      {/* Sidebar */}
      {!loading && !error && studyPlan && (
        <>
          {/* Mobile backdrop */}
          {isMobile && sidebarOpen && (
            <div
              className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          
          {/* Sidebar container */}
          <aside
            className={`fixed left-0 top-0 h-screen bg-[var(--surface-1)] border-r border-[var(--border)] transition-transform duration-200 z-40 flex flex-col ${
              isMobile
                ? sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                : sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{ width: isMobile ? '280px' : `${sidebarWidth}px` }}
          >
            {/* Sidebar header */}
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="btn btn-ghost btn-sm text-xs text-[var(--muted-foreground)] gap-1 px-2"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Dashboard
              </button>
              {isMobile && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="rounded p-1 hover:bg-[var(--surface-2)] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Course title */}
            <div className="p-4 border-b border-[var(--border)]">
              <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-1">
                Course
              </p>
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                {courseName || "Study Plan"}
              </h2>
            </div>

            {/* Modules and lessons navigation */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-6">
              {studyPlan.modules?.map((module, moduleIdx) => (
                <div key={moduleIdx}>
                  <div className="mb-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] text-xs font-semibold">
                        {moduleIdx + 1}
                      </div>
                      <h3 className="text-xs uppercase tracking-[0.15em] font-semibold text-[var(--primary)] opacity-80">
                        {module.title}
                      </h3>
                    </div>
                  </div>
                  
                  {/* Lessons */}
                  <div className="space-y-1">
                    {module.lessons?.map((lesson, lessonIdx) => (
                      <div key={lesson.id || lessonIdx}>
                        {/* Lesson button */}
                        <button
                          type="button"
                          onClick={() => handleLessonClick(lesson)}
                          disabled={lesson.is_locked}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between group ${
                            lesson.is_locked
                              ? "opacity-50 cursor-not-allowed"
                              : expandedLessons.has(lesson.id) || selectedLesson?.id === lesson.id
                              ? "border-b-2 border-[var(--primary)] cursor-pointer"
                              : "hover:bg-[var(--surface-2)] cursor-pointer"
                          }`}
                        >
                          <span className="flex-1 truncate">{lesson.title}</span>
                          {lesson.is_locked ? (
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          ) : (
                            <svg 
                              className={`w-3 h-3 flex-shrink-0 transition-transform ${
                                expandedLessons.has(lesson.id) ? "rotate-90" : ""
                              }`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </button>

                        {/* Content types dropdown with Framer Motion animation */}
                        <AnimatePresence mode="wait">
                          {expandedLessons.has(lesson.id) && !lesson.is_locked && (
                            <motion.div
                              key={`dropdown-${lesson.id}`}
                              initial={{ 
                                opacity: 0,
                                height: 0,
                                scaleY: 0.8,
                                originY: 0
                              }}
                              animate={{ 
                                opacity: 1,
                                height: "auto",
                                scaleY: 1,
                                transition: {
                                  height: {
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 25,
                                    mass: 0.8
                                  },
                                  opacity: {
                                    duration: 0.2,
                                    ease: "easeOut"
                                  },
                                  scaleY: {
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 28
                                  }
                                }
                              }}
                              exit={{ 
                                opacity: 0,
                                height: 0,
                                scaleY: 0.8,
                                transition: {
                                  height: {
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 30
                                  },
                                  opacity: {
                                    duration: 0.15,
                                    ease: "easeIn"
                                  },
                                  scaleY: {
                                    duration: 0.2,
                                    ease: "easeIn"
                                  }
                                }
                              }}
                              className="ml-4 mt-1 mb-2 overflow-hidden border-l-2 border-[var(--border)] pl-2"
                            >
                              <motion.div 
                                className="space-y-0.5"
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                variants={{
                                  visible: {
                                    transition: {
                                      staggerChildren: 0.06,
                                      delayChildren: 0.08
                                    }
                                  },
                                  hidden: {
                                    transition: {
                                      staggerChildren: 0.03,
                                      staggerDirection: -1
                                    }
                                  }
                                }}
                              >
                                {getAvailableContentTypes(lesson.id).map((contentType, index) => (
                                  <motion.button
                                    key={contentType.value}
                                    type="button"
                                    onClick={() => handleContentTypeClick(lesson, contentType.value)}
                                    variants={{
                                      hidden: { 
                                        opacity: 0,
                                        x: -12,
                                        scale: 0.92
                                      },
                                      visible: { 
                                        opacity: 1,
                                        x: 0,
                                        scale: 1,
                                        transition: {
                                          type: "spring",
                                          stiffness: 350,
                                          damping: 25,
                                          mass: 0.6
                                        }
                                      }
                                    }}
                                    whileHover={{ 
                                      x: 4,
                                      scale: 1.02,
                                      transition: {
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 20
                                      }
                                    }}
                                    whileTap={{ 
                                      scale: 0.96,
                                      transition: {
                                        type: "spring",
                                        stiffness: 500,
                                        damping: 25
                                      }
                                    }}
                                    className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                                      selectedContentType?.lessonId === lesson.id && 
                                      selectedContentType?.type === contentType.value
                                        ? "bg-[var(--primary)] text-[var(--primary-contrast)]"
                                        : "hover:bg-[var(--surface-2)] text-[var(--muted-foreground)]"
                                    }`}
                                  >
                                    {contentType.label}
                                  </motion.button>
                                ))}
                              </motion.div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            {/* Resize handle (desktop only) */}
            {!isMobile && (
              <div
                className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-[var(--primary)]/40 active:bg-[var(--primary)]/60 transition-colors"
                onMouseDown={() => setIsResizingSidebar(true)}
              />
            )}
          </aside>
        </>
      )}

      <main
        className="flex-1 overflow-y-auto transition-all duration-200"
        style={{ 
          marginLeft: !isMobile && sidebarOpen && !loading && !error && studyPlan ? `${sidebarWidth}px` : 0,
          marginRight: isMobile ? 0 : `${chatBotWidth}px` 
        }}
      >
        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-20 pt-8 sm:px-6 lg:px-8">
          
          {/* Sidebar toggle button */}
          {!loading && !error && studyPlan && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSidebar}
                className="btn btn-ghost btn-sm text-sm text-[var(--muted-foreground)] gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                {sidebarOpen ? "Hide" : "Show"} Sidebar
              </button>
            </div>
          )}
          {/* Loading State */}
          {loading && (
            <div className="card rounded-[28px] px-8 py-10 text-center text-sm text-[var(--muted-foreground)]">
              Loading your study plan…
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="card rounded-[28px] border border-red-500/30 bg-red-500/10 px-6 py-6 text-sm text-red-200">
              {error}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && !studyPlan && (
            <div className="card rounded-[28px] px-8 py-10 text-center text-sm text-[var(--muted-foreground)]">
              Study plan is not available yet. Please try refreshing in a moment.
            </div>
          )}

          {/* Syllabus View (Main Content Area A) */}
          {!loading && !error && studyPlan && viewMode === "syllabus" && (
            <>
              {/* Course Statistics Overview */}
              {studyPlan.modules && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold">Course Overview</h2>
                  
                  {/* Main Statistics Grid */}
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
                    {/* Total Lessons */}
                    <div className="card rounded-2xl px-4 py-6 text-center">
                      <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] mb-2">
                        Total Lessons
                      </p>
                      <p className="text-3xl font-bold text-[var(--foreground)]">
                        {studyPlan.modules.flatMap(m => m.lessons || []).length}
                      </p>
                    </div>

                    {/* Total Time */}
                    <div className="card rounded-2xl px-4 py-6 text-center">
                      <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] mb-2">
                        Total Time
                      </p>
                      <p className="text-3xl font-bold text-[var(--foreground)]">
                        {studyPlan.total_minutes ? Math.round(studyPlan.total_minutes / 60) : 0}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        hours
                      </p>
                    </div>

                    {/* Modules */}
                    <div className="card rounded-2xl px-4 py-6 text-center">
                      <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] mb-2">
                        Modules
                      </p>
                      <p className="text-3xl font-bold text-[var(--foreground)]">
                        {studyPlan.modules.length}
                      </p>
                    </div>
                  </div>

                  {/* Study Time Breakdown by Content Type */}
                  <h3 className="mb-3 text-base font-semibold">Time by Content Type</h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {(() => {
                      const allLessons = studyPlan.modules.flatMap(m => m.lessons || []);
                      const timeByType = allLessons.reduce((acc, lesson) => {
                        const type = lesson.type || 'other';
                        acc[type] = (acc[type] || 0) + (lesson.duration || 0);
                        return acc;
                      }, {});
                      
                      return Object.entries(timeByType).map(([type, minutes]) => (
                        <div key={type} className="card rounded-2xl px-4 py-6 text-center">
                          <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] mb-2">
                            {prettyFormat(type)}
                          </p>
                          <p className="text-3xl font-bold text-[var(--foreground)]">
                            {minutes}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)] mt-1">
                            minutes
                          </p>
                        </div>
                      ));
                    })()}
                  </div>
                </section>
              )}
            </>
          )}

          {/* Topic View (Main Content Area B) */}
          {!loading && !error && studyPlan && viewMode === "topic" && selectedLesson && selectedContentType && (
            <>
              {/* Content Stream */}
              <section className="space-y-6">
                {/* Use the extracted ItemContent component and pass necessary props */}
                <ItemContent 
                  fmt={selectedContentType.type} 
                  id={selectedLesson.id}
                  userId={userId}
                  courseId={courseId}
                  contentCache={contentCache}
                  setContentCache={setContentCache}
                  handleCardChange={handleCardChange}
                  setCurrentViewingItem={setCurrentViewingItem}
                  onQuizQuestionChange={setChatQuizContext}
                  handleQuizCompleted={refetchStudyPlan}
                />
              </section>
            </>
          )}
        </div>
      </main>

      <ChatBot 
        pageContext={{
          courseId,
          courseName,
          studyPlan,
          selectedLesson,
          currentViewingItem,
          currentContent: selectedContentType && selectedLesson ? (() => {
            // Get the cached content for the currently selected lesson and content type
            const normFmt = normalizeFormat(selectedContentType.type);
            const key = `${normFmt}:${selectedLesson.id}:${userId || ''}:${courseId || ''}`;
            const cached = contentCache[key];
            
            if (cached?.status === "loaded" && cached?.data?.data) {
              const data = cached.data.data;
              const content = { contentType: selectedContentType.type };
              
              // Extract relevant content based on type
              if (data.body || data.reading) {
                content.reading = data.body || data.reading;
              }
              if (data.videos && data.videos.length > 0) {
                content.videos = data.videos;
              }
              if (data.cards && data.cards.length > 0) {
                content.flashcards = data.cards;
              }
              if (data.questions || data.mcq || data.frq) {
                const mergedQuestions = [];

                if (Array.isArray(data.questions)) {
                  mergedQuestions.push(...data.questions.map((q) => ({ ...q })));
                } else if (data.questions) {
                  mergedQuestions.push({ ...data.questions });
                }

                if (Array.isArray(data.mcq)) {
                  mergedQuestions.push(
                    ...data.mcq.map((q) => ({ ...q, type: q?.type || "mcq" }))
                  );
                }

                if (Array.isArray(data.frq)) {
                  mergedQuestions.push(
                    ...data.frq.map((q) => ({ ...q, type: q?.type || "frq" }))
                  );
                }

                if (mergedQuestions.length > 0) {
                  content.questions = mergedQuestions;
                }
              }
              
              return content;
            }
            return null;
          })() : null,
          quizContext: chatQuizContext
        }}
        onWidthChange={setChatBotWidth}
      />
    </div>
  );
}