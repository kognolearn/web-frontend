"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase/client";
import ChatBot from "@/components/chat/ChatBot";
import FlashcardDeck from "@/components/content/FlashcardDeck";
import Quiz from "@/components/content/Quiz";
import ReadingRenderer from "@/components/content/ReadingRenderer";
import CourseSettingsModal from "@/components/courses/CourseSettingsModal";
import EditCourseModal from "@/components/courses/EditCourseModal";

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

  // Ensure effect hooks are defined before any early return so hook order remains stable
  // Clear quiz context if this content is not a quiz
  useEffect(() => {
    if (!onQuizQuestionChange) return;
    if (normalizeFormat(cachedEnvelope.format || fmt) !== "mini_quiz" && normalizeFormat(cachedEnvelope.format || fmt) !== "practice_exam") {
      onQuizQuestionChange(null);
    }
  }, [cachedEnvelope.format, onQuizQuestionChange, fmt]);

  // Ensure we set the first video as the current viewing item when this
  // content resolves to a video type. This effect must run at top-level
  // so hooks order remains stable across renders.
  useEffect(() => {
    const resolvedFormat = normalizeFormat(cachedEnvelope.format || fmt) || normFmt;
    if (resolvedFormat !== 'video') return;
    const videos = cachedPayload?.videos;
    if (videos?.[0]) {
      setCurrentViewingItem({
        type: 'video',
        index: 0,
        title: videos[0].title,
        duration_min: videos[0].duration_min,
        summary: videos[0].summary,
        total: videos.length
      });
    }
  }, [cachedEnvelope.format, cachedPayload?.videos, fmt, normFmt, setCurrentViewingItem]);

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

  // (Effects moved earlier) Clear quiz and video effects are declared above to
  // keep hook order stable across renders.

  switch (resolvedFormat) {
    case "video": {
      
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
        <article className="rounded-[28px] bg-[var(--surface-1)] border border-[var(--border)] shadow-sm overflow-hidden">
          {/* Reading header */}
          <div className="px-6 py-4 sm:px-8 border-b border-[var(--border)] bg-[var(--surface-2)]/30">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--primary)]/10">
                <svg className="w-4 h-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-[var(--foreground)]">Reading</span>
            </div>
          </div>
          {/* Reading content */}
          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <ReadingRenderer content={latexContent} />
          </div>
        </article>
      );
    }
    case "flashcards": {
      return <FlashcardDeck data={flashcardData} onCardChange={handleCardChange} />;
    }
    case "mini_quiz":
    case "practice_exam": {
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
  const [collapsedModules, setCollapsedModules] = useState(new Set()); // Track collapsed modules
  const [selectedContentType, setSelectedContentType] = useState(null); // { lessonId, type }
  const [currentViewingItem, setCurrentViewingItem] = useState(null); // Current flashcard or video being viewed
  const [secondsRemaining, setSecondsRemaining] = useState(null); // Countdown timer
  const [initialSeconds, setInitialSeconds] = useState(null); // Initial time value for tracking changes
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false); // Settings modal state
  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = useState(false); // Edit course modal state

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

  // Countdown timer effect
  useEffect(() => {
    if (secondsRemaining === null || secondsRemaining <= 0) return;

    const intervalId = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev === null || prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [secondsRemaining]);

  // Use ref to track current secondsRemaining for beforeunload without re-running effect
  const secondsRemainingRef = useRef(secondsRemaining);
  useEffect(() => {
    secondsRemainingRef.current = secondsRemaining;
  }, [secondsRemaining]);

  // Send PATCH request on page unload and every 5 minutes
  useEffect(() => {
    if (!userId || !courseId || initialSeconds === null) return;

    const saveProgress = async () => {
      if (secondsRemainingRef.current === null) return;
      
      try {
        await fetch(`/api/courses/${courseId}/settings`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            seconds_to_complete: secondsRemainingRef.current
          })
        });
      } catch (e) {
        console.error('Failed to save timer progress:', e);
      }
    };

    const handleBeforeUnload = () => {
      if (secondsRemainingRef.current === null) return;
      
      // Use sendBeacon for reliable delivery during page unload
      const payload = {
        userId,
        seconds_to_complete: secondsRemainingRef.current
      };
      
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(`/api/courses/${courseId}/settings`, blob);
    };

    // Save every 5 minutes
    const intervalId = setInterval(saveProgress, 5 * 60 * 1000);

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Send on component unmount (navigation away)
      handleBeforeUnload();
    };
  }, [userId, courseId, initialSeconds]);

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
        // Fetch course metadata first to get the course name and seconds_to_complete
        // Use same pattern as dashboard - fetch all courses and find the one we need
        const courseMetaUrl = `/api/courses?userId=${encodeURIComponent(userId)}`;
        const courseMetaRes = await fetch(courseMetaUrl);
        if (courseMetaRes.ok) {
          const body = await courseMetaRes.json();
          const courses = Array.isArray(body?.courses) ? body.courses : [];
          const courseMeta = courses.find(c => c.id === courseId);
          
          if (!aborted && courseMeta) {
            const title = courseMeta.title || courseMeta.course_title || courseMeta.name || courseMeta.courseName;
            if (title) setCourseName(title);
            
            if (typeof courseMeta.seconds_to_complete === 'number') {
              setSecondsRemaining(courseMeta.seconds_to_complete);
              setInitialSeconds(courseMeta.seconds_to_complete);
            }
          }
        }
        
        // Fetch study plan
        const url = `/api/courses/${encodeURIComponent(courseId)}/plan?userId=${encodeURIComponent(userId)}`;
        const res = await fetch(url);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Request failed: ${res.status}`);
        }
        const json = await res.json();
        if (aborted) return;
        // Ensure everything is unlocked regardless of backend data
        const unlockStudyPlan = (p) => {
          if (!p) return p;
          const modules = (p.modules || []).map((m) => ({
            ...m,
            lessons: (m.lessons || []).map((lesson) => ({ ...lesson, is_locked: false })),
          }));
          return { ...p, modules };
        };

        const unlocked = unlockStudyPlan(json);
        setStudyPlan(unlocked);
        
        // Auto-select first lesson if available
        if (unlocked?.modules?.[0]?.lessons?.[0]) {
          setSelectedLesson(unlocked.modules[0].lessons[0]);
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
      const url = `/api/courses/${encodeURIComponent(courseId)}/plan?userId=${encodeURIComponent(userId)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }
      const json = await res.json();
      const unlockStudyPlan = (p) => {
        if (!p) return p;
        const modules = (p.modules || []).map((m) => ({
          ...m,
          lessons: (m.lessons || []).map((lesson) => ({ ...lesson, is_locked: false })),
        }));
        return { ...p, modules };
      };
      setStudyPlan(unlockStudyPlan(json));
    } catch (e) {
      console.error('Failed to refetch study plan:', e);
    }
  }, [userId, courseId]);



  const handleTimerUpdate = useCallback(async (newSeconds) => {
    if (!userId || !courseId) return;
    
    setSecondsRemaining(newSeconds);
    
    try {
      await fetch(`/api/courses/${courseId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          seconds_to_complete: newSeconds
        })
      });
    } catch (e) {
      console.error('Failed to update timer:', e);
    }
  }, [userId, courseId]);

  const handleLessonClick = (lesson) => {
    // Toggle expanded state
    const newExpanded = new Set(expandedLessons);
    if (newExpanded.has(lesson.id)) {
      newExpanded.delete(lesson.id);
    } else {
      newExpanded.add(lesson.id);
      // Fetch content to determine available content types when expanded
      fetchLessonContent(lesson.id);
    }
    setExpandedLessons(newExpanded);
  };

  const fetchLessonContent = (lessonId, formats = ['reading']) => {
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
    // Fetch content for the selected content type if not already cached
    fetchLessonContent(lesson.id, [contentType]);
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

  const canRenderSidebar = !loading && !error && Boolean(studyPlan);
  const renderedSidebarWidth = isMobile ? 280 : sidebarWidth;
  const sidebarOffset = canRenderSidebar && sidebarOpen ? renderedSidebarWidth : 0;

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

  // Check if content for a lesson is currently loading
  const isLessonContentLoading = (lessonId) => {
    const cacheKeys = Object.keys(contentCache);
    const lessonCacheKey = cacheKeys.find(key => key.includes(`:${lessonId}:`));
    if (lessonCacheKey) {
      const cached = contentCache[lessonCacheKey];
      return cached?.status === "loading";
    }
    return false;
  };

  // Check if content for a lesson has been loaded
  const isLessonContentLoaded = (lessonId) => {
    const cacheKeys = Object.keys(contentCache);
    const lessonCacheKey = cacheKeys.find(key => key.includes(`:${lessonId}:`));
    if (lessonCacheKey) {
      const cached = contentCache[lessonCacheKey];
      return cached?.status === "loaded";
    }
    return false;
  };

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
      {/* Enhanced animated background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        {/* Primary gradient orbs - static, no animation */}
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 blur-3xl" />
        <div className="absolute top-1/3 -left-40 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-[var(--primary)]/15 to-transparent blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 h-[450px] w-[450px] rounded-full bg-gradient-to-t from-[var(--primary)]/10 to-transparent blur-3xl" />
        <div className="absolute top-1/2 right-1/3 h-[300px] w-[300px] rounded-full bg-gradient-to-bl from-[var(--info)]/10 to-transparent blur-3xl" />
        
        {/* Mesh gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--background)]/50 to-[var(--background)]" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary-rgb),0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary-rgb),0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      {canRenderSidebar && (
        <motion.button
          type="button"
          onClick={toggleSidebar}
          className="fixed left-0 top-4 z-50 flex cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-1)]/90 px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] shadow-lg backdrop-blur transition-colors"
          animate={{ x: sidebarOffset + 16 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          initial={false}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          {sidebarOpen ? "Hide" : "Show"} Sidebar
        </motion.button>
      )}

      {/* Countdown Timer */}
      {secondsRemaining !== null && (
        <div 
          className="fixed top-4 z-50 flex items-center gap-2"
          style={{ right: isMobile ? '16px' : `${chatBotWidth + 16}px` }}
        >
          {/* Timer Display */}
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 dark:border-white/5 bg-[var(--surface-1)]/90 px-3 py-2 shadow-xl backdrop-blur-xl group">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-[var(--primary)]/30 to-[var(--primary)]/10">
              <svg className="w-3.5 h-3.5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex items-baseline gap-0.5">
              {(() => {
                const h = Math.floor(secondsRemaining / 3600);
                const m = Math.floor((secondsRemaining % 3600) / 60);
                return (
                  <>
                    <span className="text-lg font-bold tabular-nums text-[var(--foreground)]">{String(h).padStart(2, '0')}</span>
                    <span className="text-[10px] text-[var(--muted-foreground)] mr-0.5">h</span>
                    <span className="text-lg font-bold tabular-nums text-[var(--foreground)]">{String(m).padStart(2, '0')}</span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">m</span>
                  </>
                );
              })()}
            </div>
          </div>
          
          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-2xl border border-white/10 dark:border-white/5 bg-[var(--surface-1)]/90 shadow-xl backdrop-blur-xl transition-all hover:bg-white/10 hover:border-[var(--primary)]/50"
            title="Course Settings"
          >
            <svg className="w-4 h-4 text-[var(--foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      )}

      {/* Sidebar */}
      {canRenderSidebar && (
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
            className={`fixed left-0 top-0 h-screen backdrop-blur-xl bg-[var(--surface-1)]/80 border-r border-white/10 dark:border-white/5 shadow-2xl transition-transform duration-200 z-40 flex flex-col ${
              isMobile
                ? sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                : sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{ width: isMobile ? '280px' : `${sidebarWidth}px` }}
          >
            {/* Sidebar header */}
            <div className="p-4 border-b border-white/10 dark:border-white/5 flex items-center justify-between backdrop-blur-sm">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="btn btn-ghost btn-sm text-xs text-[var(--muted-foreground)] gap-1 px-2 hover:text-[var(--primary)] transition-colors"
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
            <div className="p-4 border-b border-white/10 dark:border-white/5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-1">
                    Course
                  </p>
                  <h2 className="text-sm font-semibold text-[var(--foreground)] bg-gradient-to-r from-[var(--foreground)] to-[var(--primary)] bg-clip-text">
                    {courseName || "Study Plan"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditCourseModalOpen(true)}
                  className="flex-shrink-0 p-2 rounded-lg hover:bg-white/10 transition-colors group"
                  title="Edit Course"
                >
                  <svg className="w-4.5 h-4.5 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modules and lessons navigation */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {studyPlan.modules?.map((module, moduleIdx) => {
                const isCollapsed = collapsedModules.has(moduleIdx);
                return (
                  <div key={moduleIdx} className="backdrop-blur-sm rounded-xl bg-white/5 dark:bg-black/10 border border-white/10 dark:border-white/5">
                    {/* Module header - clickable to collapse/expand */}
                    <button
                      type="button"
                      onClick={() => {
                        const newCollapsed = new Set(collapsedModules);
                        if (isCollapsed) {
                          newCollapsed.delete(moduleIdx);
                        } else {
                          newCollapsed.add(moduleIdx);
                        }
                        setCollapsedModules(newCollapsed);
                      }}
                      className="w-full p-3 flex items-center justify-between hover:bg-white/5 dark:hover:bg-white/5 rounded-t-xl transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/70 text-white text-xs font-bold shadow-lg shadow-[var(--primary)]/20">
                          {moduleIdx + 1}
                        </div>
                        <h3 className="text-xs uppercase tracking-[0.15em] font-semibold text-[var(--primary)] text-left">
                          {module.title}
                        </h3>
                      </div>
                      <svg 
                        className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Lessons - shown when module is not collapsed */}
                    {!isCollapsed && (
                      <div className="px-3 pb-3 space-y-1">
                        {module.lessons?.map((lesson, lessonIdx) => (
                          <button
                            key={lesson.id || lessonIdx}
                            type="button"
                            onClick={() => {
                              setSelectedLesson(lesson);
                              // Auto-select first available content type
                              const availableTypes = getAvailableContentTypes(lesson.id);
                              if (availableTypes.length > 0) {
                                setSelectedContentType({ lessonId: lesson.id, type: availableTypes[0].value });
                              }
                              setViewMode("topic");
                              setCurrentViewingItem(null);
                              fetchLessonContent(lesson.id, ['reading']);
                            }}
                            className={`w-full text-left px-3 py-2.5 text-sm transition-all duration-200 flex items-center gap-2 rounded-lg ${
                              selectedLesson?.id === lesson.id
                                ? "bg-[var(--primary)]/15 text-[var(--primary)] font-medium shadow-sm"
                                : "hover:bg-white/10 dark:hover:bg-white/5 text-[var(--foreground)]"
                            }`}
                          >
                            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[var(--surface-2)] text-[10px] font-medium text-[var(--muted-foreground)]">
                              {lessonIdx + 1}
                            </span>
                            <span className="flex-1 truncate">{lesson.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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
          marginLeft: !isMobile ? `${sidebarOffset}px` : 0,
          marginRight: isMobile ? 0 : `${chatBotWidth}px` 
        }}
      >
        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-20 pt-8 sm:px-6 lg:px-8 z-10">
          {/* Loading State */}
          {loading && (
            <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-3xl px-8 py-16 text-center shadow-2xl">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-[var(--primary)]/30 border-t-[var(--primary)] animate-spin" />
              <p className="text-sm text-[var(--muted-foreground)]">Loading your study plan…</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="backdrop-blur-xl bg-red-500/10 border border-red-500/30 rounded-3xl px-6 py-8 text-center shadow-2xl">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && !studyPlan && (
            <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-3xl px-8 py-16 text-center shadow-2xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">Study plan is not available yet.</p>
              <p className="text-xs text-[var(--muted-foreground)]/70 mt-1">Please try refreshing in a moment.</p>
            </div>
          )}

          {/* Syllabus View (Main Content Area A) */}
          {!loading && !error && studyPlan && viewMode === "syllabus" && (
            <>
              {/* Course Statistics Overview */}
              {studyPlan.modules && (
                <section>
                  <h2 className="mb-6 text-xl font-bold bg-gradient-to-r from-[var(--foreground)] to-[var(--primary)] bg-clip-text text-transparent">Course Overview</h2>
                  
                  {/* Main Statistics Grid */}
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
                    {/* Total Lessons */}
                    <div className="group backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl px-4 py-6 text-center shadow-xl hover:shadow-2xl hover:border-[var(--primary)]/30 transition-all duration-300 hover:-translate-y-1">
                      <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[var(--primary)]/30 to-[var(--primary)]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] mb-2">
                        Total Lessons
                      </p>
                      <p className="text-3xl font-bold text-[var(--foreground)]">
                        {studyPlan.modules.flatMap(m => m.lessons || []).length}
                      </p>
                    </div>

                    {/* Total Time */}
                    <div className="group backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl px-4 py-6 text-center shadow-xl hover:shadow-2xl hover:border-[var(--primary)]/30 transition-all duration-300 hover:-translate-y-1">
                      <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[var(--info)]/30 to-[var(--info)]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5 text-[var(--info)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
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
                    <div className="group backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl px-4 py-6 text-center shadow-xl hover:shadow-2xl hover:border-[var(--primary)]/30 transition-all duration-300 hover:-translate-y-1">
                      <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[var(--success)]/30 to-[var(--success)]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] mb-2">
                        Modules
                      </p>
                      <p className="text-3xl font-bold text-[var(--foreground)]">
                        {studyPlan.modules.length}
                      </p>
                    </div>
                  </div>

                  {/* Study Time Breakdown by Content Type */}
                  <h3 className="mb-4 text-base font-semibold text-[var(--foreground)]">Time by Content Type</h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {(() => {
                      const allLessons = studyPlan.modules.flatMap(m => m.lessons || []);
                      const timeByType = allLessons.reduce((acc, lesson) => {
                        const type = lesson.type || 'other';
                        acc[type] = (acc[type] || 0) + (lesson.duration || 0);
                        return acc;
                      }, {});
                      
                      const colors = ['from-purple-500/30 to-purple-500/10', 'from-blue-500/30 to-blue-500/10', 'from-emerald-500/30 to-emerald-500/10', 'from-amber-500/30 to-amber-500/10'];
                      const textColors = ['text-purple-400', 'text-blue-400', 'text-emerald-400', 'text-amber-400'];
                      
                      return Object.entries(timeByType).map(([type, minutes], idx) => (
                        <div key={type} className="group backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl px-4 py-6 text-center shadow-xl hover:shadow-2xl hover:border-[var(--primary)]/30 transition-all duration-300 hover:-translate-y-1">
                          <div className={`w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br ${colors[idx % colors.length]} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <svg className={`w-5 h-5 ${textColors[idx % textColors.length]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
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
              <section className="space-y-6 pb-24">
                {isLessonContentLoading(selectedLesson.id) ? (
                  /* Loading Skeleton for Content */
                  <div className="animate-pulse space-y-6">
                    {/* Content type title skeleton */}
                    <div className="h-8 w-48 bg-white/10 rounded-lg" />
                    
                    {/* Main content area skeleton */}
                    <div className="rounded-2xl border border-white/10 dark:border-white/5 bg-[var(--surface-2)]/50 p-6 space-y-4">
                      <div className="h-6 w-3/4 bg-white/10 rounded" />
                      <div className="h-4 w-full bg-white/10 rounded" />
                      <div className="h-4 w-5/6 bg-white/10 rounded" />
                      <div className="h-4 w-4/5 bg-white/10 rounded" />
                      <div className="h-32 w-full bg-white/10 rounded-lg mt-4" />
                      <div className="h-4 w-2/3 bg-white/10 rounded" />
                      <div className="h-4 w-3/4 bg-white/10 rounded" />
                    </div>
                    
                    {/* Secondary content block skeleton */}
                    <div className="rounded-2xl border border-white/10 dark:border-white/5 bg-[var(--surface-2)]/50 p-6 space-y-4">
                      <div className="h-5 w-1/2 bg-white/10 rounded" />
                      <div className="h-4 w-full bg-white/10 rounded" />
                      <div className="h-4 w-4/5 bg-white/10 rounded" />
                    </div>
                  </div>
                ) : (
                  /* Use the extracted ItemContent component and pass necessary props */
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
                )}
              </section>
            </>
          )}
        </div>

        {/* Bottom Navigation Bar for Content Types */}
        {viewMode === "topic" && selectedLesson && (
          <div 
            className="fixed bottom-0 left-0 right-0 z-30 backdrop-blur-xl bg-[var(--surface-1)]/90 border-t border-white/10 dark:border-white/5 shadow-2xl"
            style={{ 
              marginLeft: !isMobile ? `${sidebarOffset}px` : 0,
              marginRight: isMobile ? 0 : `${chatBotWidth}px` 
            }}
          >
            <div className="max-w-5xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={() => {
                    const types = getAvailableContentTypes(selectedLesson.id);
                    const currentIdx = types.findIndex(t => t.value === selectedContentType?.type);
                    if (currentIdx > 0) {
                      const prevType = types[currentIdx - 1];
                      setSelectedContentType({ lessonId: selectedLesson.id, type: prevType.value });
                      fetchLessonContent(selectedLesson.id, [prevType.value]);
                    }
                  }}
                  disabled={isLessonContentLoading(selectedLesson.id) || (() => {
                    const types = getAvailableContentTypes(selectedLesson.id);
                    const currentIdx = types.findIndex(t => t.value === selectedContentType?.type);
                    return currentIdx <= 0;
                  })()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 dark:bg-white/5 border border-white/10 text-sm font-medium transition-all hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Previous</span>
                </button>

                {/* Content Type Tabs - Show skeleton while loading */}
                <div className="flex-1 flex items-center justify-center gap-1 overflow-x-auto custom-scrollbar">
                  {isLessonContentLoading(selectedLesson.id) && !isLessonContentLoaded(selectedLesson.id) ? (
                    // Loading skeleton for content type tabs
                    <>
                      <div className="h-9 w-20 rounded-lg bg-white/10 animate-pulse" />
                      <div className="h-9 w-24 rounded-lg bg-white/10 animate-pulse" />
                      <div className="h-9 w-16 rounded-lg bg-white/10 animate-pulse" />
                    </>
                  ) : (
                    getAvailableContentTypes(selectedLesson.id).map((contentType) => (
                      <button
                        key={contentType.value}
                        type="button"
                        onClick={() => {
                          setSelectedContentType({ lessonId: selectedLesson.id, type: contentType.value });
                          fetchLessonContent(selectedLesson.id, [contentType.value]);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                          selectedContentType?.type === contentType.value
                            ? "bg-[var(--primary)] text-[var(--primary-contrast)] shadow-lg shadow-[var(--primary)]/20"
                            : "bg-white/10 dark:bg-white/5 border border-white/10 hover:bg-white/20"
                        }`}
                      >
                        {contentType.label}
                      </button>
                    ))
                  )}
                </div>

                {/* Next Button */}
                <button
                  type="button"
                  onClick={() => {
                    const types = getAvailableContentTypes(selectedLesson.id);
                    const currentIdx = types.findIndex(t => t.value === selectedContentType?.type);
                    if (currentIdx < types.length - 1) {
                      const nextType = types[currentIdx + 1];
                      setSelectedContentType({ lessonId: selectedLesson.id, type: nextType.value });
                      fetchLessonContent(selectedLesson.id, [nextType.value]);
                    }
                  }}
                  disabled={isLessonContentLoading(selectedLesson.id) || (() => {
                    const types = getAvailableContentTypes(selectedLesson.id);
                    const currentIdx = types.findIndex(t => t.value === selectedContentType?.type);
                    return currentIdx >= types.length - 1;
                  })()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 dark:bg-white/5 border border-white/10 text-sm font-medium transition-all hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="hidden sm:inline">Next</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
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

      {/* Course Settings Modal */}
      <CourseSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentSeconds={secondsRemaining}
        onTimerUpdate={handleTimerUpdate}
        courseName={courseName}
      />

      {/* Edit Course Modal */}
      <EditCourseModal
        isOpen={isEditCourseModalOpen}
        onClose={() => setIsEditCourseModalOpen(false)}
        courseId={courseId}
        userId={userId}
        courseName={courseName}
      />
    </div>
  );
}