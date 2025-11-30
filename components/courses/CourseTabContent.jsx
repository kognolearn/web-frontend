"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ChatBot from "@/components/chat/ChatBot";
import FlashcardDeck from "@/components/content/FlashcardDeck";
import Quiz from "@/components/content/Quiz";
import ReadingRenderer from "@/components/content/ReadingRenderer";
import OnboardingTooltip, { FloatingOnboardingTooltip } from "@/components/ui/OnboardingTooltip";

// Utility functions
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

// ItemContent component
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
  useEffect(() => {
    if (!onQuizQuestionChange) return;
    if (normalizeFormat(cachedEnvelope.format || fmt) !== "mini_quiz" && normalizeFormat(cachedEnvelope.format || fmt) !== "practice_exam") {
      onQuizQuestionChange(null);
    }
  }, [cachedEnvelope.format, onQuizQuestionChange, fmt]);

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

export default function CourseTabContent({
  courseId,
  userId,
  courseName,
  studyPlan,
  loading,
  error,
  refetchStudyPlan,
  secondsRemaining,
  handleTimerUpdate,
  isSettingsModalOpen,
  setIsSettingsModalOpen,
  isEditCourseModalOpen,
  setIsEditCourseModalOpen,
  onOpenChatTab,
  onClose,
  onChatTabReturn,
  chatOpenRequest,
  isActive = true
}) {
  const router = useRouter();
  const chatBotRef = useRef(null);
  const [selectedLesson, setSelectedLesson] = useState(null);

  // Handle external chat open requests
  useEffect(() => {
    if (chatOpenRequest && chatBotRef.current) {
      chatBotRef.current.open({ mode: 'docked' });
    }
  }, [chatOpenRequest]);

  const [contentCache, setContentCache] = useState({});
  const [chatBotWidth, setChatBotWidth] = useState(0);
  const [chatQuizContext, setChatQuizContext] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState("syllabus");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [expandedLessons, setExpandedLessons] = useState(new Set());
  const [collapsedModules, setCollapsedModules] = useState(new Set());
  const [selectedContentType, setSelectedContentType] = useState(null);
  const [currentViewingItem, setCurrentViewingItem] = useState(null);
  
  // Practice exam state
  const [examState, setExamState] = useState({}); // { [examType]: { status, url, error } }

  // Check if exam already exists (doesn't generate)
  const checkExamExists = useCallback(async (examType) => {
    if (!userId || !courseId) return;
    
    const key = examType;
    
    setExamState(prev => {
      // Skip if already checked or in progress
      if (prev[key]?.status) return prev;
      return { ...prev, [key]: { status: 'checking', url: null, error: null } };
    });
    
    try {
      const fetchRes = await fetch(
        `/api/courses/${courseId}/exams/${examType}?userId=${userId}`
      );
      
      if (fetchRes.ok) {
        const data = await fetchRes.json();
        setExamState(prev => ({ ...prev, [key]: { status: 'ready', url: data.url, error: null } }));
      } else if (fetchRes.status === 404) {
        // Exam doesn't exist yet - show build option
        setExamState(prev => ({ ...prev, [key]: { status: 'not-built', url: null, error: null } }));
      } else {
        const errData = await fetchRes.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to check exam (${fetchRes.status})`);
      }
    } catch (e) {
      setExamState(prev => ({ ...prev, [key]: { status: 'error', url: null, error: e.message } }));
    }
  }, [userId, courseId]);

  // Generate exam (only called when user clicks build)
  const generateExam = useCallback(async (examType, lessonTitles) => {
    if (!userId || !courseId) return;
    
    const key = examType;
    setExamState(prev => ({ ...prev, [key]: { status: 'generating', url: null, error: null } }));
    
    try {
      const generateRes = await fetch(
        `/api/courses/${courseId}/exams/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            lessons: lessonTitles,
            type: examType
          })
        }
      );
      
      if (!generateRes.ok) {
        const errData = await generateRes.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to generate exam (${generateRes.status})`);
      }
      
      const genData = await generateRes.json();
      setExamState(prev => ({ ...prev, [key]: { status: 'ready', url: genData.url, error: null } }));
    } catch (e) {
      setExamState(prev => ({ ...prev, [key]: { status: 'error', url: null, error: e.message } }));
    }
  }, [userId, courseId]);

  // Auto-check exam existence when practice exam is selected
  useEffect(() => {
    if (selectedLesson?.type === 'practice_exam' && userId && courseId) {
      const examType = selectedLesson.title?.toLowerCase().includes('final') ? 'final' : 'midterm';
      checkExamExists(examType);
    }
  }, [selectedLesson, userId, courseId, checkExamExists]);

  // Auto-select first lesson if available and not already selected
  useEffect(() => {
    if (studyPlan && !selectedLesson && viewMode === "syllabus") {
      if (studyPlan?.modules?.[0]?.lessons?.[0]) {
        setSelectedLesson(studyPlan.modules[0].lessons[0]);
      }
    }
  }, [studyPlan, selectedLesson, viewMode]);

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

  const handleLessonClick = (lesson) => {
    const newExpanded = new Set(expandedLessons);
    if (newExpanded.has(lesson.id)) {
      newExpanded.delete(lesson.id);
    } else {
      newExpanded.add(lesson.id);
      fetchLessonContent(lesson.id);
    }
    setExpandedLessons(newExpanded);
  };

  const fetchLessonContent = (lessonId, formats = ['reading']) => {
    formats.forEach(format => {
      const normFmt = normalizeFormat(format);
      const key = `${normFmt}:${lessonId}:${userId || ''}:${courseId || ''}`;
      if (contentCache[key]) return;
      
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
    setCurrentViewingItem(null);
    fetchLessonContent(lesson.id, [contentType]);
  };

  const handleBackToSyllabus = () => {
    setViewMode("syllabus");
    setSelectedLesson(null);
    setSelectedContentType(null);
    setCurrentViewingItem(null);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const canRenderSidebar = !loading && !error && Boolean(studyPlan);
  const renderedSidebarWidth = isMobile ? 280 : sidebarWidth;
  const sidebarOffset = canRenderSidebar && sidebarOpen ? renderedSidebarWidth : 0;

  const handleCardChange = useCallback((cardInfo) => {
    setCurrentViewingItem({
      type: 'flashcard',
      ...cardInfo
    });
  }, []);

  const handleQuizCompleted = useCallback(async () => {
    await refetchStudyPlan();
  }, [refetchStudyPlan]);

  const isLessonContentLoading = (lessonId) => {
    const cacheKeys = Object.keys(contentCache);
    const lessonCacheKey = cacheKeys.find(key => key.includes(`:${lessonId}:`));
    if (lessonCacheKey) {
      const cached = contentCache[lessonCacheKey];
      return cached?.status === "loading";
    }
    return false;
  };

  const isLessonContentLoaded = (lessonId) => {
    const cacheKeys = Object.keys(contentCache);
    const lessonCacheKey = cacheKeys.find(key => key.includes(`:${lessonId}:`));
    if (lessonCacheKey) {
      const cached = contentCache[lessonCacheKey];
      return cached?.status === "loaded";
    }
    return false;
  };

  const getAvailableContentTypes = (lessonId) => {
    const types = [];
    const cacheKeys = Object.keys(contentCache);
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
    if (types.length === 0) {
      types.push({ label: "Reading", value: "reading" });
    }
    return types;
  };

  const handleDragOver = (e) => {
    if (e.dataTransfer.types.includes('application/x-chat-tab-id')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (e) => {
    const tabId = e.dataTransfer.getData('application/x-chat-tab-id');
    if (tabId) {
      e.preventDefault();
      if (chatBotRef.current) {
        // Open as popped chat at drop coordinates
        chatBotRef.current.open({ 
          mode: 'popped',
          x: e.clientX - 300, // Center horizontally relative to cursor (assuming 600px width)
          y: e.clientY - 20 // Offset slightly from top
        });
      }
      if (onChatTabReturn) {
        onChatTabReturn(tabId);
      }
    }
  };

  return (
    <div className="relative w-full h-full flex overflow-hidden">
      {canRenderSidebar && (
        <motion.button
          type="button"
          onClick={toggleSidebar}
          className="absolute left-0 top-4 z-50 flex items-center gap-2 h-10 px-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/90 shadow-lg backdrop-blur-xl transition-colors hover:bg-[var(--surface-2)] hover:border-[var(--primary)]/50 text-[var(--foreground)] text-xs font-medium"
          animate={{ x: sidebarOffset + 16 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          initial={false}
          title={sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          {sidebarOpen ? "Hide" : "Show"} Sidebar
        </motion.button>
      )}

      {/* Top Right Controls: Settings, Timer, Close */}
      <div 
        className="absolute top-4 z-50 flex items-center gap-2"
        style={{ right: isMobile ? '16px' : `${chatBotWidth + 16}px` }}
      >
        {/* Settings Button */}
        <OnboardingTooltip
          id="course-settings-button"
          content="Click here to adjust your study time. You can add or subtract time, or set a custom study duration for this course."
          position="bottom"
          pointerPosition="right"
          delay={800}
          priority={5}
        >
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/90 shadow-lg backdrop-blur-xl transition-all hover:bg-[var(--surface-2)] hover:border-[var(--primary)]/50"
            title="Course Settings"
          >
            <svg className="w-4 h-4 text-[var(--foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </OnboardingTooltip>

        {/* Timer Display */}
        {secondsRemaining !== null && (
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/90 px-3 py-2 shadow-lg backdrop-blur-xl group">
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
        )}

        {/* Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/90 shadow-lg backdrop-blur-xl transition-all hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500"
            title="Close Tab"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Sidebar */}
      {canRenderSidebar && (
        <>
          {isMobile && sidebarOpen && (
            <div
              className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          
          <aside
            className={`absolute left-0 top-0 h-full backdrop-blur-xl bg-[var(--surface-1)]/95 border-r border-[var(--border)] transition-transform duration-200 z-40 flex flex-col ${
              isMobile
                ? sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                : sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{ width: isMobile ? '280px' : `${sidebarWidth}px` }}
          >
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between backdrop-blur-sm">
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

            <div className="p-4 border-b border-[var(--border)]">
              <div className="flex items-center justify-between gap-2">
                <OnboardingTooltip
                  id="course-sidebar-nav"
                  content="This is your course navigation. Click on any lesson to view its content. Modules can be collapsed or expanded by clicking on them."
                  position="right"
                  pointerPosition="top"
                  delay={800}
                  priority={6}
                >
                  <div 
                    onClick={() => setViewMode("syllabus")}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-1">
                      Course
                    </p>
                    <h2 className="text-sm font-semibold text-[var(--foreground)] bg-gradient-to-r from-[var(--foreground)] to-[var(--primary)] bg-clip-text">
                      {courseName || "Study Plan"}
                    </h2>
                  </div>
                </OnboardingTooltip>
                <OnboardingTooltip
                  id="course-edit-button"
                  content="Want to modify your course? Click here to request changes — add topics, adjust difficulty, include more examples, or restructure modules using natural language."
                  position="bottom"
                  pointerPosition="left"
                  delay={800}
                  priority={7}
                >
                  <button
                    type="button"
                    onClick={() => setIsEditCourseModalOpen(true)}
                    className="flex-shrink-0 p-2 rounded-lg hover:bg-[var(--surface-muted)] transition-colors group"
                    title="Edit Course"
                  >
                    <svg className="w-4.5 h-4.5 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </OnboardingTooltip>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {studyPlan.modules?.map((module, moduleIdx) => {
                const isCollapsed = collapsedModules.has(moduleIdx);
                const isPracticeExamModule = module.is_practice_exam_module;
                
                if (isPracticeExamModule && module.exam) {
                  const exam = module.exam;
                  const isSelected = selectedLesson?.id === exam.id;
                  return (
                    <button
                      key={moduleIdx}
                      type="button"
                      onClick={() => {
                        setSelectedLesson({ ...exam, type: 'practice_exam' });
                        setSelectedContentType({ lessonId: exam.id, type: 'practice_exam' });
                        setViewMode("topic");
                        setCurrentViewingItem(null);
                      }}
                      className={`w-full backdrop-blur-sm rounded-xl border transition-all duration-200 p-3 flex items-center gap-3 ${
                        isSelected
                          ? "bg-amber-500/15 border-amber-500/30 shadow-lg shadow-amber-500/10"
                          : "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <h3 className="text-sm font-semibold text-amber-500 truncate">
                          {exam.title}
                        </h3>
                        <p className="text-xs text-amber-500/70">
                          {exam.duration}m • {exam.preceding_lessons?.length || 0} lessons
                        </p>
                      </div>
                      {exam.status === 'completed' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-500 font-medium">
                          Done
                        </span>
                      )}
                    </button>
                  );
                }
                
                return (
                  <div key={moduleIdx} className="backdrop-blur-sm rounded-xl bg-[var(--surface-2)]/50 border border-[var(--border)]">
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
                      className={`w-full p-3 flex items-center justify-between hover:bg-[var(--surface-muted)]/50 transition-colors ${isCollapsed ? 'rounded-xl' : 'rounded-t-xl'}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/80 text-white text-[11px] font-semibold shadow-md shadow-[var(--primary)]/25 tabular-nums">
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
                    
                    {!isCollapsed && (
                      <div className="px-3 pb-3 space-y-1">
                        {module.lessons?.map((lesson, lessonIdx) => {
                          return (
                            <button
                              key={lesson.id || lessonIdx}
                              type="button"
                              onClick={() => {
                                setSelectedLesson(lesson);
                                const availableTypes = getAvailableContentTypes(lesson.id);
                                if (availableTypes.length > 0) {
                                  setSelectedContentType({ lessonId: lesson.id, type: availableTypes[0].value });
                                }
                                fetchLessonContent(lesson.id, ['reading']);
                                setViewMode("topic");
                                setCurrentViewingItem(null);
                              }}
                              className={`w-full text-left px-3 py-2.5 text-sm transition-all duration-200 flex items-center gap-2.5 rounded-lg ${
                                selectedLesson?.id === lesson.id
                                  ? "bg-[var(--primary)]/15 text-[var(--primary)] font-medium shadow-sm"
                                  : "hover:bg-[var(--surface-muted)] text-[var(--foreground)]"
                              }`}
                            >
                              <span className={`min-w-[1.375rem] h-[1.375rem] flex items-center justify-center rounded-md text-[10px] font-semibold tabular-nums transition-colors ${
                                selectedLesson?.id === lesson.id
                                  ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                                  : "bg-[var(--surface-2)] text-[var(--muted-foreground)] border border-[var(--border)]/50"
                              }`}>
                                {lessonIdx + 1}
                              </span>
                              <span className="flex-1 truncate">{lesson.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

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
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-20 pt-20 sm:px-6 lg:px-8 z-10">
          {loading && (
            <div className="backdrop-blur-xl bg-[var(--surface-1)] border border-[var(--border)] rounded-3xl px-8 py-16 text-center shadow-lg">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-[var(--primary)]/30 border-t-[var(--primary)] animate-spin" />
              <p className="text-sm text-[var(--muted-foreground)]">Loading your study plan…</p>
            </div>
          )}

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

          {!loading && !error && !studyPlan && (
            <div className="backdrop-blur-xl bg-[var(--surface-1)] border border-[var(--border)] rounded-3xl px-8 py-16 text-center shadow-lg">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">Study plan is not available yet.</p>
              <p className="text-xs text-[var(--muted-foreground)]/70 mt-1">Please try refreshing in a moment.</p>
            </div>
          )}

          {!loading && !error && studyPlan && viewMode === "syllabus" && (
            <>
              {studyPlan.modules && (
                <section>
                  <h2 className="mb-6 text-xl font-bold bg-gradient-to-r from-[var(--foreground)] to-[var(--primary)] bg-clip-text text-transparent">Course Overview</h2>
                  
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
                    <div className="group relative bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl px-4 py-6 text-center shadow-sm hover:shadow-md hover:border-[var(--primary)]/50 transition-all duration-300 hover:-translate-y-1">
                      <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center group-hover:scale-110 transition-transform">
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

                    <div className="group relative bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl px-4 py-6 text-center shadow-sm hover:shadow-md hover:border-[var(--primary)]/50 transition-all duration-300 hover:-translate-y-1">
                      <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center group-hover:scale-110 transition-transform">
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

                    <div className="group relative bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl px-4 py-6 text-center shadow-sm hover:shadow-md hover:border-[var(--primary)]/50 transition-all duration-300 hover:-translate-y-1">
                      <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center group-hover:scale-110 transition-transform">
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
                        <div 
                          key={type} 
                          className="group relative bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl px-4 py-6 text-center shadow-sm hover:shadow-md hover:border-[var(--primary)]/50 transition-all duration-300 hover:-translate-y-1"
                        >
                          <div className={`w-10 h-10 mx-auto mb-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center group-hover:scale-110 transition-transform`}>
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

          {!loading && !error && studyPlan && viewMode === "topic" && selectedLesson && selectedContentType && (
            <>
              <section className="space-y-6 pb-24">
                {selectedLesson.type === 'practice_exam' ? (
                  <div className="space-y-6">
                    <div className="backdrop-blur-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-6 shadow-xl">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h2 className="text-xl font-bold text-[var(--foreground)] mb-1">{selectedLesson.title}</h2>
                          <p className="text-sm text-[var(--muted-foreground)]">
                            This exam covers {selectedLesson.preceding_lessons?.length || 0} lessons • Estimated time: {selectedLesson.duration} minutes
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="backdrop-blur-xl bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-lg">
                      <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                        <h3 className="text-base font-semibold text-[var(--foreground)] flex items-center gap-2">
                          <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          Lessons Covered in This Exam
                        </h3>
                      </div>
                      <div className="divide-y divide-[var(--border)]">
                        {(() => {
                          const allLessons = studyPlan.modules?.filter(m => !m.is_practice_exam_module).flatMap(m => m.lessons || []) || [];
                          const precedingLessonIds = selectedLesson.preceding_lessons || [];
                          
                          if (precedingLessonIds.length === 0) {
                            return (
                              <div className="px-6 py-8 text-center text-sm text-[var(--muted-foreground)]">
                                No lessons specified for this exam yet.
                              </div>
                            );
                          }
                          
                          return precedingLessonIds.map((lessonId, idx) => {
                            const lesson = allLessons.find(l => l.id === lessonId);
                            return (
                              <div
                                key={lessonId}
                                className="px-6 py-3 flex items-center gap-3 hover:bg-[var(--surface-2)]/50 transition-colors"
                              >
                                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--primary)]/10 text-xs font-medium text-[var(--primary)]">
                                  {idx + 1}
                                </span>
                                <span className="flex-1 text-sm text-[var(--foreground)]">
                                  {lesson?.title || `Lesson ${lessonId.slice(0, 8)}...`}
                                </span>
                                {lesson?.type && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--muted-foreground)] capitalize">
                                    {lesson.type}
                                  </span>
                                )}
                                {lesson?.duration && (
                                  <span className="text-xs text-[var(--muted-foreground)]">
                                    {lesson.duration}m
                                  </span>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Exam Actions */}
                    {(() => {
                      const examType = selectedLesson.title?.toLowerCase().includes('final') ? 'final' : 'midterm';
                      const currentExamState = examState[examType] || {};
                      const allLessons = studyPlan.modules?.filter(m => !m.is_practice_exam_module).flatMap(m => m.lessons || []) || [];
                      const precedingLessonIds = selectedLesson.preceding_lessons || [];
                      const lessonTitles = precedingLessonIds.map(id => allLessons.find(l => l.id === id)?.title).filter(Boolean);
                      
                      return (
                        <div className="backdrop-blur-xl bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 shadow-lg">
                          {/* Error State */}
                          {currentExamState.status === 'error' && (
                            <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                              <p className="font-medium">Failed to load exam</p>
                              <p className="text-xs mt-1 opacity-80">{currentExamState.error}</p>
                            </div>
                          )}
                          
                          {/* Checking State */}
                          {currentExamState.status === 'checking' && (
                            <div className="flex flex-col items-center justify-center py-8">
                              <div className="w-12 h-12 mb-4 rounded-full border-4 border-[var(--primary)]/30 border-t-[var(--primary)] animate-spin" />
                              <p className="text-sm text-[var(--muted-foreground)]">Checking for existing exam...</p>
                            </div>
                          )}
                          
                          {/* Generating State */}
                          {currentExamState.status === 'generating' && (
                            <div className="flex flex-col items-center justify-center py-8">
                              <div className="w-12 h-12 mb-4 rounded-full border-4 border-[var(--primary)]/30 border-t-[var(--primary)] animate-spin" />
                              <p className="text-sm text-[var(--muted-foreground)]">
                                Generating your practice exam... This may take a minute.
                              </p>
                            </div>
                          )}
                          
                          {/* Ready State - Show Download */}
                          {currentExamState.status === 'ready' && currentExamState.url && (
                            <div className="flex flex-col items-center justify-center py-4">
                              <div className="w-16 h-16 mb-4 rounded-xl bg-[var(--success)]/20 flex items-center justify-center">
                                <svg className="w-8 h-8 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <p className="text-sm text-[var(--foreground)] font-medium mb-4">Your practice exam is ready!</p>
                              <a
                                href={currentExamState.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] transition-all flex items-center gap-2"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Download Exam PDF
                              </a>
                            </div>
                          )}
                          
                          {/* Not Built State - Show Build Button */}
                          {currentExamState.status === 'not-built' && (
                            <div className="flex flex-col items-center justify-center py-4">
                              <p className="text-sm text-[var(--muted-foreground)] mb-4 text-center">
                                Create a practice exam covering all the lessons listed above.
                              </p>
                              <button
                                type="button"
                                className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] transition-all flex items-center gap-2"
                                onClick={() => generateExam(examType, lessonTitles)}
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Build Practice Exam
                              </button>
                            </div>
                          )}
                          
                          {/* Retry on Error */}
                          {currentExamState.status === 'error' && (
                            <div className="flex justify-center pt-2">
                              <button
                                type="button"
                                className="px-6 py-2 rounded-lg bg-[var(--surface-2)] text-[var(--foreground)] text-sm font-medium hover:bg-[var(--surface-3)] transition-colors"
                                onClick={() => {
                                  // Reset state and re-check
                                  setExamState(prev => ({ ...prev, [examType]: null }));
                                }}
                              >
                                Try Again
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : isLessonContentLoading(selectedLesson.id) ? (
                  <div className="animate-pulse space-y-6">
                    <div className="h-8 w-48 bg-[var(--surface-muted)] rounded-lg" />
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-6 space-y-4">
                      <div className="h-6 w-3/4 bg-[var(--surface-muted)] rounded" />
                      <div className="h-4 w-full bg-[var(--surface-muted)] rounded" />
                      <div className="h-4 w-5/6 bg-[var(--surface-muted)] rounded" />
                      <div className="h-4 w-4/5 bg-[var(--surface-muted)] rounded" />
                      <div className="h-32 w-full bg-[var(--surface-muted)] rounded-lg mt-4" />
                      <div className="h-4 w-2/3 bg-[var(--surface-muted)] rounded" />
                      <div className="h-4 w-3/4 bg-[var(--surface-muted)] rounded" />
                    </div>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-6 space-y-4">
                      <div className="h-5 w-1/2 bg-[var(--surface-muted)] rounded" />
                      <div className="h-4 w-full bg-[var(--surface-muted)] rounded" />
                      <div className="h-4 w-4/5 bg-[var(--surface-muted)] rounded" />
                    </div>
                  </div>
                ) : (
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

        {viewMode === "topic" && selectedLesson && selectedLesson.type !== 'practice_exam' && (
          <div 
            className="fixed bottom-0 z-30 backdrop-blur-xl bg-[var(--surface-1)]/90 border-t border-[var(--border)] shadow-lg"
            style={{ 
              left: !isMobile ? `${sidebarOffset}px` : 0,
              right: isMobile ? 0 : `${chatBotWidth}px` 
            }}
          >
            <div className="flex items-center justify-center px-4 py-3">
              <OnboardingTooltip
                id="course-content-types"
                content="Each lesson has different content types: Reading for text content, Video for visual learning, Flashcards for memorization, and Quiz for practice. Switch between them using these tabs!"
                position="top"
                pointerPosition="center"
                delay={800}
                priority={8}
              >
                <div className="flex items-center gap-4">
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
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm font-medium transition-all hover:bg-[var(--surface-muted)] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Previous</span>
                </button>

                <div className="flex items-center justify-center gap-1 overflow-x-auto custom-scrollbar">
                  {isLessonContentLoading(selectedLesson.id) && !isLessonContentLoaded(selectedLesson.id) ? (
                    <>
                      <div className="h-9 w-20 rounded-lg bg-[var(--surface-muted)] animate-pulse" />
                      <div className="h-9 w-24 rounded-lg bg-[var(--surface-muted)] animate-pulse" />
                      <div className="h-9 w-16 rounded-lg bg-[var(--surface-muted)] animate-pulse" />
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
                            : "bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-muted)]"
                        }`}
                      >
                        {contentType.label}
                      </button>
                    ))
                  )}
                </div>

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
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm font-medium transition-all hover:bg-[var(--surface-muted)] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="hidden sm:inline">Next</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              </OnboardingTooltip>
            </div>
          </div>
        )}
      </main>

      <ChatBot 
        ref={chatBotRef}
        isActive={isActive}
        pageContext={{
          courseId,
          courseName,
          studyPlan,
          selectedLesson,
          currentViewingItem,
          currentContent: selectedContentType && selectedLesson ? (() => {
            const normFmt = normalizeFormat(selectedContentType.type);
            const key = `${normFmt}:${selectedLesson.id}:${userId || ''}:${courseId || ''}`;
            const cached = contentCache[key];
            
            if (cached?.status === "loaded" && cached?.data?.data) {
              const data = cached.data.data;
              const content = { contentType: selectedContentType.type };
              
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
        onOpenInTab={onOpenChatTab}
      />

    </div>
  );
}
