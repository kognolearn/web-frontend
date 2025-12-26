"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ChatBot from "@/components/chat/ChatBot";
import FlashcardDeck from "@/components/content/FlashcardDeck";
import Quiz from "@/components/content/Quiz";
import PracticeProblems from "@/components/content/PracticeProblems";
import TaskRenderer from "@/components/content/TaskRenderer";
import ReadingRenderer from "@/components/content/ReadingRenderer";
import VideoBlock from "@/components/content/VideoBlock";
import OnboardingTooltip, { FloatingOnboardingTooltip } from "@/components/ui/OnboardingTooltip";
import Tooltip from "@/components/ui/Tooltip";
import { authFetch } from "@/lib/api";

// Module-level tracking to survive React Strict Mode remounts
const globalExamChecked = new Set();
const globalExamFetching = new Set();

// Utility functions
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
  handleQuizCompleted,
  onReadingCompleted,
  onFlashcardsCompleted,
  onVideoViewed,
  moduleQuizTab
}) {
  const normFmt = normalizeFormat(fmt);
  const key = `${normFmt}:${id}:${userId}:${courseId}`;
  const cached = contentCache[key];
  const fetchInitiatedRef = useRef(new Set());
  const wasMiniQuizRef = useRef(null);

  useEffect(() => {
    if (!normFmt || !id || !userId || !courseId) return undefined;
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
        const res = await authFetch(url, { signal: ac.signal });
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
    const isMiniQuiz = normalizeFormat(cachedEnvelope.format || fmt) === "mini_quiz";
    if (!isMiniQuiz) {
      if (wasMiniQuizRef.current !== false) {
        onQuizQuestionChange(null);
        wasMiniQuizRef.current = false;
      }
      return;
    }
    if (wasMiniQuizRef.current !== true) {
      wasMiniQuizRef.current = true;
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
      // Note: Video completion is now handled by VideoBlock via the backend API
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
            return (
              <VideoBlock
                key={idx}
                url={vid.url}
                title={vid.title}
                description={vid.summary}
                courseId={courseId}
                lessonId={id}
                userId={userId}
                videoCompleted={data?.videoCompleted || false}
                onVideoViewed={onVideoViewed}
              />
            );
          })}
        </div>
      );
    }
    case "reading": {
      const latexContent = data?.body || data?.reading || "";
      return (
        <ReadingRenderer 
          content={latexContent} 
          courseId={courseId}
          lessonId={id}
          userId={userId}
          inlineQuestionSelections={data?.inlineQuestionSelections || {}}
          readingCompleted={data?.readingCompleted || false}
          onReadingCompleted={onReadingCompleted}
        />
      );
    }
    case "flashcards": {
      return (
        <FlashcardDeck 
          data={flashcardData} 
          onCardChange={handleCardChange}
          courseId={courseId}
          lessonId={id}
          onFlashcardsCompleted={onFlashcardsCompleted}
        />
      );
    }
    case "mini_quiz": {
      // Check if this is a Module Quiz with practice problems (has both quiz and practice)
      const hasPractice = data?.practice_problems && data.practice_problems.length > 0;
      const currentTab = moduleQuizTab || 'quiz';
      
      if (hasPractice && currentTab === 'practice') {
        return <PracticeProblems problems={data.practice_problems} />;
      }
      
      return (
        <Quiz 
          key={id}
          questions={data?.questions || data} 
          onQuestionChange={onQuizQuestionChange}
          onQuizCompleted={handleQuizCompleted}
          userId={userId}
          courseId={courseId}
          lessonId={id}
        />
      );
    }
    case "practice": {
      // Practice problems with rubrics, step-by-step solutions, and self-grading
      const practiceProblems = data?.practice_problems || [];
      return <PracticeProblems problems={practiceProblems} />;
    }
    case "interactive_practice":
    case "interactive_task": {
      // Interactive Task (formerly interactive practice)
      const taskData = data?.interactive_task || data?.interactive_practice || data || {};
      return <TaskRenderer taskData={taskData} />;
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
  isTimerPaused,
  onPauseToggle,
  initialLessonId,
  initialContentType,
  onViewStateChange,
  isSettingsModalOpen,
  setIsSettingsModalOpen,
  isTimerControlsOpen,
  setIsTimerControlsOpen,
  isEditCourseModalOpen,
  setIsEditCourseModalOpen,
  onOpenChatTab,
  onClose,
  onChatTabReturn,
  chatOpenRequest,
  onTabTitleChange,
  onCurrentLessonChange,
  hasHiddenContent = false,
  onHiddenContentClick,
  isActive = true,
  sharedChatState,
  onSharedChatStateChange,
  activeChatId,
  onActiveChatIdChange,
  onChatOpenRequestHandled,
  focusTimerRef,
  focusTimerState,
  isDeepStudyCourse = false
}) {
  const router = useRouter();
  const chatBotRef = useRef(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  
  // Track the last title we sent to avoid redundant calls
  const lastTitleRef = useRef(null);

  // Update tab title when lesson changes
  useEffect(() => {
    if (selectedLesson?.title && onTabTitleChange && selectedLesson.title !== lastTitleRef.current) {
      lastTitleRef.current = selectedLesson.title;
      onTabTitleChange(selectedLesson.title);
    }
  }, [selectedLesson?.title, onTabTitleChange]);

  // Report current lesson ID to parent for smart plan updates
  useEffect(() => {
    if (onCurrentLessonChange) {
      onCurrentLessonChange(selectedLesson?.id || null);
    }
  }, [selectedLesson?.id, onCurrentLessonChange]);

  // Handle external chat open requests
  useEffect(() => {
    if (!chatOpenRequest || !chatBotRef.current) return;
    if (chatOpenRequest.chatId) {
      chatBotRef.current.setActiveChat?.(chatOpenRequest.chatId);
      onActiveChatIdChange?.(chatOpenRequest.chatId);
    } else if (chatOpenRequest.state) {
      chatBotRef.current.loadState?.(chatOpenRequest.state);
      if (chatOpenRequest.state.currentChatId) {
        onActiveChatIdChange?.(chatOpenRequest.state.currentChatId);
      }
    }
    chatBotRef.current.open({ mode: 'docked' });
    onChatOpenRequestHandled?.(chatOpenRequest.tabId ?? null);
  }, [chatOpenRequest, onActiveChatIdChange, onChatOpenRequestHandled]);

  const [contentCache, setContentCache] = useState({});
  const contentCacheRef = useRef(contentCache);
  const [chatBotWidth, setChatBotWidth] = useState(0);
  const [chatQuizContext, setChatQuizContext] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState("topic");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [expandedLessons, setExpandedLessons] = useState(new Set());
  const [collapsedModules, setCollapsedModules] = useState(new Set());
  const [selectedContentType, setSelectedContentType] = useState(null);
  const [currentViewingItem, setCurrentViewingItem] = useState(null);
  
  // Notify parent of current lesson/content selection for tab restore
  useEffect(() => {
    if (!onViewStateChange) return;
    onViewStateChange({
      lessonId: selectedLesson?.id || null,
      contentType: selectedContentType?.type || null,
    });
  }, [selectedLesson?.id, selectedContentType?.type, onViewStateChange]);

  useEffect(() => {
    contentCacheRef.current = contentCache;
  }, [contentCache]);
  
  // Lesson/module completion celebration state
  const [completionCelebration, setCompletionCelebration] = useState(null); // { type: 'lesson'|'module', title, status }
  const celebrationTimeoutRef = useRef(null);
  const shareResetRef = useRef(null);
  const [shareCopied, setShareCopied] = useState(false);
  
  // Practice exam state - fetched from API
  const [examState, setExamState] = useState({}); // { [examType]: { status, exams: [...], selectedExamNumber, error } }
  const examStateRef = useRef({}); // Ref to track latest exam state for callbacks
  const fileInputRef = useRef(null);
  const gradeAbortRef = useRef(null); // AbortController for grading requests
  const gradeTimeoutRef = useRef(null); // Timeout for 2-minute limit
  
  // Review modules state
  const [reviewModules, setReviewModules] = useState([]); // Array of review module objects
  const [selectedReviewModule, setSelectedReviewModule] = useState(null);
  const [reviewModulesExpanded, setReviewModulesExpanded] = useState(true); // Toggle visibility
  const [reviewModuleContentType, setReviewModuleContentType] = useState('reading'); // Active tab for review module
  
  // Module Quiz tab state - 'quiz' or 'practice'
  const [moduleQuizTab, setModuleQuizTab] = useState('quiz');
  
  // Exam modification modal state
  const [examModifyModal, setExamModifyModal] = useState({ open: false, examType: null, examNumber: null });
  const [examModifyPrompt, setExamModifyPrompt] = useState('');

  // Update ref whenever state changes
  useEffect(() => {
    examStateRef.current = examState;
  }, [examState]);

  // Cleanup on unmount
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gradeTimeoutRef.current) clearTimeout(gradeTimeoutRef.current);
      if (gradeAbortRef.current) gradeAbortRef.current.abort();
      if (celebrationTimeoutRef.current) clearTimeout(celebrationTimeoutRef.current);
      if (shareResetRef.current) clearTimeout(shareResetRef.current);
    };
  }, []);

  // Fetch list of exams from API
  const fetchExamList = useCallback(async (examType) => {
    if (!userId || !courseId) return;
    
    const key = `${courseId}:${examType}`;
    
    // Use module-level Set to prevent duplicate fetches (survives Strict Mode)
    if (globalExamFetching.has(key)) return;
    if (globalExamChecked.has(key)) return;

    // Check current state using REF to avoid stale closures
    const currentStatus = examStateRef.current[examType]?.status;
    if (currentStatus && ['generating', 'grading', 'loading'].includes(currentStatus)) {
      return; // Don't re-fetch if already in a transient state
    }
    
    globalExamFetching.add(key);
    globalExamChecked.add(key);

    setExamState(prev => ({
      ...prev,
      [examType]: { ...prev[examType], status: 'loading', error: null }
    }));
    
    try {
      const fetchRes = await authFetch(
        `/api/courses/${courseId}/exams/${examType}?userId=${userId}`
      );
      
      if (fetchRes.ok) {
        const data = await fetchRes.json();
        const exams = data.exams || [];
        setExamState(prev => {
          // Preserve generating/grading states
          if (['generating', 'grading'].includes(prev[examType]?.status)) return prev;
          
          const selectedExamNumber = prev[examType]?.selectedExamNumber || (exams.length > 0 ? exams[exams.length - 1].number : null);
          return {
            ...prev,
            [examType]: {
              status: 'ready',
              exams,
              selectedExamNumber,
              error: null
            }
          };
        });
      } else {
        const errData = await fetchRes.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch exams (${fetchRes.status})`);
      }
    } catch (e) {
      setExamState(prev => {
        if (['generating', 'grading'].includes(prev[examType]?.status)) return prev;
        return {
          ...prev,
          [examType]: { status: 'error', exams: [], selectedExamNumber: null, error: e.message }
        };
      });
    } finally {
      globalExamFetching.delete(key);
    }
  }, [userId, courseId]);

  // Generate exam (only called when user clicks create)
  const generateExam = useCallback(async (examType, lessonTitles) => {
    if (!userId || !courseId) return;
    
    setExamState(prev => ({
      ...prev,
      [examType]: { ...prev[examType], status: 'generating', error: null }
    }));
    
    try {
      const generateRes = await authFetch(
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
      
      // Add the new exam to the list and select it
      setExamState(prev => {
        const existingExams = prev[examType]?.exams || [];
        const newExam = {
          name: genData.name,
          url: genData.url,
          number: genData.number,
          grade: null
        };
        return {
          ...prev,
          [examType]: {
            status: 'ready',
            exams: [...existingExams, newExam],
            selectedExamNumber: genData.number,
            error: null
          }
        };
      });
    } catch (e) {
      setExamState(prev => ({
        ...prev,
        [examType]: { ...prev[examType], status: 'error', error: e.message }
      }));
    }
  }, [userId, courseId]);

  // Grade exam (upload completed exam for grading)
  const gradeExam = useCallback(async (examType, examNumber, file) => {
    if (!userId || !courseId || !file || !examNumber) return;
    
    // Clear any existing timeout/abort
    if (gradeTimeoutRef.current) clearTimeout(gradeTimeoutRef.current);
    if (gradeAbortRef.current) gradeAbortRef.current.abort();
    
    // Create new abort controller
    const abortController = new AbortController();
    gradeAbortRef.current = abortController;
    
    setExamState(prev => ({
      ...prev,
      [examType]: { ...prev[examType], status: 'grading', error: null }
    }));
    
    // Set 2-minute timeout
    gradeTimeoutRef.current = setTimeout(() => {
      abortController.abort();
      setExamState(prev => ({
        ...prev,
        [examType]: { ...prev[examType], status: 'ready', error: null }
      }));
    }, 2 * 60 * 1000); // 2 minutes
    
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('exam_type', examType);
      formData.append('exam_number', String(examNumber));
      formData.append('input_pdf', file);
      
      const gradeRes = await authFetch(
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
      
      // Update the exam in the list with grade data
      setExamState(prev => {
        const exams = (prev[examType]?.exams || []).map(exam => {
          if (exam.number === examNumber) {
            return {
              ...exam,
              grade: {
                score: gradeData.overall_score,
                feedback: gradeData.overall_feedback,
                topic_grades: gradeData.topic_list || [],
                created_at: new Date().toISOString()
              }
            };
          }
          return exam;
        });
        
        return {
          ...prev,
          [examType]: {
            ...prev[examType],
            status: 'ready',
            exams,
            error: null
          }
        };
      });
    } catch (e) {
      // Clear timeout on error
      if (gradeTimeoutRef.current) clearTimeout(gradeTimeoutRef.current);
      
      // Don't show error if aborted (timeout or manual cancel)
      if (e.name === 'AbortError') return;
      
      setExamState(prev => ({
        ...prev,
        [examType]: { ...prev[examType], status: 'error', error: e.message }
      }));
    }
  }, [userId, courseId]);

  // Modify exam (based on user prompt)
  const modifyExam = useCallback(async (examType, examNumber, prompt) => {
    if (!userId || !courseId || !examNumber || !prompt?.trim()) return;
    
    setExamState(prev => ({
      ...prev,
      [examType]: { ...prev[examType], status: 'modifying', error: null }
    }));
    
    try {
      const modifyRes = await authFetch(
        `/api/courses/${courseId}/exams/${examType}/${examNumber}/modify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, prompt: prompt.trim() })
        }
      );
      
      if (!modifyRes.ok) {
        const errData = await modifyRes.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to modify exam (${modifyRes.status})`);
      }
      
      const modData = await modifyRes.json();
      
      // Update the exam in the list with new URL
      setExamState(prev => {
        const exams = (prev[examType]?.exams || []).map(exam => {
          if (exam.number === examNumber) {
            return {
              ...exam,
              url: modData.url,
              name: modData.name
            };
          }
          return exam;
        });
        
        return {
          ...prev,
          [examType]: {
            ...prev[examType],
            status: 'ready',
            exams,
            error: null
          }
        };
      });
    } catch (e) {
      setExamState(prev => ({
        ...prev,
        [examType]: { ...prev[examType], status: 'error', error: e.message }
      }));
    }
  }, [userId, courseId]);

  // Handle file input change for grading
  const handleGradeFileSelect = useCallback((examType, examNumber) => (e) => {
    const file = e.target.files?.[0];
    if (file) {
      gradeExam(examType, examNumber, file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [gradeExam]);

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

  // Expose course UI presence to global layout (lifecycle)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    if (!body) return;

    if (!isActive) return;

    body.classList.add('has-course-sidebar');

    return () => {
      // Only clean up when leaving the course UI, not on sidebar toggles.
      body.classList.remove('course-sidebar-closed');
      body.classList.remove('has-course-sidebar');
      body.classList.remove('course-ui-ready');
      body.style.removeProperty('--course-sidebar-width');
    };
  }, [isActive]);

  // Expose sidebar state to global layout via body class and CSS variable
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isActive) return;
    const body = document.body;
    if (!body) return;

    const currentWidth = isMobile ? 280 : sidebarWidth;
    body.style.setProperty('--course-sidebar-width', `${currentWidth}px`);

    if (!sidebarOpen) {
      body.classList.add('course-sidebar-closed');
    } else {
      body.classList.remove('course-sidebar-closed');
    }
  }, [sidebarOpen, isActive, sidebarWidth, isMobile]);

  // Mark course UI as "ready" only after sidebar + bottom bar have mounted
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isActive) return;
    const body = document.body;
    if (!body) return;

    // Keep this sticky once set so global floating buttons can animate smoothly
    // without being unmounted/remounted on sidebar toggles.
    if (body.classList.contains('course-ui-ready')) return;

    let cancelled = false;
    const startedAt = performance.now();

    const tick = () => {
      if (cancelled) return;

      const sidebarEl = document.querySelector('[data-course-sidebar="true"]');
      const bottomBarEl = document.querySelector('[data-course-bottom-bar="true"]');

      // Prefer waiting for both; but don't block forever if a bottom bar isn't rendered in current view.
      if (sidebarEl && bottomBarEl) {
        body.classList.add('course-ui-ready');
        return;
      }

      const elapsed = performance.now() - startedAt;
      if (sidebarEl && elapsed > 1500) {
        body.classList.add('course-ui-ready');
        return;
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);

    return () => {
      cancelled = true;
    };
  }, [isActive, viewMode, selectedLesson, selectedReviewModule]);

  // Fetch review modules on mount
  useEffect(() => {
    if (!userId || !courseId) return;
    
    const fetchReviewModules = async () => {
      try {
        const res = await authFetch(`/api/courses/${courseId}/review-modules?userId=${userId}`);
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
      const res = await authFetch(`/api/courses/${courseId}/review-modules`, {
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
      const listRes = await authFetch(`/api/courses/${courseId}/review-modules?userId=${userId}`);
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

  const fetchLessonContent = useCallback((lessonId, formats = ['reading'], options = {}) => {
    if (!userId || !courseId) return; // Guard: don't fetch without userId/courseId
    const { force = false } = options;
    formats.forEach(format => {
      const normFmt = normalizeFormat(format);
      const key = `${normFmt}:${lessonId}:${userId}:${courseId}`;

      const existing = contentCacheRef.current[key];
      if (!force && (existing?.status === "loading" || existing?.status === "loaded")) {
        return;
      }
      if (force && existing?.status === "loading") {
        return;
      }

      if (!existing || existing.status === "error") {
        setContentCache((prev) => ({ ...prev, [key]: { status: "loading" } }));
      }

      (async () => {
        try {
          const params = new URLSearchParams({ 
            format: normFmt, 
            id: String(lessonId) 
          });
          params.set("userId", String(userId));
          params.set("courseId", String(courseId));
          const url = `/api/content?${params.toString()}`;
          const res = await authFetch(url);
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
  }, [userId, courseId]);

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

  // Content completion handlers (always refetch backend status)
  const handleReadingCompleted = useCallback(() => {
    if (selectedLesson?.id && courseId) {
      fetchLessonContent(selectedLesson.id, ['reading'], { force: true });
    }
  }, [selectedLesson?.id, courseId, fetchLessonContent]);

  const handleFlashcardsCompleted = useCallback(() => {
    if (selectedLesson?.id && courseId) {
      fetchLessonContent(selectedLesson.id, ['flashcards'], { force: true });
    }
  }, [selectedLesson?.id, courseId, fetchLessonContent]);

  const handleVideoViewed = useCallback(() => {
    if (selectedLesson?.id && courseId) {
      fetchLessonContent(selectedLesson.id, ['video'], { force: true });
    }
  }, [selectedLesson?.id, courseId, fetchLessonContent]);

  const handleQuizContentCompleted = useCallback(async (result) => {
    if (selectedLesson?.id && courseId) {
      fetchLessonContent(selectedLesson.id, ['mini_quiz'], { force: true });
      // Also update the study plan
      await refetchStudyPlan();
    }
  }, [selectedLesson?.id, courseId, fetchLessonContent, refetchStudyPlan]);

  // Helper to get cached content data for a lesson
  const getLessonContentData = useCallback((lessonId) => {
    const cacheKeys = Object.keys(contentCache);
    const lessonCacheKey = cacheKeys.find(key => key.includes(`:${lessonId}:`));
    if (lessonCacheKey) {
      const cached = contentCache[lessonCacheKey];
      if (cached?.status === "loaded" && cached?.data?.data) {
        return cached.data.data;
      }
    }
    return null;
  }, [contentCache]);

  // Check if a content type is completed for a lesson (using backend data only)
  const isContentCompleted = useCallback((lessonId, contentType) => {
    const data = getLessonContentData(lessonId);
    if (!data) return false;

    switch (contentType) {
      case 'reading':
        return data.readingCompleted === true;
      case 'video':
        return data.videoCompleted === true;
      case 'mini_quiz':
        return data.quizCompleted === true;
      case 'flashcards':
        return data.flashcardsCompleted === true;
      case 'interactive_practice':
      case 'interactive_task':
        return (
          data.interactivePracticeCompleted === true ||
          data.interactive_practice_completed === true ||
          data.interactive_practice?.completed === true ||
          data.interactiveTaskCompleted === true ||
          data.interactive_task_completed === true ||
          data.interactive_task?.completed === true
        );
      default:
        return false;
    }
  }, [getLessonContentData]);

  // Helper functions for checking lesson content status
  const isLessonContentLoading = useCallback((lessonId) => {
    const cacheKeys = Object.keys(contentCache);
    const lessonCacheKey = cacheKeys.find(key => key.includes(`:${lessonId}:`));
    if (lessonCacheKey) {
      const cached = contentCache[lessonCacheKey];
      return cached?.status === "loading";
    }
    return false;
  }, [contentCache]);

  const isLessonContentLoaded = useCallback((lessonId) => {
    const cacheKeys = Object.keys(contentCache);
    const lessonCacheKey = cacheKeys.find(key => key.includes(`:${lessonId}:`));
    if (lessonCacheKey) {
      const cached = contentCache[lessonCacheKey];
      return cached?.status === "loaded";
    }
    return false;
  }, [contentCache]);

  const getAvailableContentTypes = useCallback((lessonId) => {
    const types = [];
    const cacheKeys = Object.keys(contentCache);
    const lessonCacheKey = cacheKeys.find(key => key.includes(`:${lessonId}:`));
    if (lessonCacheKey) {
      const cached = contentCache[lessonCacheKey];
      if (cached?.status === "loaded" && cached?.data?.data) {
        const data = cached.data.data;
        if (data.body || data.reading) types.push({ label: "Reading", value: "reading" });
        if (data.videos && data.videos.length > 0) types.push({ label: "Video", value: "video" });
        // if (data.cards && data.cards.length > 0) types.push({ label: "Flashcards", value: "flashcards" });
        if (data.questions || data.mcq || data.frq) types.push({ label: "Quiz", value: "mini_quiz" });
        // if (data.practice_problems && data.practice_problems.length > 0) types.push({ label: "Practice", value: "practice" });
        // Interactive practice: parsons, skeleton, matching, blackbox
        const ip = data.interactive_practice || data.interactive_task;
        if (ip) {
          types.push({ label: "Interactive Task", value: "interactive_task" });
        }
      }
    }
    if (types.length === 0) {
      types.push({ label: "Reading", value: "reading" });
    }
    return types;
  }, [contentCache]);

  // Helper to get lesson data from studyPlan by ID
  const getLessonFromStudyPlan = useCallback((lessonId) => {
    if (!studyPlan?.modules) return null;
    for (const module of studyPlan.modules) {
      const lesson = module.lessons?.find(l => l.id === lessonId);
      if (lesson) return lesson;
    }
    return null;
  }, [studyPlan]);

  // Get all lessons in a flat array (for navigation)
  const allLessonsFlat = useMemo(() => {
    if (!studyPlan?.modules) return [];
    return studyPlan.modules
      .filter(m => !m.is_practice_exam_module)
      .flatMap(m => m.lessons || []);
  }, [studyPlan]);

  // Get previous and next lessons relative to the current lesson
  const { prevLesson, nextLesson } = useMemo(() => {
    if (!selectedLesson?.id || allLessonsFlat.length === 0) {
      return { prevLesson: null, nextLesson: null };
    }
    const currentIndex = allLessonsFlat.findIndex(l => l.id === selectedLesson.id);
    if (currentIndex === -1) {
      return { prevLesson: null, nextLesson: null };
    }
    return {
      prevLesson: currentIndex > 0 ? allLessonsFlat[currentIndex - 1] : null,
      nextLesson: currentIndex < allLessonsFlat.length - 1 ? allLessonsFlat[currentIndex + 1] : null
    };
  }, [selectedLesson?.id, allLessonsFlat]);

  // Navigate to a lesson
  const navigateToLesson = useCallback((lesson, preferredContentType = 'reading') => {
    if (!lesson) return;
    const normalizedType = typeof preferredContentType === 'string' && preferredContentType.trim()
      ? preferredContentType
      : 'reading';
    setSelectedLesson(lesson);
    setSelectedContentType({ lessonId: lesson.id, type: normalizedType });
    setSelectedReviewModule(null);
    setViewMode("topic");
    setCurrentViewingItem(null);
    fetchLessonContent(lesson.id, [normalizedType]);
  }, [fetchLessonContent]);

  // Auto-select first lesson if available and not already selected
  useEffect(() => {
    if (!studyPlan || selectedLesson) return;

    if (initialLessonId) {
      const persistedLesson = getLessonFromStudyPlan(initialLessonId);
      if (persistedLesson) {
        const preferredType = typeof initialContentType === 'string' && initialContentType.trim()
          ? initialContentType
          : 'reading';
        navigateToLesson(persistedLesson, preferredType);
        return;
      }
    }

    const modules = studyPlan.modules || [];
    const firstModule =
      modules.find((m) => !m.is_practice_exam_module && Array.isArray(m.lessons) && m.lessons.length > 0) ||
      modules.find((m) => Array.isArray(m.lessons) && m.lessons.length > 0);

    if (firstModule && firstModule.lessons[0]) {
      navigateToLesson(firstModule.lessons[0]);
    }
  }, [studyPlan, selectedLesson, navigateToLesson, initialLessonId, initialContentType, getLessonFromStudyPlan]);

  // If initialLessonId changes from parent (e.g., tab restore), sync to it.
  // Use a ref to track the last synced initialLessonId to avoid infinite loops.
  const lastSyncedInitialLessonIdRef = useRef(null);
  
  useEffect(() => {
    if (!studyPlan || !initialLessonId) return;
    // Only sync if initialLessonId actually changed from what we last synced
    if (lastSyncedInitialLessonIdRef.current === initialLessonId) return;
    // Don't override if we're already on the right lesson
    if (selectedLesson?.id === initialLessonId) {
      lastSyncedInitialLessonIdRef.current = initialLessonId;
      return;
    }
    const persistedLesson = getLessonFromStudyPlan(initialLessonId);
    if (persistedLesson) {
      lastSyncedInitialLessonIdRef.current = initialLessonId;
      const preferredType = typeof initialContentType === 'string' && initialContentType.trim()
        ? initialContentType
        : 'reading';
      navigateToLesson(persistedLesson, preferredType);
    }
  }, [studyPlan, initialLessonId, initialContentType, selectedLesson?.id, getLessonFromStudyPlan, navigateToLesson]);

  // Check if all content types for a lesson are completed
  const isLessonFullyCompleted = useCallback((lessonId) => {
    // First check if the lesson has a status or mastery_status from the backend (not pending = completed)
    const lesson = getLessonFromStudyPlan(lessonId);
    // Check both 'status' (from plan JSON) and 'mastery_status' (from backend)
    const lessonStatus = lesson?.status || lesson?.mastery_status;
    if (lessonStatus && lessonStatus !== 'pending') {
      return true;
    }
    
    // If content is loaded, rely on backend completion flags
    if (isLessonContentLoaded(lessonId)) {
      const availableTypes = getAvailableContentTypes(lessonId).filter(
        (type) => type.value !== 'interactive_practice',
      );
      if (availableTypes.length > 0) {
        return availableTypes.every(type => isContentCompleted(lessonId, type.value));
      }
    }
    
    return false;
  }, [getLessonFromStudyPlan, isLessonContentLoaded, getAvailableContentTypes, isContentCompleted]);

  // Get the mastery status of a lesson (for display purposes)
  const getLessonMasteryStatus = useCallback((lessonId) => {
    const lesson = getLessonFromStudyPlan(lessonId);
    // Check both 'status' (from plan JSON) and 'mastery_status' (from backend)
    return lesson?.status || lesson?.mastery_status || 'pending';
  }, [getLessonFromStudyPlan]);

  // Check if all lessons in a module are completed
  const isModuleCompleted = useCallback((module) => {
    const lessons = module?.lessons || [];
    if (lessons.length === 0) return false;
    
    return lessons.every(lesson => {
      // Check both 'status' (from plan JSON) and 'mastery_status' (from backend)
      const lessonStatus = lesson.status || lesson.mastery_status;
      if (lessonStatus && lessonStatus !== 'pending') {
        return true;
      }
      // Fall back to checking via isLessonFullyCompleted
      return isLessonFullyCompleted(lesson.id);
    });
  }, [isLessonFullyCompleted]);

  // Helper to calculate quiz score from backend data
  const calculateQuizScoreFromData = useCallback((data) => {
    if (!data?.questions || !Array.isArray(data.questions)) return null;
    
    const questions = data.questions;
    if (questions.length === 0) return null;
    
    // Count correct answers based on status field
    const correctCount = questions.filter(q => 
      q.status === 'correct' || q.status === 'correct/flag'
    ).length;
    
    return correctCount / questions.length;
  }, []);

  // Determine mastery status based on quiz score
  const determineMasteryStatus = useCallback((quizScore) => {
    if (quizScore === null || quizScore === undefined) {
      return 'mastered'; // Default to mastered if no quiz
    }
    return quizScore >= 0.7 ? 'mastered' : 'needs_review';
  }, []);

  // Effect to update lesson status when all content is completed
  const lessonCompletionUpdatedRef = useRef(new Set());
  
  useEffect(() => {
    if (!selectedLesson?.id || !courseId || !userId) return;
    
    const lessonId = selectedLesson.id;
    // Skip if we've already marked this lesson complete
    if (lessonCompletionUpdatedRef.current.has(lessonId)) return;
    
    // Check if lesson content is loaded first
    if (!isLessonContentLoaded(lessonId)) return;
    
    // Get the cached content data
    const data = getLessonContentData(lessonId);
    if (!data) return;
    
    // Check if all required content types are completed from backend data
    const readingCompleted = data.readingCompleted === true || !data.body;
    const videoCompleted = data.videoCompleted === true || !data.videos?.length;
    const quizCompleted = data.quizCompleted === true || !data.questions?.length;
    
    // Only mark lesson complete when reading, video, and quiz are all marked as complete from backend
    const allCompleted = readingCompleted && videoCompleted && quizCompleted;
    
    if (allCompleted) {
      // Mark as checked to prevent duplicate API calls
      lessonCompletionUpdatedRef.current.add(lessonId);
      
      // Get quiz score from backend data for determining mastery
      const quizScore = calculateQuizScoreFromData(data);
      const masteryStatus = determineMasteryStatus(quizScore);
      const familiarityScore = quizScore !== null ? quizScore : 1; // Default to 1 if no quiz
      
      // Update lesson status via API
      (async () => {
        try {
          const response = await authFetch(`/api/courses/${courseId}/nodes/${lessonId}/progress`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              mastery_status: masteryStatus,
              familiarity_score: familiarityScore,
            }),
          });
          
          if (response.ok) {
            // Show celebration banner
            if (celebrationTimeoutRef.current) clearTimeout(celebrationTimeoutRef.current);
            setCompletionCelebration({
              type: 'lesson',
              title: selectedLesson.title,
              status: masteryStatus,
            });
            celebrationTimeoutRef.current = setTimeout(() => {
              setCompletionCelebration(null);
            }, 5000); // Auto-dismiss after 5 seconds
            
            // Refresh the study plan to get updated lesson status
            await refetchStudyPlan();
          }
        } catch (error) {
          console.error('Failed to update lesson progress:', error);
        }
      })();
    }
  }, [selectedLesson?.id, selectedLesson?.title, courseId, userId, isLessonContentLoaded, getLessonContentData, calculateQuizScoreFromData, determineMasteryStatus, refetchStudyPlan]);

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

  const handleShareCourse = useCallback(async () => {
    const link = `https://www.kognolearn.com/share/${courseId}`;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        setShareCopied(true);
      } else if (typeof window !== "undefined") {
        window.open(link, "_blank", "noopener,noreferrer");
      }
    } catch (_) {
      if (typeof window !== "undefined") {
        window.open(link, "_blank", "noopener,noreferrer");
      }
    } finally {
      if (shareResetRef.current) clearTimeout(shareResetRef.current);
      shareResetRef.current = setTimeout(() => setShareCopied(false), 1600);
    }
  }, [courseId]);

  const settingsTooltipContent = isDeepStudyCourse
    ? "Deep Study courses already include unlimited time. Open settings for focus timer controls and other options."
    : "Click here to adjust your study time. You can add or subtract time, or set a custom study duration for this course.";

  const isFocusTimerVisible = !!(
    focusTimerState &&
    (focusTimerState.seconds > 0 || focusTimerState.isRunning || focusTimerState.isCompleted)
  );
  const shouldShowTimerCard = (!isDeepStudyCourse && secondsRemaining !== null) || isFocusTimerVisible;

  return (
    <div className="relative w-full h-full flex overflow-hidden">
      {canRenderSidebar && !sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="absolute left-4 top-4 z-30 flex items-center gap-2 h-10 px-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/90 shadow-lg backdrop-blur-xl transition-colors hover:bg-[var(--surface-2)] hover:border-[var(--primary)]/50 text-[var(--foreground)] text-xs font-medium"
          title="Show Sidebar"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Show Sidebar
        </button>
      )}

      {/* Top Right Controls: Pause, Timer, Settings */}
      <div 
        className="absolute top-4 z-20 flex items-center gap-2"
        style={{ right: isMobile ? '16px' : `${chatBotWidth + 16}px` }}
      >
        {/* Pause/Play Button for Study Timer */}
        {!isDeepStudyCourse && secondsRemaining !== null && (
          <button
            type="button"
            onClick={onPauseToggle}
            className="flex items-center justify-center w-11 h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/90 shadow-lg backdrop-blur-xl transition-all hover:bg-[var(--surface-2)] hover:border-[var(--primary)]/50"
            title={isTimerPaused ? "Resume Timer" : "Pause Timer"}
          >
            {isTimerPaused ? (
              <svg className="w-5 h-5 text-[var(--foreground)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-[var(--foreground)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            )}
          </button>
        )}

        {/* Combined Timer Display Card (Clickable) */}
        {shouldShowTimerCard && (
          (() => {
            const Container = !isDeepStudyCourse && secondsRemaining !== null ? 'button' : 'div';
            const containerProps = !isDeepStudyCourse && secondsRemaining !== null
              ? {
                  type: 'button',
                  onClick: () => setIsTimerControlsOpen(true),
                  className: "flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/90 px-4 py-2 shadow-lg backdrop-blur-xl transition-all hover:bg-[var(--surface-2)] hover:border-[var(--primary)]/50"
                }
              : {
                  className: "flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/90 px-4 py-2 shadow-lg backdrop-blur-xl"
                };
            return (
              <Container {...containerProps}>
                {!isDeepStudyCourse && secondsRemaining !== null && (
                  <>
                    <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
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
                  </>
                )}

                {(!isDeepStudyCourse && secondsRemaining !== null && isFocusTimerVisible) && (
                  <span className="text-[var(--border)] mx-1">|</span>
                )}

                {isFocusTimerVisible && (
                  focusTimerState.isCompleted ? (
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                      <span className="text-sm font-semibold text-green-500">Done</span>
                    </div>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <div className="flex items-baseline gap-0.5">
                        {(() => {
                          const m = Math.floor(focusTimerState.seconds / 60);
                          const s = focusTimerState.seconds % 60;
                          return (
                            <>
                              <span className="text-lg font-bold tabular-nums text-[var(--foreground)]">{String(m).padStart(2, '0')}</span>
                              <span className="text-[10px] text-[var(--muted-foreground)]">:</span>
                              <span className="text-lg font-bold tabular-nums text-[var(--foreground)]">{String(s).padStart(2, '0')}</span>
                              {focusTimerState.phase && focusTimerState.phase !== "work" && (
                                <span className="ml-1 text-[9px] text-amber-500 font-medium uppercase">
                                  {focusTimerState.phase === "longBreak" ? "Long" : "Break"}
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </>
                  )
                )}
              </Container>
            );
          })()
        )}

        {/* Focus Timer Complete Dismiss Button */}
        {focusTimerState?.isCompleted && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); focusTimerRef?.current?.dismissComplete?.(); }}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-green-500/30 bg-green-500/10 shadow-md backdrop-blur-xl transition-all hover:bg-green-500/20"
            title="Dismiss"
          >
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Hidden Content Warning - subtle indicator */}
        {!isDeepStudyCourse && hasHiddenContent && secondsRemaining !== null && (
          <Tooltip content="Some content is hidden. Add more time to see all content." position="bottom">
            <button
              type="button"
              onClick={() => onHiddenContentClick?.()}
              className="flex items-center justify-center w-11 h-11 rounded-2xl border border-amber-500/30 bg-amber-500/10 shadow-lg backdrop-blur-xl transition-all hover:bg-amber-500/20"
              title="Content hidden - click to add time"
            >
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            </button>
          </Tooltip>
        )}

        {/* Share Button */}
        <Tooltip content={shareCopied ? "Link copied" : "Copy share link"} position="bottom">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleShareCourse();
            }}
            className="flex items-center justify-center w-11 h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/90 shadow-lg backdrop-blur-xl transition-all hover:bg-[var(--surface-2)]"
            title="Share course"
            aria-label="Share course"
          >
            {shareCopied ? (
              <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-[var(--foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 6l-4-4-4 4" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v14" />
              </svg>
            )}
          </button>
        </Tooltip>

        {/* Settings Button */}
        <OnboardingTooltip
          id="course-settings-button"
          content={settingsTooltipContent}
          position="bottom"
          pointerPosition="right"
          delay={800}
          priority={5}
        >
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center justify-center w-11 h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/90 shadow-lg backdrop-blur-xl transition-all hover:bg-[var(--surface-2)] hover:border-[var(--primary)]/50"
            title="Course Settings"
          >
            <svg className="w-5 h-5 text-[var(--foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </OnboardingTooltip>
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
            data-course-sidebar="true"
            className={`absolute left-0 top-0 h-full backdrop-blur-xl bg-[var(--surface-1)]/95 border-r border-[var(--border)] transition-transform duration-200 z-40 flex flex-col ${
              isMobile
                ? sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                : sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{ width: isMobile ? '280px' : `${sidebarWidth}px` }}
          >
            <div className="p-3 border-b border-[var(--border)] flex items-center justify-between backdrop-blur-sm">
              {/* Close sidebar button on the left - styled like Show Sidebar */}
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2 h-10 px-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/90 shadow-lg backdrop-blur-xl transition-colors hover:bg-[var(--surface-2)] hover:border-[var(--primary)]/50 text-[var(--foreground)] text-xs font-medium"
                title="Hide Sidebar"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Hide Sidebar
              </button>
              {/* Dashboard button on the right */}
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 h-10 px-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/90 shadow-lg backdrop-blur-xl transition-colors hover:bg-[var(--surface-2)] hover:border-[var(--primary)]/50 text-[var(--foreground)] text-xs font-medium"
                title="Go to Dashboard"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </button>
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
                    onClick={() => {
                      if (!studyPlan) return;
                      const modules = studyPlan.modules || [];
                      const firstModule =
                        modules.find((m) => !m.is_practice_exam_module && Array.isArray(m.lessons) && m.lessons.length > 0) ||
                        modules.find((m) => Array.isArray(m.lessons) && m.lessons.length > 0);
                      if (firstModule && firstModule.lessons[0]) {
                        navigateToLesson(firstModule.lessons[0]);
                      }
                    }}
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
                    {(() => {
                      const moduleCompleted = isModuleCompleted(module);
                      return (
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
                            {/* Module number badge - shows checkmark if all lessons completed */}
                            <div className={`flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-lg text-white text-[11px] font-semibold shadow-md tabular-nums ${
                              moduleCompleted 
                                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/25'
                                : 'bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/80 shadow-[var(--primary)]/25'
                            }`}>
                              {moduleCompleted ? (
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                moduleIdx + 1
                              )}
                            </div>
                            <h3 className={`text-xs uppercase tracking-[0.15em] font-semibold text-left ${
                              moduleCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--primary)]'
                            }`}>
                              {module.title}
                            </h3>
                            {moduleCompleted && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium">
                                Complete
                              </span>
                            )}
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
                      );
                    })()}
                    
                    {!isCollapsed && (
                      <div className="px-3 pb-3 space-y-1">
                        {module.lessons?.map((lesson, lessonIdx) => {
                          const lessonCompleted = isLessonFullyCompleted(lesson.id);
                          // Check both 'status' (from plan JSON) and 'mastery_status' (from backend)
                          const lessonStatus = lesson.status || lesson.mastery_status || getLessonMasteryStatus(lesson.id);
                          // Show completion UI if status is anything other than 'pending'
                          const showCompleted = lessonCompleted || (lessonStatus && lessonStatus !== 'pending');
                          
                          return (
                            <button
                              key={lesson.id || lessonIdx}
                              type="button"
                              onClick={() => {
                                setSelectedLesson(lesson);
                                setSelectedReviewModule(null);
                                const availableTypes = getAvailableContentTypes(lesson.id);
                                // For "Module Quiz" lessons, always open quiz content directly
                                if (lesson.title === 'Module Quiz') {
                                  setSelectedContentType({ lessonId: lesson.id, type: 'mini_quiz' });
                                  setModuleQuizTab('quiz'); // Reset to quiz tab when opening Module Quiz
                                  fetchLessonContent(lesson.id, ['mini_quiz']);
                                } else if (availableTypes.length > 0) {
                                  setSelectedContentType({ lessonId: lesson.id, type: availableTypes[0].value });
                                  fetchLessonContent(lesson.id, ['reading']);
                                } else {
                                  fetchLessonContent(lesson.id, ['reading']);
                                }
                                setViewMode("topic");
                                setCurrentViewingItem(null);
                              }}
                              className={`w-full text-left px-3 py-2.5 text-sm transition-all duration-200 flex items-center gap-2.5 rounded-lg ${
                                selectedLesson?.id === lesson.id
                                  ? "bg-[var(--primary)]/15 text-[var(--primary)] font-medium shadow-sm"
                                  : showCompleted
                                    ? "bg-emerald-500/5 hover:bg-emerald-500/10 text-[var(--foreground)]"
                                    : "hover:bg-[var(--surface-muted)] text-[var(--foreground)]"
                              }`}
                            >
                              {/* Lesson number badge - shows checkmark if completed */}
                              <span className={`min-w-[1.375rem] h-[1.375rem] flex items-center justify-center rounded-md text-[10px] font-semibold tabular-nums transition-colors ${
                                showCompleted
                                  ? "bg-emerald-500 text-white"
                                  : selectedLesson?.id === lesson.id
                                    ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                                    : "bg-[var(--surface-2)] text-[var(--muted-foreground)] border border-[var(--border)]/50"
                              }`}>
                                {showCompleted ? (
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  lessonIdx + 1
                                )}
                              </span>
                              <span className={`flex-1 truncate ${
                                showCompleted
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : ''
                              }`}>
                                {lesson.title}
                              </span>
                              {/* Completion indicator badge */}
                              {showCompleted && (
                                <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium">
                                  Complete
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Review & Cheatsheet Section - Bottom of Sidebar */}
              <div className="mt-4 pt-4 border-t border-[var(--border)] flex gap-2">
                <a
                  href={`/courses/${courseId}/review`}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--surface-muted)]/50 transition-colors group"
                  title="Review Mode"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-sm font-medium">Review</span>
                </a>
                <a
                  href={`/courses/${courseId}/cheatsheet`}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--surface-muted)]/50 transition-colors group"
                  title="Cheatsheet"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium">Cheatsheet</span>
                </a>
              </div>
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
        className="flex-1 overflow-y-auto scrollbar-none transition-all duration-200"
        style={{ 
          marginLeft: !isMobile ? `${sidebarOffset}px` : 0,
          marginRight: isMobile ? 0 : `${chatBotWidth}px` 
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Completion celebration banner */}
        {completionCelebration && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg border backdrop-blur-xl ${
              completionCelebration.status === 'mastered' 
                ? 'bg-emerald-500/90 border-emerald-400/50 text-white'
                : 'bg-amber-500/90 border-amber-400/50 text-white'
            }`}>
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                completionCelebration.status === 'mastered' 
                  ? 'bg-white/20' 
                  : 'bg-white/20'
              }`}>
                {completionCelebration.status === 'mastered' ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">
                  {completionCelebration.status === 'mastered' ? '🎉 Lesson Mastered!' : '⭐ Lesson Complete!'}
                </p>
                <p className="text-xs opacity-90 truncate">
                  {completionCelebration.title}
                  {completionCelebration.status === 'needs_review' && ' - Review recommended'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCompletionCelebration(null)}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-white/20 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

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

          {/* Review Module Content View */}
          {!loading && !error && studyPlan && viewMode === "topic" && selectedReviewModule && (
            <section className="space-y-6 pb-24">
              {(() => {
                const payload = selectedReviewModule.content_payload || {};
                const availableTypes = [];
                if (payload.reading) availableTypes.push({ value: 'reading', label: 'Reading' });
                if (payload.video?.length > 0) availableTypes.push({ value: 'video', label: 'Video' });
                if (payload.quiz?.length > 0) availableTypes.push({ value: 'mini_quiz', label: 'Quiz' });
                
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
                    const exams = currentExamState.exams || [];
                    const selectedExamNumber = currentExamState.selectedExamNumber;
                    const selectedExam = exams.find(e => e.number === selectedExamNumber) || exams[exams.length - 1];
                    
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
                        onChange={handleGradeFileSelect(examType, selectedExam?.number)}
                      />
                    );
                    
                    // Loading states (checking, generating, grading, modifying)
                    if (['loading', 'generating', 'grading', 'modifying'].includes(currentExamState.status)) {
                      return (
                        <div className="flex flex-col items-center justify-center min-h-[60vh]">
                          {fileInput}
                          <div className="relative">
                            <div className="w-20 h-20 rounded-full border-4 border-[var(--surface-2)]" />
                            <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-[var(--primary)] animate-spin" />
                          </div>
                          <p className="mt-6 text-lg font-medium text-[var(--foreground)]">
                            {currentExamState.status === 'loading' && 'Loading exams...'}
                            {currentExamState.status === 'generating' && 'Generating your exam...'}
                            {currentExamState.status === 'grading' && 'Grading your submission...'}
                            {currentExamState.status === 'modifying' && 'Modifying your exam...'}
                          </p>
                          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                            {currentExamState.status === 'generating' && 'This usually takes 1-2 minutes'}
                            {currentExamState.status === 'grading' && 'Analyzing your answers...'}
                            {currentExamState.status === 'modifying' && 'Applying your changes...'}
                          </p>
                        </div>
                      );
                    }
                    
                    // Error state
                    if (currentExamState.status === 'error') {
                      return (
                        <div className="flex flex-col items-center justify-center min-h-[40vh]">
                          {fileInput}
                          <div className="w-16 h-16 rounded-full bg-[var(--danger)]/10 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-[var(--danger)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="text-lg font-medium text-[var(--foreground)] mb-2">
                            Something went wrong
                          </p>
                          <p className="text-sm text-[var(--muted-foreground)] mb-6 text-center max-w-md">
                            {currentExamState.error}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const key = `${courseId}:${examType}`;
                              globalExamChecked.delete(key); // Allow retry
                              setExamState(prev => ({ ...prev, [examType]: null }));
                              fetchExamList(examType);
                            }}
                            className="px-6 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--surface-muted)] transition-all"
                          >
                            Try Again
                          </button>
                        </div>
                      );
                    }
                    
                    // Empty state (no exams yet)
                    if (exams.length === 0) {
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
                        </div>
                      );
                    }
                    
                    // Exam View with Tabs
                    return (
                      <div className="space-y-6">
                        {fileInput}
                        
                        {/* Header */}
                        <div className="flex flex-col gap-4">
                          <div>
                            <h2 className="text-xl font-bold text-[var(--foreground)]">{selectedLesson.title}</h2>
                            <p className="text-sm text-[var(--muted-foreground)]">
                              {selectedLesson.duration} min • {lessonTitles.length} lessons
                            </p>
                          </div>
                          
                          {/* Tabs */}
                          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                            {exams.map((exam) => (
                              <button
                                key={exam.number}
                                onClick={() => setExamState(prev => ({
                                  ...prev,
                                  [examType]: { ...prev[examType], selectedExamNumber: exam.number }
                                }))}
                                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                  selectedExam?.number === exam.number
                                    ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20'
                                    : 'bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]'
                                }`}
                              >
                                Exam {exam.number}
                                {exam.grade && (
                                  <span className="ml-2 px-1.5 py-0.5 rounded bg-white/20 text-xs">
                                    {exam.grade.score}%
                                  </span>
                                )}
                              </button>
                            ))}
                            
                            <button
                              onClick={() => generateExam(examType, lessonTitles)}
                              className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl border border-dashed border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors"
                              title="Generate New Exam"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {selectedExam && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Actions Bar */}
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setExamModifyPrompt('');
                                  setExamModifyModal({ open: true, examType, examNumber: selectedExam.number });
                                }}
                                className="px-4 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--surface-muted)] transition-all flex items-center gap-2 text-sm"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Modify Exam
                              </button>
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-active)] text-white font-medium shadow-lg shadow-[var(--primary)]/20 hover:shadow-[var(--primary)]/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all flex items-center gap-2 text-sm"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                {selectedExam.grade ? 'Grade Again' : 'Submit for Grading'}
                              </button>
                            </div>

                            {/* Grading Results */}
                            {selectedExam.grade && (
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
                                            stroke={selectedExam.grade.score >= 70 ? 'var(--success)' : selectedExam.grade.score >= 50 ? 'var(--warning)' : 'var(--danger)'}
                                            strokeWidth="8"
                                            strokeLinecap="round"
                                            strokeDasharray={`${(selectedExam.grade.score / 100) * 264} 264`}
                                          />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                          <span className="text-3xl font-bold text-[var(--foreground)]">
                                            {selectedExam.grade.score}
                                          </span>
                                          <span className="text-xs text-[var(--muted-foreground)]">/ 100</span>
                                        </div>
                                      </div>
                                      <p className="mt-2 text-sm font-medium text-[var(--foreground)]">Overall Score</p>
                                    </div>
                                    
                                    {/* Overall Feedback */}
                                    {selectedExam.grade.feedback && (
                                      <div className="flex-1 md:border-l md:border-[var(--border)] md:pl-6">
                                        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2 flex items-center gap-2">
                                          <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          Summary
                                        </h3>
                                        <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                                          {selectedExam.grade.feedback}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Topic Breakdown */}
                                {selectedExam.grade.topic_grades && selectedExam.grade.topic_grades.length > 0 && (
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
                                          {selectedExam.grade.topic_grades.length} topics
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <div className="divide-y divide-[var(--border)]">
                                      {selectedExam.grade.topic_grades.map((topic, idx) => {
                                        const gradeColor = topic.grade === 3 ? 'var(--success)' : topic.grade === 2 ? 'var(--warning)' : 'var(--danger)';
                                        const gradeLabel = topic.grade === 3 ? 'Excellent' : topic.grade === 2 ? 'Partial' : 'Needs Work';
                                        const gradeBg = topic.grade === 3 ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' : topic.grade === 2 ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400' : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400';
                                        
                                        return (
                                          <div key={idx} className="px-6 py-4 hover:bg-[var(--surface-2)]/50 transition-colors">
                                            <div className="flex items-start gap-4">
                                              <div className="flex-shrink-0 mt-0.5">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${gradeBg}`}>
                                                  <span className="text-lg font-bold">{topic.grade}</span>
                                                </div>
                                              </div>
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
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* PDF Viewer */}
                            <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-1)] shadow-lg">
                              <iframe
                                src={`${selectedExam.url}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                                className="w-full bg-white"
                                style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}
                                title={`Practice Exam ${selectedExam.number}`}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
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
                    handleQuizCompleted={handleQuizContentCompleted}
                    onReadingCompleted={handleReadingCompleted}
                    onFlashcardsCompleted={handleFlashcardsCompleted}
                    onVideoViewed={handleVideoViewed}
                    moduleQuizTab={moduleQuizTab}
                  />
                )}
              </section>
            </>
          )}
        </div>

        {viewMode === "topic" && selectedLesson && selectedLesson.type !== 'practice_exam' && selectedLesson.title !== 'Module Quiz' && (
          <div 
            data-course-bottom-bar="true"
            className="fixed bottom-0 z-30 backdrop-blur-xl bg-[var(--surface-1)]/90 border-t border-[var(--border)] shadow-lg"
            style={{ 
              left: !isMobile ? `${sidebarOffset}px` : 0,
              right: isMobile ? 0 : `${chatBotWidth}px` 
            }}
          >
            <div className={`flex items-center ${isMobile ? 'justify-center' : 'justify-between'} px-4 py-3`}>
              {/* Previous Lesson Button - hidden on mobile */}
              {!isMobile && (
                <button
                  type="button"
                  onClick={() => navigateToLesson(prevLesson)}
                  disabled={!prevLesson}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-medium transition-all
                    ${prevLesson
                      ? 'bg-[var(--surface-1)]/90 text-[var(--foreground)] border border-[var(--border)] shadow-lg backdrop-blur-xl hover:bg-[var(--surface-2)] hover:border-[var(--primary)]/50'
                      : 'bg-[var(--surface-1)]/50 text-[var(--muted-foreground)]/50 border border-[var(--border)]/50 cursor-not-allowed'
                    }
                  `}
                  title={prevLesson ? `Previous: ${prevLesson.title}` : 'No previous lesson'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline max-w-[120px] truncate">
                    {prevLesson ? prevLesson.title : 'Previous'}
                  </span>
                </button>
              )}

              {/* Content Type Navigation */}
              {(() => {
                const availableTypes = getAvailableContentTypes(selectedLesson.id);
                const currentIndex = availableTypes.findIndex(type => type.value === selectedContentType?.type);
                const prevType = currentIndex > 0 ? availableTypes[currentIndex - 1] : null;
                const nextType = currentIndex < availableTypes.length - 1 ? availableTypes[currentIndex + 1] : null;

                return (
                  <div className={`flex items-center ${isMobile ? 'flex-1 justify-between' : 'gap-2'}`}>
                    {/* Previous Content Type Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (prevType) {
                          setSelectedContentType({ lessonId: selectedLesson.id, type: prevType.value });
                          fetchLessonContent(selectedLesson.id, [prevType.value]);
                        }
                      }}
                      disabled={!prevType}
                      className={`
                        flex items-center justify-center transition-all
                        ${isMobile 
                          ? `flex-shrink-0 px-3 py-2 rounded-2xl text-sm font-medium ${prevType
                              ? 'bg-[var(--surface-1)]/90 text-[var(--foreground)] border border-[var(--border)] shadow-lg backdrop-blur-xl hover:bg-[var(--surface-2)] hover:border-[var(--primary)]/50'
                              : 'bg-[var(--surface-1)]/50 text-[var(--muted-foreground)]/50 border border-[var(--border)]/50 cursor-not-allowed'
                            }`
                          : `w-9 h-9 rounded-2xl text-sm ${prevType
                              ? 'bg-[var(--surface-1)]/90 text-[var(--foreground)] border border-[var(--border)] shadow-lg backdrop-blur-xl hover:bg-[var(--surface-2)] hover:border-[var(--primary)]/50'
                              : 'bg-[var(--surface-1)]/50 text-[var(--muted-foreground)]/50 border border-[var(--border)]/50 cursor-not-allowed'
                            }`
                        }
                      `}
                      title={prevType ? `Previous: ${prevType.label}` : 'No previous content type'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    <OnboardingTooltip
                      id="course-content-types"
                      content="Each lesson has different content types: Reading for text content, Video for visual learning, and Quiz for practice. Switch between them using these tabs!"
                      position="top"
                      pointerPosition="center"
                      delay={800}
                      priority={8}
                    >
                      {/* Content type buttons */}
                      <div className={`flex items-center gap-2 ${isMobile ? 'overflow-x-auto mx-2 px-1 scrollbar-hide' : ''}`}>
                        {isLessonContentLoading(selectedLesson.id) && !isLessonContentLoaded(selectedLesson.id) ? (
                          <>
                            <div className="w-11 h-11 rounded-2xl bg-[var(--surface-muted)] animate-pulse flex-shrink-0" />
                            <div className="w-11 h-11 rounded-2xl bg-[var(--surface-muted)] animate-pulse flex-shrink-0" />
                            <div className="w-11 h-11 rounded-2xl bg-[var(--surface-muted)] animate-pulse flex-shrink-0" />
                          </>
                        ) : (
                          availableTypes.map((contentType) => {
                            const isActive = selectedContentType?.type === contentType.value;
                            const isCompleted = isContentCompleted(selectedLesson.id, contentType.value);
                            
                            // Icon for each content type
                            const getIcon = () => {
                              switch(contentType.value) {
                                case 'reading':
                                  return (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                  );
                                case 'video':
                                  return (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  );
                                case 'flashcards':
                                  return (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                  );
                                case 'mini_quiz':
                                  return (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                    </svg>
                                  );
                                case 'practice':
                                  return (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  );
                                case 'interactive_practice':
                                  return (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                  );
                                default:
                                  return (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  );
                              }
                            };
                            
                            return (
                              <button
                                key={contentType.value}
                                type="button"
                                onClick={() => {
                                  setSelectedContentType({ lessonId: selectedLesson.id, type: contentType.value });
                                  fetchLessonContent(selectedLesson.id, [contentType.value]);
                                }}
                                className={`
                                  relative flex items-center justify-center w-11 h-11 rounded-2xl text-sm font-medium flex-shrink-0
                                  transition-all backdrop-blur-xl
                                  ${isActive
                                    ? isCompleted
                                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                                      : 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/25'
                                    : isCompleted
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-lg hover:bg-emerald-500/20'
                                      : 'bg-[var(--surface-1)]/90 text-[var(--muted-foreground)] border border-[var(--border)] shadow-lg hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/50'
                                  }
                                `}
                                title={contentType.label}
                              >
                                {getIcon()}
                                {isCompleted && !isActive && (
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </OnboardingTooltip>

                    {/* Next Content Type Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (nextType) {
                          setSelectedContentType({ lessonId: selectedLesson.id, type: nextType.value });
                          fetchLessonContent(selectedLesson.id, [nextType.value]);
                        }
                      }}
                      disabled={!nextType}
                      className={`
                        flex items-center justify-center transition-all
                        ${isMobile 
                          ? `flex-shrink-0 px-3 py-2 rounded-2xl text-sm font-medium ${nextType
                              ? 'bg-[var(--surface-1)]/90 text-[var(--foreground)] border border-[var(--border)] shadow-lg backdrop-blur-xl hover:bg-[var(--surface-2)] hover:border-[var(--primary)]/50'
                              : 'bg-[var(--surface-1)]/50 text-[var(--muted-foreground)]/50 border border-[var(--border)]/50 cursor-not-allowed'
                            }`
                          : `w-9 h-9 rounded-2xl text-sm ${nextType
                              ? 'bg-[var(--surface-1)]/90 text-[var(--foreground)] border border-[var(--border)] shadow-lg backdrop-blur-xl hover:bg-[var(--surface-2)] hover:border-[var(--primary)]/50'
                              : 'bg-[var(--surface-1)]/50 text-[var(--muted-foreground)]/50 border border-[var(--border)]/50 cursor-not-allowed'
                            }`
                        }
                      `}
                      title={nextType ? `Next: ${nextType.label}` : 'No next content type'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                );
              })()}

              {/* Next Lesson Button - hidden on mobile */}
              {!isMobile && (
                <button
                  type="button"
                  onClick={() => navigateToLesson(nextLesson)}
                  disabled={!nextLesson}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-medium transition-all
                    ${nextLesson
                      ? 'bg-[var(--surface-1)]/90 text-[var(--foreground)] border border-[var(--border)] shadow-lg backdrop-blur-xl hover:bg-[var(--surface-2)] hover:border-[var(--primary)]/50'
                      : 'bg-[var(--surface-1)]/50 text-[var(--muted-foreground)]/50 border border-[var(--border)]/50 cursor-not-allowed'
                    }
                  `}
                  title={nextLesson ? `Next: ${nextLesson.title}` : 'No next lesson'}
                >
                  <span className="hidden sm:inline max-w-[120px] truncate">
                    {nextLesson ? nextLesson.title : 'Next'}
                  </span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bottom nav for Module Quiz lessons */}
        {viewMode === "topic" && selectedLesson && selectedLesson.title === 'Module Quiz' && (
          <div 
            data-course-bottom-bar="true"
            className="fixed bottom-0 z-30 backdrop-blur-xl bg-[var(--surface-1)]/90 border-t border-[var(--border)] shadow-lg"
            style={{ 
              left: !isMobile ? `${sidebarOffset}px` : 0,
              right: isMobile ? 0 : `${chatBotWidth}px` 
            }}
          >
            <div className="flex items-center justify-center px-4 py-3">
              {(() => {
                // Check if module quiz has practice problems
                const cacheKeys = Object.keys(contentCache);
                const lessonCacheKey = cacheKeys.find(key => key.includes(`:${selectedLesson.id}:`));
                const cached = lessonCacheKey ? contentCache[lessonCacheKey] : null;
                const data = cached?.data?.data;
                const hasPractice = data?.practice_problems && data.practice_problems.length > 0;
                const hasQuiz = data?.questions || data?.mcq || data?.frq;
                
                if (!hasPractice || !hasQuiz) {
                  // No tabs needed if only one type of content
                  return null;
                }
                
                const tabs = [
                  { value: 'quiz', label: '', icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  )},
                  // { value: 'practice', label: '', icon: (
                  //   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  //     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  //   </svg>
                  // )}
                ];
                
                return (
                  <div className="flex items-center gap-2">
                    {tabs.map((tab) => {
                      const isActive = moduleQuizTab === tab.value;
                      
                      return (
                        <button
                          key={tab.value}
                          type="button"
                          onClick={() => setModuleQuizTab(tab.value)}
                          className={`
                            relative flex items-center justify-center w-11 h-11 rounded-2xl text-sm font-medium
                            transition-all backdrop-blur-xl
                            ${isActive
                              ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/25'
                              : 'bg-[var(--surface-1)]/90 text-[var(--muted-foreground)] border border-[var(--border)] shadow-lg hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/50'
                            }
                          `}
                          title={tab.label}
                        >
                          {tab.icon}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Bottom nav for Review Modules */}
        {viewMode === "topic" && selectedReviewModule && (
          <div 
            data-course-bottom-bar="true"
            className="fixed bottom-0 z-30 backdrop-blur-xl bg-[var(--surface-1)]/90 border-t border-[var(--border)] shadow-lg"
            style={{ 
              left: !isMobile ? `${sidebarOffset}px` : 0,
              right: isMobile ? 0 : `${chatBotWidth}px` 
            }}
          >
            <div className="flex items-center justify-center px-4 py-3">
                {(() => {
                  const payload = selectedReviewModule.content_payload || {};
                  const availableTypes = [];
                  if (payload.reading) availableTypes.push({ value: 'reading', label: 'Reading' });
                  if (payload.video?.length > 0) availableTypes.push({ value: 'video', label: 'Video' });
                  if (payload.quiz?.length > 0) availableTypes.push({ value: 'mini_quiz', label: 'Quiz' });
                  
                  return (
                      <div className="flex items-center gap-2">
                        {availableTypes.map((contentType) => {
                          const isActive = reviewModuleContentType === contentType.value;
                          
                          // Icon for each content type
                          const getIcon = () => {
                            switch(contentType.value) {
                              case 'reading':
                                return (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                  </svg>
                                );
                              case 'video':
                                return (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                );
                              case 'mini_quiz':
                                return (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                  </svg>
                                );
                              default:
                                return (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                );
                            }
                          };
                          
                          return (
                            <button
                              key={contentType.value}
                              type="button"
                              onClick={() => setReviewModuleContentType(contentType.value)}
                              className={`
                                relative flex items-center justify-center w-11 h-11 rounded-2xl text-sm font-medium
                                transition-all backdrop-blur-xl
                                ${isActive
                                  ? 'bg-[var(--warning)] text-white shadow-lg shadow-[var(--warning)]/25'
                                  : 'bg-[var(--surface-1)]/90 text-[var(--muted-foreground)] border border-[var(--border)] shadow-lg hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/50'
                                }
                              `}
                              title={contentType.label}
                            >
                              {getIcon()}
                            </button>
                          );
                        })}
                      </div>
                  );
                })()}
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
        initialChats={sharedChatState?.chats}
        initialChatId={activeChatId || sharedChatState?.currentChatId}
        syncedState={sharedChatState}
        onStateChange={onSharedChatStateChange}
        onActiveChatChange={onActiveChatIdChange}
        onWidthChange={setChatBotWidth}
        onOpenInTab={onOpenChatTab}
      />

      {/* Exam Modify Modal */}
      <AnimatePresence>
        {examModifyModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setExamModifyModal({ open: false, examType: null, examNumber: null })}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[var(--border)]">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">Modify Exam</h2>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  Describe how you want to modify this exam
                </p>
              </div>
              <div className="p-6 space-y-4">
                <textarea
                  value={examModifyPrompt}
                  onChange={(e) => setExamModifyPrompt(e.target.value)}
                  placeholder="e.g., Make the questions harder, add more conceptual questions, focus on chapter 3 topics, remove multiple choice and add short answer..."
                  className="w-full h-32 px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
                  autoFocus
                />
              </div>
              <div className="p-6 pt-0 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setExamModifyModal({ open: false, examType: null, examNumber: null })}
                  className="px-4 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--surface-muted)] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!examModifyPrompt.trim()}
                  onClick={() => {
                    if (examModifyPrompt.trim() && examModifyModal.examType && examModifyModal.examNumber) {
                      modifyExam(examModifyModal.examType, examModifyModal.examNumber, examModifyPrompt);
                      setExamModifyModal({ open: false, examType: null, examNumber: null });
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-active)] text-white font-medium shadow-lg shadow-[var(--primary)]/20 hover:shadow-[var(--primary)]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Apply Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
