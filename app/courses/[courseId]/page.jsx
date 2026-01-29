"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { supabase } from "@/lib/supabase/client";
import BlurredCourseGate from "@/components/auth/BlurredCourseGate";
import CourseTabContent from "@/components/courses/CourseTabContent";
import ChatTabContent from "@/components/courses/ChatTabContent";
import DiscussionTabContent from "@/components/community/DiscussionTabContent";
import MessagesTabContent from "@/components/messaging/MessagesTabContent";
import CourseSettingsModal from "@/components/courses/CourseSettingsModal";
import TimerControlsModal from "@/components/courses/TimerControlsModal";
import EditCourseModal from "@/components/courses/EditCourseModal";
import TimerExpiredModal from "@/components/courses/TimerExpiredModal";
import { useOnboarding } from "@/components/ui/OnboardingProvider";
import PersonalTimer from "@/components/courses/PersonalTimer";
import { useGuidedTour } from "@/components/tour";
import { useRealtimeUpdates, useCourseRealtimeUpdates } from "@/hooks/useRealtimeUpdates";
import { authFetch } from "@/lib/api";
import { isDesktopApp } from "@/lib/platform";
import { isDownloadRedirectEnabled } from "@/lib/featureFlags";
import { clearOnboardingGateCourseId, getOnboardingGateCourseId, transferAnonData } from "@/lib/onboarding";

const MAX_DEEP_STUDY_SECONDS = 999 * 60 * 60;
const COURSE_TABS_STORAGE_PREFIX = 'course_tabs_v1';
const getCourseTabsStorageKey = (userId, courseId) => `${COURSE_TABS_STORAGE_PREFIX}:${userId}:${courseId}`;
const normalizeCourseMode = (value) => {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase().replace(/\s+/g, "_");
  if (normalized.startsWith("deep")) return "deep";
  if (normalized.startsWith("cram")) return "cram";
  return normalized || null;
};

const generateChatId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createBlankChat = () => ({
  id: generateChatId(),
  name: "New Chat",
  messages: [],
});

const mergeChatStates = (base, incoming) => {
  const prev = base || {};
  const next = incoming || {};
    const hasRealFiles = (files) =>
      Array.isArray(files) && files.some((f) => typeof File !== "undefined" && f?.file instanceof File);
  const merged = {
    chats: Array.isArray(next.chats) && next.chats.length > 0 ? next.chats : (prev.chats || []),
    currentChatId: next.currentChatId ?? prev.currentChatId ?? null,
    drafts: { ...(prev.drafts || {}) },
  };

  if (next.drafts && typeof next.drafts === "object") {
    for (const [chatId, draft] of Object.entries(next.drafts)) {
      const prevDraft = merged.drafts[chatId];
        const incomingHasFiles = hasRealFiles(draft?.attachedFiles);
        const prevHasFiles = hasRealFiles(prevDraft?.attachedFiles);
      const incomingAttachedFilesArray = Array.isArray(draft?.attachedFiles) ? draft.attachedFiles : undefined;
      const incomingExplicitlyClearsFiles = Array.isArray(incomingAttachedFilesArray) && incomingAttachedFilesArray.length === 0;
      merged.drafts[chatId] = {
        input: draft?.input ?? prevDraft?.input ?? "",
        attachedFiles:
          incomingExplicitlyClearsFiles
            ? []
            : incomingHasFiles || !prevHasFiles
              ? (incomingAttachedFilesArray || [])
              : prevDraft?.attachedFiles || [],
      };
    }
  }

  // Ensure every chat has a draft bucket
  (merged.chats || []).forEach((chat) => {
    if (chat?.id && !merged.drafts[chat.id]) {
      merged.drafts[chat.id] = { input: "", attachedFiles: [] };
    }
  });

  return merged;
};

const unlockStudyPlan = (plan) => {
  if (!plan) return plan;
  const modules = (plan.modules || [])
    .map((module) => ({
      ...module,
      lessons: (module.lessons || []).map((lesson) => ({ ...lesson, is_locked: false })),
    }))
    .filter((module) => {
      const lessons = module.lessons || [];
      if (module.is_practice_exam_module) return true;
      if (lessons.length === 0) return false;
      if (lessons.length === 1 && lessons[0].title === "Module Quiz") return false;
      return true;
    });
  return { ...plan, modules };
};

