"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ChatBot from "@/components/chat/ChatBot";
import FlashcardDeck from "@/components/content/FlashcardDeck";
import Quiz from "@/components/content/Quiz";
import ReadingRenderer from "@/components/content/ReadingRenderer";
import OnboardingTooltip, { FloatingOnboardingTooltip } from "@/components/ui/OnboardingTooltip";

// Module-level tracking to survive React Strict Mode remounts
const globalExamChecked = new Set();
const globalExamFetching = new Set();

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
              <div key={idx} className="backdrop-blur-xl bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-lg">
                <div className="aspect-video">
                  <iframe
                    src={embedUrl}
                    title={vid.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="p-4 border-t border-[var(--border)]">
                  <h3 className="font-medium text-[var(--foreground)]">{vid.title}</h3>
                  {vid.summary && (
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">{vid.summary}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    case "reading": {
      const latexContent = data?.body || data?.reading || "";
      return <ReadingRenderer content={latexContent} />;
    }
    case "flashcards": {
      return <FlashcardDeck data={flashcardData} onCardChange={handleCardChange} />;
    }
    case "mini_quiz": {
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
    case "practice_exam": {
      const problems = data?.practice_exam || data?.questions || [];
      // Check if it's quiz format (has options) or practice problem format (has answer_key)
      if (problems.length > 0 && problems[0].options) {
        return (
          <Quiz 
            questions={problems} 
            onQuestionChange={onQuizQuestionChange}
            onQuizCompleted={handleQuizCompleted}
            userId={userId}
            courseId={courseId}
            lessonId={id}
          />
        );
      }
      // Practice problems format with question, answer_key, rubric
      return (
        <div className="space-y-6">
          {problems.map((problem, idx) => (
            <div key={idx} className="backdrop-blur-xl bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2.5 py-1 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-semibold">
                  Problem {idx + 1}
                </span>
                {problem.estimated_minutes && (
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {problem.estimated_minutes} min
                  </span>
                )}
              </div>
              <div className="prose prose-invert max-w-none">
                <ReadingRenderer content={problem.question} />
              </div>
              {(problem.answer_key || problem.rubric) && (
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-active)] transition-colors">
                    Show Answer
                  </summary>
                  <div className="mt-4 p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                    {problem.answer_key && <ReadingRenderer content={problem.answer_key} />}
                    {problem.rubric && (
                      <div className="mt-4 pt-4 border-t border-[var(--border)]">
                        <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">Rubric</p>
                        <p className="text-sm text-[var(--muted-foreground)] whitespace-pre-wrap">{problem.rubric}</p>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
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
  
  // Practice exam state - persisted across navigation
  const [examState, setExamState] = useState({}); // { [examType]: { status, url, error, gradeResult, topicsToImprove, topicFeedback, reviewModuleStatus } }
  const examStateRef = useRef({}); // Ref to track latest exam state for callbacks
  const fileInputRef = useRef(null);
  const gradeAbortRef = useRef(null); // AbortController for grading requests
  const gradeTimeoutRef = useRef(null); // Timeout for 2-minute limit
  
  // Review modules state
  const [reviewModules, setReviewModules] = useState([]); // Array of review module objects
  const [selectedReviewModule, setSelectedReviewModule] = useState(null);
  const [reviewModulesExpanded, setReviewModulesExpanded] = useState(true); // Toggle visibility
  const [reviewModuleContentType, setReviewModuleContentType] = useState('reading'); // Active tab for review module

  // Update ref whenever state changes
  useEffect(() => {
    examStateRef.current = examState;
  }, [examState]);

  // Load exam state and topics from localStorage on mount
  useEffect(() => {
    if (!courseId) return;
    try {
      const savedState = localStorage.getItem(`examState_${courseId}`);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        // Restore state but keep generating status if it was in progress
        setExamState(prev => {
          const merged = { ...parsed };
          // If there's an active generating state in memory, preserve it
          Object.keys(prev).forEach(key => {
            if (prev[key]?.status === 'generating' || prev[key]?.status === 'grading') {
              merged[key] = prev[key];
            }
          });
          return merged;
        });
      }
    } catch (e) {
      console.error('Failed to load exam state from localStorage:', e);
    }
    
    // Cleanup on unmount
    return () => {
      if (gradeTimeoutRef.current) clearTimeout(gradeTimeoutRef.current);
      if (gradeAbortRef.current) gradeAbortRef.current.abort();
    };
  }, [courseId]);

  // Persist exam state to localStorage whenever it changes
  useEffect(() => {
    if (!courseId) return;
    try {
      // Don't persist transient states like 'checking'
      const stateToPersist = {};
      Object.entries(examState).forEach(([key, value]) => {
        if (value && ['ready', 'not-built', 'graded', 'generating', 'grading'].includes(value.status)) {
          stateToPersist[key] = value;
        }
      });
      localStorage.setItem(`examState_${courseId}`, JSON.stringify(stateToPersist));
    } catch (e) {
      console.error('Failed to save exam state to localStorage:', e);
    }
  }, [examState, courseId]);

  // Check if exam already exists (doesn't generate)
  const checkExamExists = useCallback(async (examType) => {
    if (!userId || !courseId) return;
    
    const key = `${courseId}:${examType}`;
    
    // Use module-level Set to prevent duplicate fetches (survives Strict Mode)
    if (globalExamFetching.has(key)) return;
    if (globalExamChecked.has(key)) return;

    // Check current state using REF to avoid stale closures
    const currentStatus = examStateRef.current[examType]?.status;
    if (currentStatus && ['generating', 'grading', 'ready', 'graded', 'checking', 'not-built', 'error', 'grade-error'].includes(currentStatus)) {
      return; // Don't re-check if already in a meaningful state
    }
    
    globalExamFetching.add(key);
    globalExamChecked.add(key);

    setExamState(prev => {
      // Double-check in setter to handle race conditions
      const prevStatus = prev[examType]?.status;
      if (prevStatus && ['generating', 'grading', 'ready', 'graded', 'checking', 'not-built', 'error', 'grade-error'].includes(prevStatus)) {
        return prev;
      }
      return { ...prev, [examType]: { status: 'checking', url: null, error: null } };
    });
    
    try {
      const fetchRes = await fetch(
        `/api/courses/${courseId}/exams/${examType}?userId=${userId}`
      );
      
      if (fetchRes.ok) {
        const data = await fetchRes.json();
        setExamState(prev => {
          // Preserve generating/grading states
          if (['generating', 'grading'].includes(prev[examType]?.status)) return prev;
          return { ...prev, [examType]: { ...prev[examType], status: 'ready', url: data.url, error: null } };
        });
      } else if (fetchRes.status === 404) {
        // Exam doesn't exist yet - show build option (don't retry)
        setExamState(prev => {
          if (['generating', 'grading'].includes(prev[examType]?.status)) return prev;
          return { ...prev, [examType]: { status: 'not-built', url: null, error: null } };
        });
      } else {
        const errData = await fetchRes.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to check exam (${fetchRes.status})`);
      }
    } catch (e) {
      setExamState(prev => {
        if (['generating', 'grading'].includes(prev[examType]?.status)) return prev;
        return { ...prev, [examType]: { status: 'error', url: null, error: e.message } };
      });
    } finally {
      globalExamFetching.delete(key);
    }
  }, [userId, courseId]); // Stable dependencies

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

  // Grade exam (upload completed exam for grading)
  const gradeExam = useCallback(async (examType, file) => {
    if (!userId || !courseId || !file) return;
    
    const key = examType;
    
    // Clear any existing timeout/abort
    if (gradeTimeoutRef.current) clearTimeout(gradeTimeoutRef.current);
    if (gradeAbortRef.current) gradeAbortRef.current.abort();
    
    // Create new abort controller
    const abortController = new AbortController();
    gradeAbortRef.current = abortController;
    
    setExamState(prev => ({ 
      ...prev, 
      [key]: { ...prev[key], status: 'grading', gradeResult: null, topicsToImprove: null } 
    }));
    
    // Set 2-minute timeout
    gradeTimeoutRef.current = setTimeout(() => {
      abortController.abort();
      setExamState(prev => ({ 
        ...prev, 
        [key]: { ...prev[key], status: 'ready', error: null, gradeResult: null, topicsToImprove: null } 
      }));
    }, 2 * 60 * 1000); // 2 minutes
    
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('type', examType);
      formData.append('file', file);
      
      const gradeRes = await fetch(
        `/api/courses/${courseId}/exams/grade`,
        {
          method: 'POST',
          body: formData,
          signal: abortController.signal
        }
      );
      
      // Clear timeout on success
      if (gradeTimeoutRef.current) clearTimeout(gradeTimeoutRef.current);
      
      if (!gradeRes.ok) {
        const errData = await gradeRes.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to grade exam (${gradeRes.status})`);
      }
      
      const gradeData = await gradeRes.json();
      // Support both old and new response formats
      const topicsToImprove = gradeData.topic_list?.filter(t => t.grade < 3) || gradeData.topics_to_improve || gradeData.topicsToImprove || [];
      
      setExamState(prev => ({ 
        ...prev, 
        [key]: { 
          ...prev[key], 
          status: 'graded', 
          gradeResult: gradeData,
          topicsToImprove,
          topicFeedback: {} // Track user agree/disagree on topics
        } 
      }));
    } catch (e) {
      // Clear timeout on error
      if (gradeTimeoutRef.current) clearTimeout(gradeTimeoutRef.current);
      
      // Don't show error if aborted (timeout or manual cancel)
      if (e.name === 'AbortError') return;
      
      setExamState(prev => ({ 
        ...prev, 
        [key]: { ...prev[key], status: 'grade-error', error: e.message } 
      }));
    }
  }, [userId, courseId]);

  // Handle file input change for grading
  const handleGradeFileSelect = useCallback((examType) => (e) => {
    const file = e.target.files?.[0];
    if (file) {
      gradeExam(examType, file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [gradeExam]);

  // Auto-check exam existence when practice exam is selected
  useEffect(() => {
    if (selectedLesson?.type === 'practice_exam' && userId && courseId) {
      const examType = selectedLesson.title?.toLowerCase().includes('final') ? 'final' : 'midterm';
      checkExamExists(examType);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLesson?.type, selectedLesson?.title, userId, courseId]);

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

  // Fetch review modules on mount
  useEffect(() => {
    if (!userId || !courseId) return;
    
    const fetchReviewModules = async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}/review-modules?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setReviewModules(data.modules || []);
        }
      } catch (e) {
        console.error('Failed to fetch review modules:', e);
      }
    };
    
    fetchReviewModules();
  }, [userId, courseId]);

  // Generate review module from grading results
  const generateReviewModule = useCallback(async (examType) => {
    const key = examType;
    const state = examState[key];
    const topicList = state?.gradeResult?.topic_list || [];
    if (topicList.length === 0) return;

    const topics = topicList.map((topic, idx) => ({
      topic: topic.topic,
      grade: topic.grade,
      explanation: topic.explanation,
      feedback: state.topicFeedback?.[idx] || { type: 'agree' }
    }));

    try {
      const res = await fetch(`/api/courses/${courseId}/review-modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          examType: key,
          topics
        })
      });

      if (!res.ok) {
        throw new Error('Failed to generate review module');
      }

      const data = await res.json();
      
      // Refresh review modules list
      const listRes = await fetch(`/api/courses/${courseId}/review-modules?userId=${userId}`);
      if (listRes.ok) {
        const listData = await listRes.json();
        setReviewModules(listData.modules || []);
      }

      return data;
    } catch (e) {
      console.error('Failed to generate review module:', e);
      throw e;
    }
  }, [userId, courseId, examState]);

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
    setSelectedReviewModule(null);
    setViewMode("topic");
    setCurrentViewingItem(null);
    fetchLessonContent(lesson.id, [contentType]);
  };

  const handleBackToSyllabus = () => {
    setViewMode("syllabus");
    setSelectedLesson(null);
    setSelectedContentType(null);
    setSelectedReviewModule(null);
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
        // Practice problems hidden for now
        // if (data.practice_exam && data.practice_exam.length > 0) types.push({ label: "Practice Problems", value: "practice_exam" });
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
              {/* Review Modules Section - At Top */}
              {reviewModules.length > 0 && (
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={() => setReviewModulesExpanded(!reviewModulesExpanded)}
                    className="w-full flex items-center justify-between px-1 py-2 hover:bg-[var(--surface-muted)]/30 rounded-lg transition-colors"
                  >
                    <h4 className="text-xs uppercase tracking-[0.15em] font-semibold text-[var(--warning)] flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Review Modules
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--warning)]/20 text-[var(--warning)] font-medium">
                        {reviewModules.length}
                      </span>
                    </h4>
                    <svg 
                      className={`w-4 h-4 text-[var(--warning)] transition-transform ${reviewModulesExpanded ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {reviewModulesExpanded && (
                    <div className="space-y-2 mt-2">
                      {reviewModules.map((reviewModule, idx) => {
                        const isSelected = selectedReviewModule?.id === reviewModule.id;
                        return (
                          <button
                            key={reviewModule.id || idx}
                            type="button"
                            onClick={() => {
                              setSelectedReviewModule(reviewModule);
                              setSelectedLesson(null);
                              setReviewModuleContentType('reading');
                              setViewMode("topic");
                            }}
                            className={`w-full backdrop-blur-sm rounded-xl border transition-all duration-200 p-3 flex items-center gap-3 ${
                              isSelected
                                ? "bg-[var(--warning)]/15 border-[var(--warning)]/30 shadow-lg shadow-[var(--warning)]/10"
                                : "bg-[var(--warning)]/5 border-[var(--warning)]/20 hover:bg-[var(--warning)]/10 hover:border-[var(--warning)]/30"
                            }`}
                          >
                            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--warning)]/20 text-[var(--warning)] flex-shrink-0">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <h3 className="text-sm font-semibold text-[var(--warning)] truncate">
                                {reviewModule.title || `${reviewModule.exam_type?.charAt(0).toUpperCase()}${reviewModule.exam_type?.slice(1)} Review`}
                              </h3>
                              <p className="text-xs text-[var(--warning)]/70">
                                {reviewModule.estimated_minutes || 30}min review
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              
              {studyPlan.modules?.map((module, moduleIdx) => {
                const isCollapsed = collapsedModules.has(moduleIdx);
                const isPracticeExamModule = module.is_practice_exam_module;
                
                // Skip review modules that are shown in the dedicated Review Modules section
                const isReviewModule = module.title?.toLowerCase().includes('review') && 
                  module.lessons?.some(l => reviewModules.some(rm => rm.title === l.title));
                if (isReviewModule) return null;
                
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
                        setSelectedReviewModule(null);
                        setViewMode("topic");
                        setCurrentViewingItem(null);
                      }}
                      className={`w-full backdrop-blur-sm rounded-xl border transition-all duration-200 p-3 flex items-center gap-3 ${
                        isSelected
                          ? "bg-[var(--primary)]/15 border-[var(--primary)]/30 shadow-lg shadow-[var(--primary)]/10"
                          : "bg-[var(--primary)]/5 border-[var(--primary)]/20 hover:bg-[var(--primary)]/10 hover:border-[var(--primary)]/30"
                      }`}
                    >
                      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--primary)]/20 text-[var(--primary)] flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <h3 className="text-sm font-semibold text-[var(--primary)] truncate">
                          {exam.title}
                        </h3>
                        <p className="text-xs text-[var(--primary)]/70">
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
                                setSelectedReviewModule(null);
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
                      
                      const colors = ['from-purple-500/30 to-purple-500/10', 'from-blue-500/30 to-blue-500/10', 'from-emerald-500/30 to-emerald-500/10', 'from-[var(--primary)]/30 to-[var(--primary)]/10'];
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

          {/* Review Module Content View */}
          {!loading && !error && studyPlan && viewMode === "topic" && selectedReviewModule && (
            <section className="space-y-6 pb-24">
              {(() => {
                const payload = selectedReviewModule.content_payload || {};
                const availableTypes = [];
                if (payload.reading) availableTypes.push({ value: 'reading', label: 'Reading' });
                if (payload.video?.length > 0) availableTypes.push({ value: 'video', label: 'Video' });
                if (payload.quiz?.length > 0) availableTypes.push({ value: 'mini_quiz', label: 'Quiz' });
                // Practice problems hidden for now
                // if (payload.practice_exam?.length > 0) availableTypes.push({ value: 'practice_exam', label: 'Practice Problems' });
                
                const activeType = reviewModuleContentType;
                
                return (
                  <>
                    {activeType === 'reading' && payload.reading && (
                      <ReadingRenderer content={payload.reading} />
                    )}
                    
                    {activeType === 'video' && payload.video?.length > 0 && (
                      <div className="space-y-4">
                        {payload.video.map((video, idx) => (
                          <div key={idx} className="backdrop-blur-xl bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-lg">
                            <div className="aspect-video">
                              <iframe
                                src={`https://www.youtube.com/embed/${video.videoId}`}
                                title={video.title}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                            <div className="p-4 border-t border-[var(--border)]">
                              <h3 className="font-medium text-[var(--foreground)]">{video.title}</h3>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {activeType === 'mini_quiz' && payload.quiz?.length > 0 && (
                      <Quiz questions={payload.quiz} />
                    )}
                    
                    {activeType === 'practice_exam' && payload.practice_exam?.length > 0 && (
                      <div className="space-y-6">
                        {payload.practice_exam.map((problem, idx) => (
                          <div key={idx} className="backdrop-blur-xl bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 shadow-lg">
                            <div className="flex items-center gap-2 mb-4">
                              <span className="px-2.5 py-1 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-semibold">
                                Problem {idx + 1}
                              </span>
                              <span className="text-xs text-[var(--muted-foreground)]">
                                {problem.estimated_minutes || 20} min
                              </span>
                            </div>
                            <div className="prose prose-invert max-w-none">
                              <ReadingRenderer content={problem.question} />
                            </div>
                            <details className="mt-6">
                              <summary className="cursor-pointer text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-active)] transition-colors">
                                Show Answer
                              </summary>
                              <div className="mt-4 p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                                <ReadingRenderer content={problem.answer_key} />
                                {problem.rubric && (
                                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                                    <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">Rubric</p>
                                    <p className="text-sm text-[var(--muted-foreground)] whitespace-pre-wrap">{problem.rubric}</p>
                                  </div>
                                )}
                              </div>
                            </details>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </section>
          )}

          {!loading && !error && studyPlan && viewMode === "topic" && selectedLesson && selectedContentType && (
            <>
              <section className="space-y-6 pb-24">
                {selectedLesson.type === 'practice_exam' ? (
                  (() => {
                    const examType = selectedLesson.title?.toLowerCase().includes('final') ? 'final' : 'midterm';
                    const currentExamState = examState[examType] || {};
                    const allLessons = studyPlan.modules?.filter(m => !m.is_practice_exam_module).flatMap(m => m.lessons || []) || [];
                    const precedingLessonIds = selectedLesson.preceding_lessons || [];
                    const lessonTitles = precedingLessonIds.map(id => allLessons.find(l => l.id === id)?.title).filter(Boolean);
                    
                    // Hidden file input
                    const fileInput = (
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,image/*,application/pdf"
                        className="hidden"
                        onChange={handleGradeFileSelect(examType)}
                      />
                    );
                    
                    // Loading states (checking, generating, grading)
                    if (['checking', 'generating', 'grading'].includes(currentExamState.status)) {
                      return (
                        <div className="flex flex-col items-center justify-center min-h-[60vh]">
                          {fileInput}
                          <div className="relative">
                            <div className="w-20 h-20 rounded-full border-4 border-[var(--surface-2)]" />
                            <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-[var(--primary)] animate-spin" />
                          </div>
                          <p className="mt-6 text-lg font-medium text-[var(--foreground)]">
                            {currentExamState.status === 'checking' && 'Loading exam...'}
                            {currentExamState.status === 'generating' && 'Generating your exam...'}
                            {currentExamState.status === 'grading' && 'Grading your submission...'}
                          </p>
                          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                            {currentExamState.status === 'generating' && 'This usually takes 1-2 minutes'}
                            {currentExamState.status === 'grading' && 'Analyzing your answers...'}
                          </p>
                        </div>
                      );
                    }
                    
                    // Error state
                    if (currentExamState.status === 'error' || currentExamState.status === 'grade-error') {
                      return (
                        <div className="flex flex-col items-center justify-center min-h-[40vh]">
                          {fileInput}
                          <div className="w-16 h-16 rounded-full bg-[var(--danger)]/10 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-[var(--danger)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="text-lg font-medium text-[var(--foreground)] mb-2">
                            {currentExamState.status === 'grade-error' ? 'Grading Failed' : 'Something went wrong'}
                          </p>
                          <p className="text-sm text-[var(--muted-foreground)] mb-6 text-center max-w-md">
                            {currentExamState.error}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const key = `${courseId}:${examType}`;
                              globalExamChecked.delete(key); // Allow retry
                              if (currentExamState.status === 'grade-error') {
                                setExamState(prev => ({ ...prev, [examType]: { ...prev[examType], status: 'ready', error: null } }));
                              } else {
                                setExamState(prev => ({ ...prev, [examType]: null }));
                                checkExamExists(examType);
                              }
                            }}
                            className="px-6 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--surface-muted)] transition-all"
                          >
                            Try Again
                          </button>
                        </div>
                      );
                    }
                    
                    // Not built state - show generate button
                    if (currentExamState.status === 'not-built' || !currentExamState.status) {
                      return (
                        <div className="flex flex-col items-center justify-center min-h-[50vh]">
                          {fileInput}
                          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 flex items-center justify-center mb-6">
                            <svg className="w-12 h-12 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">{selectedLesson.title}</h2>
                          <p className="text-[var(--muted-foreground)] mb-8 text-center max-w-md">
                            Generate a practice exam covering {lessonTitles.length} lessons to test your knowledge
                          </p>
                          <button
                            type="button"
                            onClick={() => generateExam(examType, lessonTitles)}
                            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-active)] text-white font-semibold text-lg shadow-xl shadow-[var(--primary)]/30 hover:shadow-[var(--primary)]/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Generate Practice Exam
                          </button>
                          
                          {/* Refresh button to recheck */}
                          <button
                            type="button"
                            onClick={() => {
                              const key = `${courseId}:${examType}`;
                              globalExamChecked.delete(key);
                              setExamState(prev => ({ ...prev, [examType]: null }));
                              checkExamExists(examType);
                            }}
                            className="mt-4 px-4 py-2 rounded-xl text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-all flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Refresh
                          </button>
                          
                          {/* Collapsible lessons preview */}
                          {lessonTitles.length > 0 && (
                            <details className="mt-8 w-full max-w-lg">
                              <summary className="cursor-pointer text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                View {lessonTitles.length} lessons covered
                              </summary>
                              <div className="mt-3 p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                                <div className="space-y-2">
                                  {lessonTitles.map((title, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                                      <span className="w-5 h-5 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-xs">{idx + 1}</span>
                                      {title}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </details>
                          )}
                        </div>
                      );
                    }
                    
                    // Ready or Graded state - show PDF viewer
                    if ((currentExamState.status === 'ready' || currentExamState.status === 'graded') && currentExamState.url) {
                      return (
                        <div className="space-y-4">
                          {fileInput}
                          
                          {/* Header with title and actions */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
                            <div>
                              <h2 className="text-xl font-bold text-[var(--foreground)]">{selectedLesson.title}</h2>
                              <p className="text-sm text-[var(--muted-foreground)]">
                                {selectedLesson.duration} min • {lessonTitles.length} lessons
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-active)] text-white font-medium shadow-lg shadow-[var(--primary)]/20 hover:shadow-[var(--primary)]/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all flex items-center gap-2 text-sm"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                {currentExamState.status === 'graded' ? 'Grade Again' : 'Submit for Grading'}
                              </button>
                            </div>
                          </div>
                          
                          {/* Grading results if available */}
                          {currentExamState.status === 'graded' && currentExamState.gradeResult && (
                            <div className="space-y-6">
                              {/* Overall Score Card */}
                              <div className="rounded-2xl bg-gradient-to-br from-[var(--surface-1)] to-[var(--surface-2)] border border-[var(--border)] p-6 shadow-lg">
                                <div className="flex flex-col md:flex-row md:items-center gap-6">
                                  {/* Score Circle */}
                                  <div className="flex-shrink-0 flex flex-col items-center">
                                    <div className="relative w-28 h-28">
                                      <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                                        <circle
                                          cx="50"
                                          cy="50"
                                          r="42"
                                          fill="none"
                                          stroke="var(--surface-muted)"
                                          strokeWidth="8"
                                        />
                                        <circle
                                          cx="50"
                                          cy="50"
                                          r="42"
                                          fill="none"
                                          stroke={currentExamState.gradeResult.overall_score >= 70 ? 'var(--success)' : currentExamState.gradeResult.overall_score >= 50 ? 'var(--warning)' : 'var(--danger)'}
                                          strokeWidth="8"
                                          strokeLinecap="round"
                                          strokeDasharray={`${(currentExamState.gradeResult.overall_score / 100) * 264} 264`}
                                        />
                                      </svg>
                                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-bold text-[var(--foreground)]">
                                          {currentExamState.gradeResult.overall_score}
                                        </span>
                                        <span className="text-xs text-[var(--muted-foreground)]">/ 100</span>
                                      </div>
                                    </div>
                                    <p className="mt-2 text-sm font-medium text-[var(--foreground)]">Overall Score</p>
                                  </div>
                                  
                                  {/* Overall Feedback */}
                                  {currentExamState.gradeResult.overall_feedback && (
                                    <div className="flex-1 md:border-l md:border-[var(--border)] md:pl-6">
                                      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Summary
                                      </h3>
                                      <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                                        {currentExamState.gradeResult.overall_feedback}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Topic Breakdown */}
                              {currentExamState.gradeResult.topic_list && currentExamState.gradeResult.topic_list.length > 0 && (
                                <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--border)] overflow-hidden shadow-lg">
                                  <div className="px-6 py-4 border-b border-[var(--border)] bg-gradient-to-r from-[var(--primary)]/5 to-transparent">
                                    <div className="flex items-center justify-between">
                                      <h3 className="text-base font-semibold text-[var(--foreground)] flex items-center gap-2">
                                        <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                        </svg>
                                        Topic Breakdown
                                      </h3>
                                      <span className="text-xs text-[var(--muted-foreground)] bg-[var(--surface-2)] px-2 py-1 rounded-full">
                                        {currentExamState.gradeResult.topic_list.length} topics
                                      </span>
                                    </div>
                                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                                      Your feedback helps us build a personalized review module for you
                                    </p>
                                  </div>
                                  
                                  <div className="divide-y divide-[var(--border)]">
                                    {currentExamState.gradeResult.topic_list.map((topic, idx) => {
                                      const userFeedback = currentExamState.topicFeedback?.[idx];
                                      const gradeColor = topic.grade === 3 ? 'var(--success)' : topic.grade === 2 ? 'var(--warning)' : 'var(--danger)';
                                      const gradeLabel = topic.grade === 3 ? 'Excellent' : topic.grade === 2 ? 'Partial' : 'Needs Work';
                                      const gradeBg = topic.grade === 3 ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' : topic.grade === 2 ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400' : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400';
                                      
                                      return (
                                        <div key={idx} className="px-6 py-4 hover:bg-[var(--surface-2)]/50 transition-colors">
                                          <div className="flex items-start gap-4">
                                            {/* Grade indicator */}
                                            <div className="flex-shrink-0 mt-0.5">
                                              <div 
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center border ${gradeBg}`}
                                              >
                                                <span className="text-lg font-bold">{topic.grade}</span>
                                              </div>
                                            </div>
                                            
                                            {/* Topic info */}
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-sm font-semibold text-[var(--foreground)]">{topic.topic}</h4>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${gradeBg}`}>
                                                  {gradeLabel}
                                                </span>
                                              </div>
                                              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                                                {topic.explanation}
                                              </p>
                                              
                                              {/* Feedback buttons */}
                                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                                <span className="text-xs text-[var(--muted-foreground)] mr-1">Do you agree with this assessment?</span>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setExamState(prev => ({
                                                      ...prev,
                                                      [examType]: {
                                                        ...prev[examType],
                                                        topicFeedback: {
                                                          ...prev[examType]?.topicFeedback,
                                                          [idx]: { type: 'agree' }
                                                        }
                                                      }
                                                    }));
                                                  }}
                                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                    !userFeedback || userFeedback?.type === 'agree'
                                                      ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30'
                                                      : 'bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] border border-transparent'
                                                  }`}
                                                >
                                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                                  </svg>
                                                  Agree
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setExamState(prev => ({
                                                      ...prev,
                                                      [examType]: {
                                                        ...prev[examType],
                                                        topicFeedback: {
                                                          ...prev[examType]?.topicFeedback,
                                                          [idx]: { type: 'disagree', confidence: null, reason: '' }
                                                        }
                                                      }
                                                    }));
                                                  }}
                                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                    userFeedback?.type === 'disagree'
                                                      ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                                                      : 'bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] border border-transparent'
                                                  }`}
                                                >
                                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                                                  </svg>
                                                  Disagree
                                                </button>
                                              </div>
                                              
                                              {/* Disagree expanded options */}
                                              {userFeedback?.type === 'disagree' && (
                                                <div className="mt-3 p-4 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--border)] space-y-4">
                                                  {/* Confidence selector */}
                                                  <div>
                                                    <label className="text-xs font-medium text-[var(--foreground)] mb-2 block">
                                                      How confident are you in this topic?
                                                    </label>
                                                    <div className="flex flex-wrap gap-2">
                                                      {[
                                                        { value: 1, label: 'Not confident', color: 'bg-red-500/20 border-red-500/30 text-red-600 dark:text-red-400' },
                                                        { value: 2, label: 'Somewhat confident', color: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-600 dark:text-yellow-400' },
                                                        { value: 3, label: 'Very confident', color: 'bg-green-500/20 border-green-500/30 text-green-600 dark:text-green-400' }
                                                      ].map(option => (
                                                        <button
                                                          key={option.value}
                                                          type="button"
                                                          onClick={() => {
                                                            setExamState(prev => ({
                                                              ...prev,
                                                              [examType]: {
                                                                ...prev[examType],
                                                                topicFeedback: {
                                                                  ...prev[examType]?.topicFeedback,
                                                                  [idx]: { ...userFeedback, confidence: option.value }
                                                                }
                                                              }
                                                            }));
                                                          }}
                                                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                                            userFeedback.confidence === option.value
                                                              ? option.color
                                                              : 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]'
                                                          }`}
                                                        >
                                                          {option.label}
                                                        </button>
                                                      ))}
                                                    </div>
                                                  </div>
                                                  
                                                  {/* Reason input */}
                                                  <div>
                                                    <label className="text-xs font-medium text-[var(--foreground)] mb-2 block">
                                                      Why do you disagree? <span className="text-[var(--muted-foreground)] font-normal">(optional)</span>
                                                    </label>
                                                    <textarea
                                                      value={userFeedback.reason || ''}
                                                      onChange={(e) => {
                                                        setExamState(prev => ({
                                                          ...prev,
                                                          [examType]: {
                                                            ...prev[examType],
                                                            topicFeedback: {
                                                              ...prev[examType]?.topicFeedback,
                                                              [idx]: { ...userFeedback, reason: e.target.value }
                                                            }
                                                          }
                                                        }));
                                                      }}
                                                      placeholder="e.g., I made a small calculation error but understand the concept well..."
                                                      rows={2}
                                                      className="w-full px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]/50 resize-none"
                                                    />
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  
                                  {/* Review Module CTA */}
                                  {(() => {
                                    const topicList = currentExamState.gradeResult.topic_list || [];
                                    const feedback = currentExamState.topicFeedback || {};
                                    
                                    // Check if all topics have feedback (default to agree if not set)
                                    // and all disagreed topics have confidence ratings
                                    const allValid = topicList.every((_, idx) => {
                                      const f = feedback[idx];
                                      // If no feedback, defaults to agree (valid)
                                      if (!f) return true;
                                      // If agree, valid
                                      if (f.type === 'agree') return true;
                                      // If disagree, must have confidence
                                      if (f.type === 'disagree') return f.confidence != null;
                                      return true;
                                    });
                                    
                                    return (
                                      <div className="px-6 py-4 border-t border-[var(--border)]">
                                        <button
                                          type="button"
                                          disabled={!allValid}
                                          onClick={async () => {
                                            try {
                                              await generateReviewModule(examType);
                                            } catch (e) {
                                              console.error('Failed to generate review module:', e);
                                            }
                                          }}
                                          className={`w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                                            allValid
                                              ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-active)] text-white shadow-lg shadow-[var(--primary)]/20 hover:shadow-[var(--primary)]/40 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                                              : 'bg-[var(--surface-muted)] text-[var(--muted-foreground)] cursor-not-allowed'
                                          }`}
                                        >
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                          </svg>
                                          Generate Review Module
                                        </button>
                                        {!allValid && (
                                          <p className="text-xs text-[var(--muted-foreground)] text-center mt-2">
                                            Please provide a confidence rating for all topics you disagree with
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                              
                              {/* Legacy topics to improve (fallback for old format) */}
                              {!currentExamState.gradeResult.topic_list && currentExamState.topicsToImprove && currentExamState.topicsToImprove.length > 0 && (
                                <div className="rounded-2xl bg-gradient-to-r from-[var(--warning)]/10 to-[var(--warning)]/5 border border-[var(--warning)]/20 p-6">
                                  <p className="text-sm font-medium text-[var(--foreground)] mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[var(--warning)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    Topics to Review
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {currentExamState.topicsToImprove.map((topic, idx) => (
                                      <span
                                        key={idx}
                                        className="px-3 py-1.5 rounded-full bg-[var(--warning)]/10 border border-[var(--warning)]/20 text-sm text-[var(--warning)]"
                                      >
                                        {typeof topic === 'string' ? topic : topic.name || topic.topic}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* PDF Viewer */}
                          <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-1)] shadow-lg">
                            <iframe
                              src={`${currentExamState.url}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                              className="w-full bg-white"
                              style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}
                              title="Practice Exam PDF"
                            />
                          </div>
                          
                          {/* Collapsible lessons */}
                          {lessonTitles.length > 0 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors flex items-center gap-2 py-2">
                                <svg className="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                {lessonTitles.length} lessons covered in this exam
                              </summary>
                              <div className="mt-2 p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {lessonTitles.map((title, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                                      <span className="w-5 h-5 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-xs flex-shrink-0">{idx + 1}</span>
                                      <span className="truncate">{title}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </details>
                          )}
                        </div>
                      );
                    }
                    
                    // Fallback
                    return null;
                  })()
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

        {/* Bottom nav for Review Modules */}
        {viewMode === "topic" && selectedReviewModule && (
          <div 
            className="fixed bottom-0 z-30 backdrop-blur-xl bg-[var(--surface-1)]/90 border-t border-[var(--border)] shadow-lg"
            style={{ 
              left: !isMobile ? `${sidebarOffset}px` : 0,
              right: isMobile ? 0 : `${chatBotWidth}px` 
            }}
          >
            <div className="flex items-center justify-center px-4 py-3">
              <div className="flex items-center gap-4">
                {(() => {
                  const payload = selectedReviewModule.content_payload || {};
                  const availableTypes = [];
                  if (payload.reading) availableTypes.push({ value: 'reading', label: 'Reading' });
                  if (payload.video?.length > 0) availableTypes.push({ value: 'video', label: 'Video' });
                  if (payload.quiz?.length > 0) availableTypes.push({ value: 'mini_quiz', label: 'Quiz' });
                  // Practice problems hidden for now
                  // if (payload.practice_exam?.length > 0) availableTypes.push({ value: 'practice_exam', label: 'Practice Problems' });
                  
                  const currentIdx = availableTypes.findIndex(t => t.value === reviewModuleContentType);
                  
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (currentIdx > 0) {
                            setReviewModuleContentType(availableTypes[currentIdx - 1].value);
                          }
                        }}
                        disabled={currentIdx <= 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm font-medium transition-all hover:bg-[var(--surface-muted)] disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="hidden sm:inline">Previous</span>
                      </button>

                      <div className="flex items-center justify-center gap-1 overflow-x-auto custom-scrollbar">
                        {availableTypes.map((contentType) => (
                          <button
                            key={contentType.value}
                            type="button"
                            onClick={() => setReviewModuleContentType(contentType.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                              reviewModuleContentType === contentType.value
                                ? "bg-[var(--warning)] text-white shadow-lg shadow-[var(--warning)]/20"
                                : "bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-muted)]"
                            }`}
                          >
                            {contentType.label}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (currentIdx < availableTypes.length - 1) {
                            setReviewModuleContentType(availableTypes[currentIdx + 1].value);
                          }
                        }}
                        disabled={currentIdx >= availableTypes.length - 1}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm font-medium transition-all hover:bg-[var(--surface-muted)] disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  );
                })()}
              </div>
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