export default function CoursePage() {
  const { courseId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userSettings } = useOnboarding();
  const { startTour, isTourActive, currentTour } = useGuidedTour();
  const [userId, setUserId] = useState(null);
  const [isAnonymousUser, setIsAnonymousUser] = useState(false);
  const [showAccountGate, setShowAccountGate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [transferPending, setTransferPending] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [studyPlan, setStudyPlan] = useState(null);
  const [courseMode, setCourseMode] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(null);
  const [initialSeconds, setInitialSeconds] = useState(null);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isTimerControlsOpen, setIsTimerControlsOpen] = useState(false);
  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = useState(false);
  const [shouldOpenPracticeExamModal, setShouldOpenPracticeExamModal] = useState(false);
  const [isTimerExpiredModalOpen, setIsTimerExpiredModalOpen] = useState(false);
  const [isHiddenContentModalOpen, setIsHiddenContentModalOpen] = useState(false);
  const [hasHiddenContent, setHasHiddenContent] = useState(false);
  const [chatOpenRequest, setChatOpenRequest] = useState(null);
  // Course generation state - track ready modules for incremental sidebar reveal
  const [courseStatus, setCourseStatus] = useState(null);
  const [readyModuleRefs, setReadyModuleRefs] = useState([]);
  const [sharedChatState, setSharedChatState] = useState(() => {
    const initialChat = createBlankChat();
    return {
      chats: [initialChat],
      currentChatId: initialChat.id,
      drafts: { [initialChat.id]: { input: "", attachedFiles: [] } },
    };
  });
  const sharedChatStateRef = useRef(sharedChatState);
  const initialChatIdRef = useRef(sharedChatState?.currentChatId || sharedChatState?.chats?.[0]?.id || null);
  const dragPreviewRef = useRef(null);
  const transferAttemptedRef = useRef(false);
  // Focus timer state - lifted from CourseTabContent
  const focusTimerRef = useRef(null);
  const [focusTimerState, setFocusTimerState] = useState({ seconds: 0, isRunning: false, phase: null, isCompleted: false });
  const deepSyncRef = useRef(false);
  const isDeepStudyCourse = courseMode === "deep";
  const forceDownloadRedirect = isDownloadRedirectEnabled();
  
  // Track current lesson ID from CourseTabContent for smart plan updates
  const currentLessonIdRef = useRef(null);
  const refetchStudyPlanRef = useRef(null);

  // Subscribe to real-time module completion updates during generation
  const handleModuleComplete = useCallback((payload) => {
    if (payload.courseId !== courseId) return;

    const moduleName = payload.moduleName || payload.moduleRef;
    if (moduleName) {
      setReadyModuleRefs((prev) => (
        prev.includes(moduleName) ? prev : [...prev, moduleName]
      ));
    }

    // Refresh study plan so newly-ready lessons can be opened immediately
    refetchStudyPlanRef.current?.()?.catch?.(() => {});

    // When all modules complete, refresh the course data
    if (payload.modulesComplete >= payload.totalModules) {
      setCourseStatus('ready');
    }
  }, [courseId]);

  const handleCourseUpdate = useCallback((payload) => {
    if (!payload) return;
    if (payload.courseId && payload.courseId !== courseId) return;
    if (payload.status) {
      setCourseStatus(payload.status);
    }
    if (payload.title) {
      setCourseName(payload.title);
    }
  }, [courseId]);

  // Handle node content updates (for shared courses when content is regenerated)
  const handleNodeUpdate = useCallback((payload) => {
    if (!payload) return;
    if (payload.courseId && payload.courseId !== courseId) return;
    // Refresh study plan to get updated node content
    refetchStudyPlanRef.current?.()?.catch?.(() => {});
  }, [courseId]);

  // User-level realtime updates (for personal course changes)
  useRealtimeUpdates(userId, {
    onModuleComplete: handleModuleComplete,
    onCourseUpdate: handleCourseUpdate,
  });

  // Course-level realtime updates (for shared courses - all users see updates)
  useCourseRealtimeUpdates(courseId, {
    onModuleComplete: handleModuleComplete,
    onCourseUpdate: handleCourseUpdate,
    onNodeUpdate: handleNodeUpdate,
  });

  // Redirect web users to download page (backup guard - middleware handles this primarily)
  useEffect(() => {
    if (forceDownloadRedirect && !isDesktopApp()) {
      router.replace('/download');
    }
  }, [forceDownloadRedirect, router]);

  useEffect(() => {
    if (isDeepStudyCourse) {
      setIsTimerControlsOpen(false);
    }
  }, [isDeepStudyCourse]);

  useEffect(() => {
    sharedChatStateRef.current = sharedChatState;
  }, [sharedChatState]);

  // Tab State
  const [tabs, setTabs] = useState(() => {
    const initialChatId = sharedChatState?.currentChatId || sharedChatState?.chats?.[0]?.id || null;
    return [
      { id: 'tab-1', type: 'course', title: 'Course Content', activeChatId: initialChatId, selectedLessonId: null, selectedContentType: null }
    ];
  });
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [hasHydratedTabs, setHasHydratedTabs] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobileView(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!mounted) return;

        if (user) {
          setUserId(user.id);
          setIsAnonymousUser(Boolean(user.is_anonymous));
          return;
        }

        setError("No user session found.");
        setLoading(false);
      } catch (e) {
        if (!mounted) return;
        setError("Failed to load user.");
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [courseId]);

  // Show blurred course gate immediately when anonymous user accesses course from onboarding
  useEffect(() => {
    if (!courseId) return;
    if (!isAnonymousUser) return;
    const gateCourseId = getOnboardingGateCourseId();
    if (!gateCourseId || gateCourseId !== courseId) return;
    // Show gate immediately for the blurred experience
    setShowAccountGate(true);
  }, [courseId, isAnonymousUser]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user || null;
        if (!user) return;
        setUserId(user.id);
        const anon = Boolean(user.is_anonymous);
        setIsAnonymousUser(anon);
        if (!anon) {
          setShowAccountGate(false);
          const gateCourseId = getOnboardingGateCourseId();
          clearOnboardingGateCourseId();
          if (!transferAttemptedRef.current) {
            transferAttemptedRef.current = true;
            if (gateCourseId && gateCourseId === courseId) {
              setTransferPending(true);
              setLoading(true);
            }
            try {
              await transferAnonData(null, courseId);
              setTransferPending(false);
              if (gateCourseId && gateCourseId === courseId) {
                await refetchStudyPlan();
                setLoading(false);
              }
            } catch (transferError) {
              console.error("Failed to transfer anonymous data:", transferError);
              setTransferPending(false);
              if (gateCourseId && gateCourseId === courseId) {
                setLoading(false);
              }
            }
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId || isAnonymousUser) return;
    if (transferAttemptedRef.current) return;
    const gateCourseId = getOnboardingGateCourseId();
    if (!gateCourseId || gateCourseId !== courseId) return;
    transferAttemptedRef.current = true;
    clearOnboardingGateCourseId();
    setTransferPending(true);
    setLoading(true);
    void transferAnonData(null, courseId)
      .then(async () => {
        setTransferPending(false);
        await refetchStudyPlan();
        setLoading(false);
      })
      .catch((transferError) => {
        console.error("Failed to transfer anonymous data:", transferError);
        setTransferPending(false);
        setLoading(false);
      });
  }, [userId, isAnonymousUser, courseId]);

  // Persist tabs for this course/user
  useEffect(() => {
    if (!userId || !courseId || !hasHydratedTabs) return;
    if (typeof window === 'undefined') return;

    try {
      const key = getCourseTabsStorageKey(userId, courseId);
      const payload = {
        tabs: tabs.map((tab) => ({
          id: tab.id,
          type: tab.type,
          title: tab.title,
          activeChatId: tab.activeChatId ?? null,
          selectedLessonId: tab.selectedLessonId ?? null,
          selectedContentType: tab.selectedContentType ?? null,
          conversationId: tab.conversationId ?? null,
          postId: tab.postId ?? null,
        })),
        activeTabId,
      };
      window.localStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to persist course tabs:', e);
    }
  }, [tabs, activeTabId, userId, courseId, hasHydratedTabs]);

  // Countdown timer effect
  useEffect(() => {
    if (isDeepStudyCourse || isTimerPaused || secondsRemaining === null || secondsRemaining <= 0) return;

    const intervalId = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev === null || prev <= 1) return 0;
        return Math.max(0, prev - 1);
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isDeepStudyCourse, isTimerPaused, secondsRemaining]);

  // Show timer expired modal when timer hits 0
  const prevSecondsRef = useRef(secondsRemaining);
  useEffect(() => {
    // Only show modal if timer transitioned from positive to 0 (not on initial load)
    if (
      !isDeepStudyCourse &&
      prevSecondsRef.current !== null &&
      prevSecondsRef.current > 0 &&
      secondsRemaining === 0 &&
      !isTimerPaused
    ) {
      setIsTimerExpiredModalOpen(true);
    }
    prevSecondsRef.current = secondsRemaining;
  }, [isDeepStudyCourse, secondsRemaining, isTimerPaused]);

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
        await authFetch(`/api/courses/${courseId}/settings`, {
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
      
      const payload = {
        userId,
        seconds_to_complete: secondsRemainingRef.current
      };
      
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(`/api/courses/${courseId}/settings`, blob);
    };

    const intervalId = setInterval(saveProgress, 5 * 60 * 1000);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [userId, courseId, initialSeconds]);

  useEffect(() => {
    if (!userId || !courseId) return;
    if (transferPending) return;
    let aborted = false;
    setLoading(true);
    setError("");
    setHasHydratedTabs(false);
    (async () => {
      try {
        const url = `/api/courses/${encodeURIComponent(courseId)}/plan`;
        const res = await authFetch(url);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Request failed: ${res.status}`);
        }
        const json = await res.json();
        if (aborted) return;
        const planPayload = json;

        const planMode = normalizeCourseMode(
          planPayload?.mode || planPayload?.course_mode || planPayload?.study_mode || planPayload?.studyMode
        );
        if (planMode) {
          setCourseMode(planMode);
        }

        const isDeepCourse = planMode === "deep";
        setHasHiddenContent(isDeepCourse ? false : planPayload.has_hidden_content === true);
        if (isDeepCourse) {
          setSecondsRemaining(MAX_DEEP_STUDY_SECONDS);
          setInitialSeconds(MAX_DEEP_STUDY_SECONDS);
        }

        const unlocked = unlockStudyPlan(planPayload);
        const readyModules = Array.isArray(planPayload?.ready_modules)
          ? Array.from(new Set(planPayload.ready_modules))
          : [];
        setReadyModuleRefs(readyModules);
        const modules = Array.isArray(unlocked?.modules) ? unlocked.modules : [];
        const lessonList = modules
          .filter((module) => !module.is_practice_exam_module)
          .flatMap((module) => module.lessons || []);
        const fallbackLessons = lessonList.length > 0
          ? lessonList
          : modules.flatMap((module) => module.lessons || []);
        const firstLesson = fallbackLessons[0] || null;
        const defaultLessonId = firstLesson?.id || null;
        const defaultContentType = firstLesson ? "reading" : null;
        setStudyPlan(unlocked);

        let hydratedTabs = [];
        let resolvedActiveId = "tab-1";

        if (typeof window === "undefined") {
          hydratedTabs = [{
            id: "tab-1",
            type: "course",
            title: "Course Content",
            activeChatId: initialChatIdRef.current,
            selectedLessonId: defaultLessonId,
            selectedContentType: defaultContentType,
          }];
          resolvedActiveId = hydratedTabs[0].id;
        } else {
          try {
            const key = getCourseTabsStorageKey(userId, courseId);
            const raw = window.localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) : null;
            const storedTabs = Array.isArray(parsed?.tabs) ? parsed.tabs : [];
            const seenIds = new Set();

            hydratedTabs = storedTabs.reduce((acc, tab, idx) => {
              if (!tab || typeof tab !== "object") return acc;
              const validTypes = ["course", "chat", "discussion", "messages"];
              const type = validTypes.includes(tab.type) ? tab.type : "course";
              let id = typeof tab.id === "string" && tab.id.trim() ? tab.id : `tab-restored-${idx}`;
              if (seenIds.has(id)) {
                id = `${id}-${idx}`;
              }
              seenIds.add(id);
              const getDefaultTitle = (tabType) => {
                switch (tabType) {
                  case "course": return "Course Content";
                  case "chat": return "Chat";
                  case "discussion": return "Discussion";
                  case "messages": return "Messages";
                  default: return "Tab";
                }
              };
              const title = typeof tab.title === "string" && tab.title.trim()
                ? tab.title
                : getDefaultTitle(type);
              const activeChatId = typeof tab.activeChatId === "string"
                ? tab.activeChatId
                : (type === "course" ? initialChatIdRef.current : null);
              const selectedLessonId = typeof tab.selectedLessonId === "string" ? tab.selectedLessonId : null;
              const selectedContentType = typeof tab.selectedContentType === "string" ? tab.selectedContentType : null;
              const conversationId = typeof tab.conversationId === "string" ? tab.conversationId : null;
              const postId = typeof tab.postId === "string" ? tab.postId : null;
              acc.push({ id, type, title, activeChatId, selectedLessonId, selectedContentType, conversationId, postId });
              return acc;
            }, []);

            const hasCachedTabs = hydratedTabs.length > 0;

            if (!hydratedTabs.some((tab) => tab.type === "course")) {
              let defaultId = "tab-1";
              if (seenIds.has(defaultId)) {
                defaultId = `tab-${Date.now()}`;
              }
              hydratedTabs.unshift({
                id: defaultId,
                type: "course",
                title: "Course Content",
                activeChatId: initialChatIdRef.current,
                selectedLessonId: hasCachedTabs ? null : defaultLessonId,
                selectedContentType: hasCachedTabs ? null : defaultContentType,
              });
            }

            const desiredActiveId = typeof parsed?.activeTabId === "string" ? parsed.activeTabId : null;
            resolvedActiveId = hydratedTabs.find((tab) => tab.id === desiredActiveId)?.id
              || hydratedTabs[0]?.id
              || "tab-1";
          } catch (e) {
            console.error("Failed to restore course tabs:", e);
            hydratedTabs = [{
              id: "tab-1",
              type: "course",
              title: "Course Content",
              activeChatId: initialChatIdRef.current,
              selectedLessonId: defaultLessonId,
              selectedContentType: defaultContentType,
            }];
            resolvedActiveId = hydratedTabs[0].id;
          }
        }

        setTabs(hydratedTabs);
        setActiveTabId(resolvedActiveId);
        setHasHydratedTabs(true);

        void (async () => {
          try {
            const courseMetaUrl = `/api/courses`;
            const courseMetaRes = await authFetch(courseMetaUrl);
            if (!courseMetaRes.ok || aborted) return;
            const body = await courseMetaRes.json();
            const courses = Array.isArray(body?.courses) ? body.courses : [];
            const courseMeta = courses.find((course) => course.id === courseId);

            if (courseMeta) {
              const title = courseMeta.title || courseMeta.course_title || courseMeta.name || courseMeta.courseName;
              if (title) setCourseName(title);
              if (courseMeta.status) setCourseStatus(courseMeta.status);

              const metaMode = normalizeCourseMode(
                courseMeta.mode || courseMeta.course_mode || courseMeta.study_mode || courseMeta.studyMode
              );
              if (metaMode && !planMode) {
                setCourseMode(metaMode);
              }
              if (metaMode === "deep") {
                setSecondsRemaining(MAX_DEEP_STUDY_SECONDS);
                setInitialSeconds(MAX_DEEP_STUDY_SECONDS);
                if (!planMode) {
                  setHasHiddenContent(false);
                }
              } else if (typeof courseMeta.seconds_to_complete === "number") {
                setSecondsRemaining(courseMeta.seconds_to_complete);
                setInitialSeconds(courseMeta.seconds_to_complete);
              }
            }
          } catch (e) {
            console.error("Failed to load course metadata:", e);
          }
        })();
      } catch (e) {
        if (aborted) return;
        setError(e?.message || "Failed to load study plan.");
      } finally {
        if (!aborted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      aborted = true;
    };
  }, [userId, courseId, transferPending]);

  const refetchStudyPlan = useCallback(async () => {
    if (!userId || !courseId) return;
    try {
      const url = `/api/courses/${encodeURIComponent(courseId)}/plan`;
      const res = await authFetch(url);
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }
      const json = await res.json();
      const planPayload = json;
      if (Array.isArray(planPayload?.ready_modules)) {
        setReadyModuleRefs(Array.from(new Set(planPayload.ready_modules)));
      }

      const planMode = normalizeCourseMode(
        planPayload?.mode || planPayload?.course_mode || planPayload?.study_mode || planPayload?.studyMode
      );
      if (planMode) {
        setCourseMode(planMode);
      }
      const isDeepCourse = planMode === "deep" || courseMode === "deep";
      setHasHiddenContent(isDeepCourse ? false : planPayload.has_hidden_content === true);
      if (isDeepCourse) {
        setSecondsRemaining(MAX_DEEP_STUDY_SECONDS);
        setInitialSeconds(MAX_DEEP_STUDY_SECONDS);
      }
      
      const newPlan = unlockStudyPlan(planPayload);
      
      // Smart merge: preserve current lesson visibility when time decreases
      setStudyPlan((prevPlan) => {
        if (!prevPlan || !newPlan) return newPlan;
        
        const currentLessonId = currentLessonIdRef.current;
        if (!currentLessonId) return newPlan;
        
        // Check if current lesson exists in new plan
        const lessonInNewPlan = newPlan.modules?.some(m => 
          m.lessons?.some(l => l.id === currentLessonId)
        );
        
        if (lessonInNewPlan) {
          // Current lesson is in new plan, safe to use new plan directly
          return newPlan;
        }
        
        // Current lesson was removed - find it in old plan and ensure it stays visible
        let currentLessonData = null;
        let currentModuleData = null;
        for (const module of (prevPlan.modules || [])) {
          const lesson = module.lessons?.find(l => l.id === currentLessonId);
          if (lesson) {
            currentLessonData = lesson;
            currentModuleData = module;
            break;
          }
        }
        
        if (!currentLessonData || !currentModuleData) {
          // Couldn't find current lesson, just use new plan
          return newPlan;
        }
        
        // Merge: add the current lesson's module back if needed
        const newModules = [...(newPlan.modules || [])];
        const existingModuleIdx = newModules.findIndex(m => m.title === currentModuleData.title);
        
        if (existingModuleIdx >= 0) {
          // Module exists, add the lesson if not present
          const existingModule = newModules[existingModuleIdx];
          const lessonExists = existingModule.lessons?.some(l => l.id === currentLessonId);
          if (!lessonExists) {
            newModules[existingModuleIdx] = {
              ...existingModule,
              lessons: [...(existingModule.lessons || []), currentLessonData]
            };
          }
        } else {
          // Module doesn't exist, add it with just the current lesson
          newModules.push({
            ...currentModuleData,
            lessons: [currentLessonData]
          });
        }
        
        return { ...newPlan, modules: newModules };
      });
      return newPlan;
    } catch (e) {
      console.error('Failed to refetch study plan:', e);
    }
  }, [userId, courseId, courseMode]);

  useEffect(() => {
    refetchStudyPlanRef.current = refetchStudyPlan;
  }, [refetchStudyPlan]);

  const isGeneratingCourse = courseStatus === 'pending' || courseStatus === 'generating';
  const visibleModuleRefs = isGeneratingCourse ? readyModuleRefs : null;
  const hasTourLessons = useMemo(() => {
    return Boolean(studyPlan?.modules?.some((module) => Array.isArray(module.lessons) && module.lessons.length > 0));
  }, [studyPlan]);
  const shouldStartFeaturesTour =
    Boolean(userSettings && !userSettings.tour_completed && userSettings.tour_phase === "course-features");

  const minLessonSeconds = useMemo(() => {
    if (!studyPlan?.modules) return 0;
    let minMinutes = null;
    for (const module of studyPlan.modules) {
      if (module.is_practice_exam_module) continue;
      for (const lesson of (module.lessons || [])) {
        const duration = typeof lesson.duration === "number" ? lesson.duration : null;
        if (!duration || duration <= 0) continue;
        minMinutes = minMinutes === null ? duration : Math.min(minMinutes, duration);
      }
    }
    return minMinutes === null ? 0 : Math.ceil(minMinutes * 60);
  }, [studyPlan]);

  useEffect(() => {
    if (isGeneratingCourse) {
      setIsTimerControlsOpen(false);
    }
  }, [isGeneratingCourse]);

  useEffect(() => {
    if (!shouldStartFeaturesTour || !hasTourLessons || isTourActive || hasTourPrompted) {
      setIsTourPromptActive(false);
      return;
    }
    if (isTourPromptActive) return;
    const timer = setTimeout(() => {
      setIsTourPromptActive(true);
    }, 20000);
    return () => clearTimeout(timer);
  }, [shouldStartFeaturesTour, hasTourLessons, isTourActive, hasTourPrompted, isTourPromptActive]);

  const handleBeginTour = useCallback(() => {
    if (!shouldStartFeaturesTour) return;
    setIsTourPromptActive(false);
    setHasTourPrompted(true);
    if (!isTourActive || currentTour !== "course-features") {
      startTour("course-features");
    }
  }, [shouldStartFeaturesTour, isTourActive, currentTour, startTour]);



  const handleTimerUpdate = useCallback(async (newSeconds) => {
    if (!userId || !courseId) return;
    if (isGeneratingCourse) return;
    const nextSeconds = isDeepStudyCourse ? MAX_DEEP_STUDY_SECONDS : newSeconds;
    const safeSeconds = (!isDeepStudyCourse && minLessonSeconds > 0)
      ? Math.max(nextSeconds, minLessonSeconds)
      : nextSeconds;
    setSecondsRemaining(safeSeconds);
    try {
      await authFetch(`/api/courses/${courseId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          seconds_to_complete: safeSeconds
        })
      });
      // Refresh study plan to add/remove modules based on new time
      await refetchStudyPlan();
    } catch (e) {
      console.error('Failed to update timer:', e);
    }
  }, [userId, courseId, refetchStudyPlan, isDeepStudyCourse, isGeneratingCourse, minLessonSeconds]);

  const toggleTimerPause = useCallback(() => {
    setIsTimerPaused((prev) => !prev);
  }, []);

  const handleAddTimeFromModal = useCallback(async (additionalSeconds) => {
    const newSeconds = (secondsRemaining || 0) + additionalSeconds;
    setIsTimerExpiredModalOpen(false);
    setIsHiddenContentModalOpen(false);
    setHasHiddenContent(false);
    await handleTimerUpdate(newSeconds);
  }, [secondsRemaining, handleTimerUpdate]);

  // Callback for CourseTabContent to report current selected lesson
  const handleCurrentLessonChange = useCallback((lessonId) => {
    currentLessonIdRef.current = lessonId;
  }, []);

  const handleTabTitleChange = useCallback((tabId, nextTitle) => {
    if (!nextTitle) return;
    setTabs((prev) => {
      // Check if update is actually needed to prevent unnecessary re-renders
      const existingTab = prev.find(t => t.id === tabId);
      if (!existingTab || existingTab.title === nextTitle) return prev;
      return prev.map((tab) => {
        if (tab.id !== tabId) return tab;
        return { ...tab, title: nextTitle };
      });
    });
  }, []);

  // Create stable callbacks for each tab's title change handler
  const tabTitleChangeHandlers = useRef({});
  const getTabTitleChangeHandler = useCallback((tabId) => {
    if (!tabTitleChangeHandlers.current[tabId]) {
      tabTitleChangeHandlers.current[tabId] = (title) => handleTabTitleChange(tabId, title);
    }
    return tabTitleChangeHandlers.current[tabId];
  }, [handleTabTitleChange]);

  // Track per-tab lesson/content selection for restore
  const tabViewStateChangeHandlers = useRef({});
  const getTabViewStateChangeHandler = useCallback((tabId) => {
    if (!tabViewStateChangeHandlers.current[tabId]) {
      tabViewStateChangeHandlers.current[tabId] = (viewState) => {
        const lessonId = viewState?.lessonId || null;
        const contentType = viewState?.contentType || null;
        if (!lessonId) return;
        setTabs((prev) => {
          let mutated = false;
          const next = prev.map((tab) => {
            if (tab.id !== tabId) return tab;
            if (tab.selectedLessonId === lessonId && tab.selectedContentType === contentType) return tab;
            mutated = true;
            return { ...tab, selectedLessonId: lessonId, selectedContentType: contentType };
          });
          return mutated ? next : prev;
        });
      };
    }
    return tabViewStateChangeHandlers.current[tabId];
  }, []);

  const updateTabActiveChatId = useCallback((tabId, chatId) => {
    if (!tabId) return;
    const chatNameLookup = new Map((sharedChatStateRef.current?.chats || []).map((chat) => [chat.id, chat.name || "Chat"]));
    setTabs((prev) => {
      let mutated = false;
      const next = prev.map((tab) => {
        if (tab.id !== tabId) return tab;
        let nextTab = tab;
        if (tab.activeChatId !== chatId) {
          nextTab = nextTab === tab ? { ...tab } : nextTab;
          nextTab.activeChatId = chatId;
        }
        if (tab.type === 'chat' && chatId) {
          const desiredTitle = chatNameLookup.get(chatId);
          if (desiredTitle && nextTab.title !== desiredTitle) {
            nextTab = nextTab === tab ? { ...tab } : nextTab;
            nextTab.title = desiredTitle;
          }
        }
        if (nextTab !== tab) {
          mutated = true;
        }
        return nextTab;
      });
      return mutated ? next : prev;
    });
  }, []);

  const tabActiveChatChangeHandlers = useRef({});
  const getTabActiveChatChangeHandler = useCallback((tabId) => {
    if (!tabActiveChatChangeHandlers.current[tabId]) {
      tabActiveChatChangeHandlers.current[tabId] = (chatId) => updateTabActiveChatId(tabId, chatId);
    }
    return tabActiveChatChangeHandlers.current[tabId];
  }, [updateTabActiveChatId]);

  const courseTabs = useMemo(() => tabs.filter((tab) => tab.type === 'course'), [tabs]);
  const effectiveActiveTabId = useMemo(() => {
    if (!isMobileView) return activeTabId;
    const activeCourseTab = courseTabs.find((tab) => tab.id === activeTabId);
    return activeCourseTab?.id || courseTabs[0]?.id || activeTabId;
  }, [isMobileView, activeTabId, courseTabs]);
  const renderedTabs = useMemo(() => {
    if (!isMobileView) return tabs;
    if (courseTabs.length === 0) {
      return tabs.length > 0 ? [tabs[0]] : [];
    }
    return courseTabs.filter((tab) => tab.id === effectiveActiveTabId);
  }, [isMobileView, tabs, courseTabs, effectiveActiveTabId]);
  const activeRenderedTab = useMemo(
    () => tabs.find((tab) => tab.id === effectiveActiveTabId),
    [tabs, effectiveActiveTabId]
  );
  const activeTabType = activeRenderedTab?.type;
  const isMessagesTabActive = activeTabType === "messages";
  const hasMessagesTab = useMemo(
    () => tabs.some((tab) => tab.type === "messages"),
    [tabs]
  );
  const shouldShowTourPrompt = Boolean(
    isTourPromptActive && shouldStartFeaturesTour && !isTourActive
  );
  const shouldFlashMessagesTab = Boolean(
    shouldShowTourPrompt && !isMessagesTabActive
  );
  const shouldFlashMessagesButton = Boolean(
    shouldFlashMessagesTab && !hasMessagesTab
  );
  const shouldBlurContent = Boolean(
    shouldShowTourPrompt && !isMessagesTabActive
  );

  const handleSharedChatStateChange = useCallback((state) => {
    if (!state) return;
    setSharedChatState((prev) => mergeChatStates(prev, state));
    if (!Array.isArray(state.chats) || state.chats.length === 0) return;
    const chatNameLookup = new Map(state.chats.map((chat) => [chat.id, chat.name || "Chat"]));
    setTabs((prev) => {
      let mutated = false;
      const next = prev.map((tab) => {
        if (tab.type !== 'chat' || !tab.activeChatId) return tab;
        const desiredTitle = chatNameLookup.get(tab.activeChatId);
        if (!desiredTitle || tab.title === desiredTitle) return tab;
        mutated = true;
        return { ...tab, title: desiredTitle };
      });
      return mutated ? next : prev;
    });
  }, []);

  const addTab = (type, options = {}) => {
    if (isMobileView) {
      if (type === 'chat') {
        const targetCourseTab = courseTabs[0];
        if (targetCourseTab) {
          const latestSharedState = options.chatState || sharedChatStateRef.current;
          const fallbackChatId = latestSharedState?.currentChatId || latestSharedState?.chats?.[0]?.id || null;
          setChatOpenRequest({
            tabId: targetCourseTab.id,
            timestamp: Date.now(),
            state: latestSharedState,
            chatId: options.chatId || fallbackChatId,
          });
        }
      }
      return null;
    }

    // For discussion and messages tabs, focus existing tab if one exists
    if (type === 'discussion' || type === 'messages') {
      const existingTab = tabs.find(tab => tab.type === type);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        return existingTab.id;
      }
    }

    const newId = options.id || `tab-${Date.now()}`;
    const getDefaultTitle = () => {
      switch (type) {
        case 'course': return 'Course Content';
        case 'chat': return 'Chat';
        case 'discussion': return 'Discussion';
        case 'messages': return 'Messages';
        default: return 'Tab';
      }
    };
    const defaultTitle = options.title || getDefaultTitle();
    const baseTab = { id: newId, type, title: defaultTitle, selectedLessonId: null, selectedContentType: null };

    if (type === 'chat') {
      let targetChatId = options.chatId || null;
      let inferredTitle = options.title || null;
      if (!targetChatId) {
        const newChat = createBlankChat();
        targetChatId = newChat.id;
        inferredTitle = inferredTitle || newChat.name;
        setSharedChatState((prev) => {
          const merged = mergeChatStates(prev, prev);
          const prevChats = Array.isArray(merged?.chats) ? merged.chats : [];
          return {
            ...merged,
            chats: [newChat, ...prevChats],
            currentChatId: newChat.id,
            drafts: {
              ...(merged?.drafts || {}),
              [newChat.id]: merged?.drafts?.[newChat.id] || { input: "", attachedFiles: [] },
            },
          };
        });
      } else if (!inferredTitle) {
        const existingChat = sharedChatState?.chats?.find((chat) => chat.id === targetChatId);
        inferredTitle = existingChat?.name || null;
      }
      const nextTab = { ...baseTab, title: inferredTitle || defaultTitle, activeChatId: targetChatId };
      setTabs((prev) => [...prev, nextTab]);
    } else if (type === 'discussion' || type === 'messages') {
      // Community tabs don't need special state management
      const nextTab = {
        ...baseTab,
        conversationId: options.conversationId || null,
        postId: options.postId || null,
      };
      setTabs((prev) => [...prev, nextTab]);
    } else {
      const fallbackChatId = options.chatId || sharedChatState?.currentChatId || sharedChatState?.chats?.[0]?.id || null;
      const nextTab = { ...baseTab, activeChatId: fallbackChatId };
      setTabs((prev) => [...prev, nextTab]);
    }

    setActiveTabId(newId);
    return newId;
  };

  useEffect(() => {
    if (!searchParams) return;
    const tabParam = searchParams.get("tab");
    if (!tabParam) return;

    const conversationId = searchParams.get("conversation");
    const postId = searchParams.get("post");

    if (!["discussion", "messages"].includes(tabParam)) return;

    const existingTab = tabs.find((tab) => tab.type === tabParam);
    if (existingTab) {
      if (tabParam === "messages" && conversationId && existingTab.conversationId !== conversationId) {
        setTabs((prev) => prev.map((tab) => (
          tab.id === existingTab.id ? { ...tab, conversationId } : tab
        )));
      }
      if (tabParam === "discussion" && postId && existingTab.postId !== postId) {
        setTabs((prev) => prev.map((tab) => (
          tab.id === existingTab.id ? { ...tab, postId } : tab
        )));
      }
      setActiveTabId(existingTab.id);
      return;
    }

    addTab(tabParam, { conversationId, postId });
  }, [searchParams, tabs]);

  const handleOpenChatTab = (payload) => {
    let mergedState = sharedChatStateRef.current;
    if (payload?.chatState) {
      mergedState = mergeChatStates(sharedChatStateRef.current, payload.chatState);
      sharedChatStateRef.current = mergedState;
      setSharedChatState(mergedState);
    }
    addTab('chat', {
      title: payload?.title || 'Chat',
      chatId: payload?.chatId,
      chatState: mergedState,
    });
  };

  const closeTab = (e, id) => {
    if (e) e.stopPropagation();
    const tabToClose = tabs.find(t => t.id === id);
    
    // Ensure at least one course tab remains
    if (tabToClose?.type === 'course') {
      const courseTabs = tabs.filter(t => t.type === 'course');
      if (courseTabs.length <= 1) {
        // Maybe show a toast or just ignore
        return;
      }
    }

    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const handleDragOver = (e) => {
    if (e.dataTransfer.types.includes('application/x-chat-tab')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (e) => {
    // Handle dropping a floating chat to create a new tab
    if (e.dataTransfer.types.includes('application/x-chat-tab')) {
      e.preventDefault();
      let payload = null;
      const rawData = e.dataTransfer.getData('application/x-chat-tab-data');
      if (rawData) {
        try {
          payload = JSON.parse(rawData);
        } catch (_) {
          payload = null;
        }
      }
      let mergedState = sharedChatStateRef.current;
      if (payload?.chatState) {
        mergedState = mergeChatStates(sharedChatStateRef.current, payload.chatState);
        sharedChatStateRef.current = mergedState;
        setSharedChatState(mergedState);
      }
      addTab('chat', {
        title: payload?.title,
        chatId: payload?.chatId,
        chatState: mergedState,
      });
      return;
    }
  };

  const handleChatTabReturn = (tabId) => {
    const returningTab = tabs.find((t) => t.id === tabId);
    const isChatTab = returningTab?.type === 'chat';
    const preferredCourseTab = tabs.find((t) => t.id === activeTabId && t.type === 'course')
      || tabs.find((t) => t.type === 'course');
    closeTab(null, tabId);
    if (!isChatTab || !preferredCourseTab) return;
    setChatOpenRequest({
      tabId: preferredCourseTab.id,
      timestamp: Date.now(),
      state: sharedChatState,
      chatId: returningTab?.activeChatId,
    });
  };

  const [draggingTabId, setDraggingTabId] = useState(null);
  const [isDraggingToDock, setIsDraggingToDock] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isExternalChatHovering, setIsExternalChatHovering] = useState(false);
  const [isTourPromptActive, setIsTourPromptActive] = useState(false);
  const [hasTourPrompted, setHasTourPrompted] = useState(false);

  const handleTabBarDragOver = (e) => {
    handleDragOver(e);
    if (e.dataTransfer.types.includes('application/x-chat-tab')) {
      setIsExternalChatHovering(true);
    }
  };

  const handleTabBarDragLeave = () => {
    setIsExternalChatHovering(false);
  };

  const handleTabBarDrop = (e) => {
    setIsExternalChatHovering(false);
    handleDrop(e);
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--background)] text-[var(--foreground)] overflow-hidden">
      {/* Tab Bar */}
      {!isMobileView && (
        <div 
          className={`flex items-center bg-[var(--surface-1)] border-b px-2 pt-2 gap-2 z-50 transition-all duration-200 overflow-visible ${
            isExternalChatHovering 
              ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-[inset_0_-2px_8px_rgba(123,163,122,0.2)]' 
              : 'border-[var(--border)]'
          }`}
          onDragOver={handleTabBarDragOver}
          onDragLeave={handleTabBarDragLeave}
          onDrop={handleTabBarDrop}
        >
          <Reorder.Group 
            axis="x" 
            values={tabs} 
            onReorder={setTabs}
            layoutScroll
            className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-none"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {tabs.map(tab => (
              <Reorder.Item
                key={tab.id}
                value={tab}
                layout
                layoutId={tab.id}
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ 
                  opacity: draggingTabId === tab.id && isDraggingToDock ? 0.6 : 1, 
                  scale: draggingTabId === tab.id && isDraggingToDock ? 0.85 : 1,
                  y: 0,
                  transition: { 
                    type: "spring", 
                    stiffness: 500, 
                    damping: 30,
                    mass: 0.8
                  }
                }}
                exit={{ 
                  opacity: 0, 
                  scale: 0.8, 
                  y: -10,
                  transition: { duration: 0.2, ease: "easeOut" }
                }}
                whileDrag={{ 
                  scale: isDraggingToDock ? 0.9 : 1.02,
                  boxShadow: isDraggingToDock 
                    ? "0 20px 40px rgba(0,0,0,0.3), 0 0 0 2px var(--primary)" 
                    : "0 10px 30px rgba(0,0,0,0.2)",
                  zIndex: 100, 
                  cursor: "grabbing",
                  rotate: isDraggingToDock ? [0, -2, 2, 0] : 0,
                  transition: { 
                    rotate: { repeat: Infinity, duration: 0.3 },
                    scale: { type: "spring", stiffness: 400, damping: 25 }
                  }
                }}
                dragTransition={{ 
                  bounceStiffness: 600, 
                  bounceDamping: 30 
                }}
                onDragStart={() => {
                  setDraggingTabId(tab.id);
                  setIsDraggingToDock(false);
                }}
                onDrag={(e, info) => {
                  setDragPosition({ x: info.point.x, y: info.point.y });
                  // Check if dragging down into dock zone (below tab bar)
                  // Only show dock indicator if the currently active tab is a course tab
                  const currentActiveTab = tabs.find(t => t.id === activeTabId);
                  const canDock = currentActiveTab && currentActiveTab.type === 'course';
                  if (tab.type === 'chat' && info.point.y > 80 && canDock) {
                    setIsDraggingToDock(true);
                  } else {
                    setIsDraggingToDock(false);
                  }
                }}
                onDragEnd={(e, info) => {
                  const wasDockingAttempt = isDraggingToDock;
                  setDraggingTabId(null);
                  setIsDraggingToDock(false);
                  
                  // Docking Logic: Only if dragging a Chat Tab DOWN into the content area
                  if (tab.type === 'chat' && info.point.y > 80) {
                    // Get the currently active tab
                    const currentActiveTab = tabs.find(t => t.id === activeTabId);
                    
                    // Only dock if we are currently looking at a Course Tab
                    if (currentActiveTab && currentActiveTab.type === 'course') {
                      closeTab(null, tab.id);
                      // No need to switch tabs as we are already on the correct one
                      setChatOpenRequest({
                        tabId: currentActiveTab.id,
                        timestamp: Date.now(),
                        state: sharedChatState,
                        chatId: tab.activeChatId,
                      });
                    }
                  }
                }}
                onClick={() => setActiveTabId(tab.id)}
                className={`
                  group relative flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium cursor-grab active:cursor-grabbing min-w-[100px] max-w-[240px] flex-1 select-none overflow-hidden
                  ${activeTabId === tab.id 
                    ? "backdrop-blur-xl bg-[var(--primary)]/90 text-white" 
                    : "bg-[var(--surface-muted)] text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                  }
                  ${draggingTabId === tab.id ? "shadow-2xl" : ""}
                  ${tab.type === 'messages' && shouldFlashMessagesTab ? "ring-2 ring-[var(--primary)]/70 shadow-lg shadow-[var(--primary)]/30 animate-pulse" : ""}
                `}
                style={activeTabId === tab.id ? {
                  backgroundImage: 'linear-gradient(135deg, rgba(123, 163, 122, 0.95) 0%, rgba(100, 140, 100, 0.85) 50%, rgba(123, 163, 122, 0.9) 100%)',
                  boxShadow: '0 4px 16px rgba(123, 163, 122, 0.35), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderBottom: 'none'
                } : {}}
              >
                {/* Glass morphism overlay for active tab */}
                {activeTabId === tab.id && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/5 pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/10 pointer-events-none" />
                  </>
                )}
                
                {/* Tab Icon */}
                <motion.span
                  className="flex-shrink-0 relative z-10"
                  animate={{
                    rotate: draggingTabId === tab.id && isDraggingToDock ? [0, -10, 10, 0] : 0
                  }}
                  transition={{ repeat: Infinity, duration: 0.4 }}
                >
                  {tab.type === 'chat' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  )}
                  {tab.type === 'course' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  )}
                  {tab.type === 'discussion' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                  )}
                  {tab.type === 'messages' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )}
                </motion.span>
                
                <span className="truncate flex-1 relative z-10">{tab.title}</span>
                
                {/* Close Button */}
                {(tabs.length > 1 && (tab.type !== 'course' || tabs.filter(t => t.type === 'course').length > 1)) && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => closeTab(e, tab.id)}
                    className={`opacity-0 group-hover:opacity-100 p-0.5 rounded-full transition-all relative z-10 ${
                      activeTabId === tab.id 
                        ? "hover:bg-white/20" 
                        : "hover:bg-[var(--surface-muted)]"
                    }`}
                    title="Close tab"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
            
            {/* Add Tab Buttons */}
            <div className="flex items-center gap-1 px-2 flex-shrink-0">
              <button
                onClick={() => addTab('course')}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                title="New Course Tab"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              <button
                onClick={() => addTab('chat')}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                title="New Chat Tab"
                data-tour="chat-fab"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </button>
              <div className="w-px h-5 bg-[var(--border)]/50 mx-1" />
              <button
                onClick={() => addTab('discussion')}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                title="Discussion"
                data-tour="community-tab"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </button>
              <button
                onClick={() => addTab('messages')}
                className={`p-1.5 rounded-lg transition-colors ${
                  shouldFlashMessagesButton
                    ? "bg-[var(--primary)]/10 text-[var(--primary)] ring-2 ring-[var(--primary)]/60 shadow-lg shadow-[var(--primary)]/25 animate-pulse"
                    : "hover:bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:text-[var(--primary)]"
                }`}
                title="Messages"
                data-tour="messages-tab"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 relative overflow-hidden">
        {shouldBlurContent && (
          <div className="absolute inset-0 z-20 pointer-events-none backdrop-blur-sm bg-black/30" />
        )}
        {/* Dock Zone Indicator - appears when dragging chat tab down */}
        {!isMobileView && (
          <AnimatePresence>
            {isDraggingToDock && draggingTabId && tabs.find(t => t.id === draggingTabId)?.type === 'chat' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 z-50 pointer-events-none"
            >
              {/* Gradient overlay */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gradient-to-b from-[var(--primary)]/20 via-transparent to-transparent"
              />
              
              {/* Dock indicator at right edge */}
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  x: 0, 
                  scale: 1,
                  transition: { type: "spring", stiffness: 400, damping: 25 }
                }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3"
              >
                <motion.div 
                  animate={{ 
                    y: [0, -5, 0],
                    transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
                  }}
                  className="w-16 h-48 rounded-2xl border-2 border-dashed border-[var(--primary)] bg-[var(--primary)]/10 flex items-center justify-center"
                >
                  <svg className="w-8 h-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </motion.div>
                <motion.span 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm font-medium text-[var(--primary)] bg-[var(--surface-1)]/90 px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm"
                >
                  Drop to dock chat
                </motion.span>
              </motion.div>
            </motion.div>
          )}
          </AnimatePresence>
        )}

        {renderedTabs.map(tab => {
            const isTabActive = tab.id === effectiveActiveTabId;
            const renderTabContent = () => {
              switch (tab.type) {
                case 'course':
                  return (
                    <CourseTabContent
                      isActive={isTabActive}
                      courseId={courseId}
                      userId={userId}
                      courseName={courseName}
                      studyPlan={studyPlan}
                      loading={loading}
                      error={error}
                      refetchStudyPlan={refetchStudyPlan}
                      secondsRemaining={secondsRemaining}
                      handleTimerUpdate={handleTimerUpdate}
                      isTimerPaused={isTimerPaused}
                      onPauseToggle={toggleTimerPause}
                      initialLessonId={tab.selectedLessonId}
                      initialContentType={tab.selectedContentType}
                      onViewStateChange={getTabViewStateChangeHandler(tab.id)}
                      onTabTitleChange={getTabTitleChangeHandler(tab.id)}
                      onCurrentLessonChange={handleCurrentLessonChange}
                      isSettingsModalOpen={isSettingsModalOpen}
                      setIsSettingsModalOpen={setIsSettingsModalOpen}
                      isTimerControlsOpen={isTimerControlsOpen}
                      setIsTimerControlsOpen={setIsTimerControlsOpen}
                      isEditCourseModalOpen={isEditCourseModalOpen}
                      setIsEditCourseModalOpen={setIsEditCourseModalOpen}
                      shouldOpenPracticeExamModal={shouldOpenPracticeExamModal}
                      onPracticeExamModalOpened={() => setShouldOpenPracticeExamModal(false)}
                      onOpenChatTab={handleOpenChatTab}
                      onOpenDiscussionTab={() => addTab('discussion')}
                      onOpenMessagesTab={() => addTab('messages')}
                      onChatTabReturn={handleChatTabReturn}
                      chatOpenRequest={chatOpenRequest && chatOpenRequest.tabId === tab.id ? chatOpenRequest : null}
                      onChatOpenRequestHandled={() => setChatOpenRequest(null)}
                      hasHiddenContent={hasHiddenContent}
                      onHiddenContentClick={() => setIsHiddenContentModalOpen(true)}
                      sharedChatState={sharedChatState}
                      onSharedChatStateChange={handleSharedChatStateChange}
                      activeChatId={tab.activeChatId}
                      onActiveChatIdChange={getTabActiveChatChangeHandler(tab.id)}
                      focusTimerRef={focusTimerRef}
                      focusTimerState={focusTimerState}
                      isDeepStudyCourse={isDeepStudyCourse}
                      isCourseGenerating={isGeneratingCourse}
                      readyModuleRefs={visibleModuleRefs}
                    />
                  );
                case 'chat':
                  return (
                    <ChatTabContent
                      isActive={isTabActive}
                      courseId={courseId}
                      courseName={courseName}
                      studyPlan={studyPlan}
                      onClose={() => closeTab(null, tab.id)}
                      sharedChatState={sharedChatState}
                      onSharedChatStateChange={handleSharedChatStateChange}
                      initialChatId={tab.activeChatId}
                      onActiveChatIdChange={getTabActiveChatChangeHandler(tab.id)}
                    />
                  );
                case 'discussion':
                  return (
                    <DiscussionTabContent
                      isActive={isTabActive}
                      courseId={courseId}
                      userId={userId}
                      onClose={() => closeTab(null, tab.id)}
                      onOpenMessagesTab={() => addTab('messages')}
                      initialPostId={tab.postId}
                    />
                  );
                case 'messages':
                  return (
                    <MessagesTabContent
                      isActive={isTabActive}
                      courseId={courseId}
                      userId={userId}
                      onClose={() => closeTab(null, tab.id)}
                      onOpenDiscussionTab={() => addTab('discussion')}
                      initialConversationId={tab.conversationId}
                      showBeginTour={shouldShowTourPrompt}
                      onBeginTour={handleBeginTour}
                    />
                  );
                default:
                  return null;
              }
            };
            return (
            <div
              key={tab.id}
              className="absolute inset-0 w-full h-full"
              style={{
                display: isTabActive ? 'block' : 'none',
                zIndex: isTabActive ? 10 : 0
              }}
            >
              {renderTabContent()}
            </div>
          );
          })}
      </div>

      {/* Global Modals */}
      {!isDeepStudyCourse && (
        <TimerControlsModal
          isOpen={isTimerControlsOpen}
          onClose={() => setIsTimerControlsOpen(false)}
          secondsRemaining={secondsRemaining}
          onTimerUpdate={handleTimerUpdate}
          minSeconds={minLessonSeconds}
          isCourseGenerating={isGeneratingCourse}
          isTimerPaused={isTimerPaused}
          onPauseToggle={toggleTimerPause}
          focusTimerRef={focusTimerRef}
          focusTimerState={focusTimerState}
        />
      )}

      <CourseSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentSeconds={secondsRemaining}
        onTimerUpdate={handleTimerUpdate}
        minSeconds={minLessonSeconds}
        isCourseGenerating={isGeneratingCourse}
        courseName={courseName}
        isTimerPaused={isTimerPaused}
        onPauseToggle={toggleTimerPause}
        focusTimerRef={focusTimerRef}
        focusTimerState={focusTimerState}
        isDeepStudyCourse={isDeepStudyCourse}
        onOpenModifyCourse={() => setIsEditCourseModalOpen(true)}
      />

      {/* PersonalTimer - always mounted to preserve focus timer state */}
      <div className="hidden">
        <PersonalTimer 
          ref={focusTimerRef}
          onStateChange={setFocusTimerState}
        />
      </div>

      <EditCourseModal
        isOpen={isEditCourseModalOpen}
        onClose={() => setIsEditCourseModalOpen(false)}
        courseId={courseId}
        userId={userId}
        courseName={courseName}
        studyPlan={studyPlan}
        onRefetch={refetchStudyPlan}
        onAddPracticeExam={() => setShouldOpenPracticeExamModal(true)}
      />

      <TimerExpiredModal
        isOpen={isTimerExpiredModalOpen}
        onClose={() => setIsTimerExpiredModalOpen(false)}
        onAddTime={handleAddTimeFromModal}
      />

      <TimerExpiredModal
        isOpen={isHiddenContentModalOpen}
        onClose={() => setIsHiddenContentModalOpen(false)}
        onAddTime={handleAddTimeFromModal}
        variant="hidden-content"
      />

      {/* Hidden Drag Preview Source (for setDragImage) */}
      <div 
        ref={dragPreviewRef}
        className="fixed top-[-1000px] left-[-1000px] w-px h-px opacity-0"
      />

      {/* Custom Drag Layer (Portal) - Only for Chat Tabs */}
      {/* Removed since Reorder handles the visual */}

      {/* Blurred Course Gate - shown when anonymous user accesses course from onboarding */}
      {showAccountGate && (
        <BlurredCourseGate
          courseId={courseId}
          courseName={courseName}
          studyPlan={studyPlan}
          onAuthSuccess={() => setShowAccountGate(false)}
        />
      )}
    </div>
  );
}
