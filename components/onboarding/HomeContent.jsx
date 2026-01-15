'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import * as api from '@/lib/onboarding';

const REFERRAL_STORAGE_KEY = "kogno_ref";
const REFERRAL_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ONBOARDING_SESSION_KEY = "kogno_onboarding_session_v1";
const ONBOARDING_SESSION_VERSION = 3;
const ONBOARDING_TAB_KEY = "kogno_onboarding_tab_id";
const CHAT_ENDED_MESSAGE = "This chat has ended.";
const LIMIT_REACHED_MESSAGE =
  "You have hit the limit on the number of attempts you can use this feature.";
const CREATE_ACCOUNT_ACCESS_COOKIE = "kogno_onboarding_create_account";
const INTRO_FALLBACKS = {
  reason: "I'm Kogno. What pulled you in today?",
  askUseful: "Got it. What are you hoping to get out of this?",
  explain:
    "Kogno turns your class into a tight study plan with lessons, practice, and exams in one place. List price is $100/month. If that's too much, say so.",
  price: "List price is $100/month. If that's too much, say so.",
  demo:
    "Here, let me prove to you why Kogno is worth it. I can generate a mini-course and teach you one lesson about any of your classes. Which college do you attend?",
};

const NEGOTIATION_STEPS = {
  NONE: 'NONE',
  INTRO_REASON: 'INTRO_REASON',
  INTRO_ASK_USEFUL: 'INTRO_ASK_USEFUL',
  NEGOTIATING: 'NEGOTIATING',
  AWAITING_CONFIRMATION: 'AWAITING_CONFIRMATION',
  PRICE_CONFIRMED: 'PRICE_CONFIRMED',
  ASK_COLLEGE: 'ASK_COLLEGE',
  ASK_COURSE: 'ASK_COURSE',
  WAIT_TOPICS: 'WAIT_TOPICS',
  TOPICS_READY: 'TOPICS_READY',
  SHOW_TOPICS: 'SHOW_TOPICS',
  GENERATING_PREVIEW: 'GENERATING_PREVIEW',
  PREVIEW_READY: 'PREVIEW_READY',
  PAYMENT_COMPLETE: 'PAYMENT_COMPLETE',
  DONE: 'DONE',
};

const STEP_ORDER = {
  [NEGOTIATION_STEPS.ASK_COLLEGE]: 1,
  [NEGOTIATION_STEPS.ASK_COURSE]: 2,
  [NEGOTIATION_STEPS.WAIT_TOPICS]: 2.5,
  [NEGOTIATION_STEPS.TOPICS_READY]: 2.8,
  [NEGOTIATION_STEPS.SHOW_TOPICS]: 3,
  [NEGOTIATION_STEPS.GENERATING_PREVIEW]: 3.5,
  [NEGOTIATION_STEPS.PREVIEW_READY]: 3.8,
};

const FALLBACKS = {
  negotiation: "List price is $100/month. If that's too much, say so.",
  task: 'Here, let me prove to you why Kogno is worth it. I can generate a mini-course and teach you one lesson about any of your classes. What college are you at?',
  topics: "I couldn't find topics for that. What's the course name again?",
  generation: 'I hit a snag starting the lesson. Want to pick a topic again?',
  status: "I couldn't check the lesson status. Want to pick a topic again?",
};


const BotMessage = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex justify-start mb-4"
  >
    <div className="bg-[var(--surface-1)] text-[var(--foreground)] rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%] shadow-sm border border-white/5 text-sm sm:text-base">
      {children}
    </div>
  </motion.div>
);

const UserMessage = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex justify-end mb-4"
  >
    <div className="bg-[var(--primary)] text-white rounded-2xl rounded-tr-none px-4 py-3 max-w-[85%] shadow-md text-sm sm:text-base">
      {children}
    </div>
  </motion.div>
);

export default function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [topics, setTopics] = useState([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [negotiationStep, setNegotiationStep] = useState(NEGOTIATION_STEPS.NONE);
  const [isJobRunning, setIsJobRunning] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [chatEnded, setChatEnded] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [showTopics, setShowTopics] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(10000);
  const [confirmedPrice, setConfirmedPrice] = useState(null);
  const [paymentLink, setPaymentLink] = useState(null);
  const [hasGeneratedPreview, setHasGeneratedPreview] = useState(false);
  const [previewCourseId, setPreviewCourseId] = useState(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);
  const onboardingSessionStartedRef = useRef(false);
  const sessionActiveRef = useRef(false);
  const restoredSessionRef = useRef(false);
  const chatEndedRef = useRef(false);
  const tabIdRef = useRef(null);
  const sessionIdRef = useRef(null);
  const sessionOwnerRef = useRef(false);
  const messagesRef = useRef([]);
  const queueRef = useRef([]);
  const pendingBotRef = useRef(false);
  const pendingNegotiationResponsesRef = useRef(new Map());
  const negotiationTurnCounterRef = useRef(0);
  const nextNegotiationTurnRef = useRef(1);
  const lastBotTypeRef = useRef(null);
  const limitReachedRef = useRef(false);
  const negotiationStepRef = useRef(NEGOTIATION_STEPS.NONE);
  const awaitingConfirmationRef = useRef(false);
  const dataRef = useRef({ collegeName: '', courseName: '', topic: '' });
  const topicsRef = useRef([]);
  const pendingRequestsRef = useRef(0);
  const taskRequestIdRef = useRef(0);
  const redirectUrlRef = useRef(null);
  const flowCompleteRef = useRef(false);
  const awaitingTaskRef = useRef(false);
  const deferredChatRef = useRef(null);
  const taskInFlightRef = useRef(false);
  const taskQueueRef = useRef([]);
  const lastTaskKeyRef = useRef('');
  const lastTaskTimestampRef = useRef(0);
  const topicsRequestInFlightRef = useRef(false);
  const introInFlightRef = useRef(false);
  const introQueueRef = useRef([]);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  const formatPrice = (cents) => {
    if (typeof cents !== 'number' || Number.isNaN(cents)) return '';
    const dollars = cents / 100;
    return dollars % 1 === 0 ? `$${dollars.toFixed(0)}` : `$${dollars.toFixed(2)}`;
  };

  const generateSessionId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `session-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  };

  const getTabId = () => {
    if (typeof window === 'undefined') return null;
    try {
      const existing = window.sessionStorage.getItem(ONBOARDING_TAB_KEY);
      if (existing) return existing;
      const created = generateSessionId();
      window.sessionStorage.setItem(ONBOARDING_TAB_KEY, created);
      return created;
    } catch (error) {
      console.warn('Unable to access sessionStorage for tab id:', error);
      return generateSessionId();
    }
  };

  const initTabId = () => {
    if (!tabIdRef.current) {
      tabIdRef.current = getTabId();
    }
    return tabIdRef.current;
  };

  const readStoredSession = () => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(ONBOARDING_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.version !== ONBOARDING_SESSION_VERSION) return null;
      return parsed;
    } catch (error) {
      console.warn('Unable to read onboarding session:', error);
      return null;
    }
  };

  const clearStoredSession = () => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(ONBOARDING_SESSION_KEY);
    } catch (error) {
      console.warn('Unable to clear onboarding session:', error);
    }
  };

  const persistSession = (overrides = {}) => {
    if (typeof window === 'undefined') return;
    if (!sessionActiveRef.current || !sessionOwnerRef.current) return;
    const tabId = initTabId();
    try {
      const payload = {
        version: ONBOARDING_SESSION_VERSION,
        sessionId: sessionIdRef.current,
        ownerTabId: tabId,
        status: overrides.status || (flowCompleteRef.current ? 'completed' : 'active'),
        updatedAt: Date.now(),
        anonUserId: api.getAnonUserId(),
        messages: messagesRef.current,
        negotiationStep: negotiationStepRef.current,
        data: dataRef.current,
        topics: topicsRef.current,
        showTopics: typeof overrides.showTopics === 'boolean' ? overrides.showTopics : showTopics,
        jobId: overrides.jobId ?? jobId,
        isJobRunning: overrides.isJobRunning ?? isJobRunning,
        redirectUrl: overrides.redirectUrl ?? redirectUrlRef.current,
        hasStarted: overrides.hasStarted ?? hasStarted,
        currentPrice: overrides.currentPrice ?? currentPrice,
        confirmedPrice: overrides.confirmedPrice ?? confirmedPrice,
        paymentLink: overrides.paymentLink ?? paymentLink,
        hasGeneratedPreview: overrides.hasGeneratedPreview ?? hasGeneratedPreview,
        previewCourseId: overrides.previewCourseId ?? previewCourseId,
        awaitingConfirmation: overrides.awaitingConfirmation ?? awaitingConfirmationRef.current,
      };
      window.localStorage.setItem(ONBOARDING_SESSION_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Unable to persist onboarding session:', error);
    }
  };

  const persistCourseContinuation = (status) => {
    if (!status || typeof status !== 'object') return;
    const lessonNode = Array.isArray(status.nodes) ? status.nodes[0] : null;
    const courseContext = status.courseContext || {};
    api.setOnboardingCourseSession({
      jobId,
      anonUserId: api.getAnonUserId(),
      previewCourseId: status.courseId || null,
      previewLessonId: status.lessonId || lessonNode?.id || null,
      previewLessonTitle: lessonNode?.title || dataRef.current.topic || null,
      courseName: courseContext.title || dataRef.current.courseName || null,
      collegeName: courseContext.college || dataRef.current.collegeName || null,
      topic: dataRef.current.topic || null,
      updatedAt: Date.now(),
      source: 'onboarding',
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, topics, isThinking, isJobRunning]);

  // Capture referral code from URL and store in localStorage
  useEffect(() => {
    if (refCode) {
      try {
        localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify({
          code: refCode,
          timestamp: Date.now(),
        }));
      } catch (err) {
        console.error("Failed to store referral code:", err);
      }
    }
  }, [refCode]);

  useEffect(() => {
    initTabId();
    const stored = readStoredSession();
    if (!stored || stored.status !== 'active') return;

    const isOwner = stored.ownerTabId && stored.ownerTabId === tabIdRef.current;
    if (!isOwner) {
      sessionOwnerRef.current = false;
      return;
    }

    restoredSessionRef.current = true;
    sessionActiveRef.current = true;
    onboardingSessionStartedRef.current = true;
    setHasStarted(true);
    sessionIdRef.current = stored.sessionId || null;
    sessionOwnerRef.current = true;

    if (!sessionIdRef.current) {
      sessionIdRef.current = generateSessionId();
    }

    if (Array.isArray(stored.messages) && stored.messages.length > 0) {
      const restored = syncMessages(stored.messages);
      setMessages(restored);
    }

    if (stored.data && typeof stored.data === 'object') {
      updateData(stored.data);
    }

    if (Array.isArray(stored.topics)) {
      setTopicsSafe(stored.topics);
    }

    if (typeof stored.showTopics === 'boolean') {
      setShowTopics(stored.showTopics);
    }

    if (stored.jobId) {
      setJobId(stored.jobId);
    }

    if (stored.redirectUrl) {
      redirectUrlRef.current = stored.redirectUrl;
    }

    if (stored.negotiationStep) {
      setNegotiationStepSafe(stored.negotiationStep);
    }

    if (typeof stored.currentPrice === 'number') {
      setCurrentPrice(stored.currentPrice);
    }

    if (stored.confirmedPrice !== undefined) {
      setConfirmedPrice(stored.confirmedPrice);
    }

    if (stored.paymentLink) {
      setPaymentLink(stored.paymentLink);
    }

    if (typeof stored.hasGeneratedPreview === 'boolean') {
      setHasGeneratedPreview(stored.hasGeneratedPreview);
    }

    if (stored.previewCourseId) {
      setPreviewCourseId(stored.previewCourseId);
    }

    if (typeof stored.awaitingConfirmation === 'boolean') {
      setAwaitingConfirmationSafe(stored.awaitingConfirmation);
    }

    if (stored.isJobRunning || stored.negotiationStep === NEGOTIATION_STEPS.GENERATING_PREVIEW) {
      setIsJobRunning(true);
    }

    if (sessionOwnerRef.current && stored.negotiationStep === NEGOTIATION_STEPS.WAIT_TOPICS &&
        (!Array.isArray(stored.topics) || stored.topics.length === 0)) {
      fetchTopicsAndAsk();
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadNegotiationStatus = async () => {
      try {
        const status = await api.getNegotiationStatus();
        if (!mounted || !status) return;

        if (typeof status.confirmedPrice === 'number') {
          setConfirmedPrice(status.confirmedPrice);
          setCurrentPrice(status.confirmedPrice);
        }

        if (status.paymentLink) {
          setPaymentLink(status.paymentLink);
        }

        if (typeof status.previewGenerated === 'boolean') {
          setHasGeneratedPreview(status.previewGenerated);
        }

        if (status.previewCourseId) {
          setPreviewCourseId(status.previewCourseId);
        }

        if (status.confirmedPrice || status.paymentLink || status.previewGenerated) {
          onboardingSessionStartedRef.current = true;
          setHasStarted(true);
        }

        if (status.paymentStatus === 'paid') {
          setNegotiationStepSafe(NEGOTIATION_STEPS.PAYMENT_COMPLETE);
          setAwaitingConfirmationSafe(false);
          return;
        }

        if (status.confirmedPrice && status.paymentLink) {
          const canOverride = [
            NEGOTIATION_STEPS.NONE,
            NEGOTIATION_STEPS.INTRO_REASON,
            NEGOTIATION_STEPS.INTRO_ASK_USEFUL,
            NEGOTIATION_STEPS.NEGOTIATING,
            NEGOTIATION_STEPS.AWAITING_CONFIRMATION,
          ].includes(negotiationStepRef.current);
          if (canOverride) {
            setNegotiationStepSafe(NEGOTIATION_STEPS.PRICE_CONFIRMED);
          }
          setAwaitingConfirmationSafe(false);
        }
      } catch (error) {
        console.warn('Failed to load negotiation status:', error);
      }
    };

    loadNegotiationStatus();
    return () => {
      mounted = false;
    };
  }, []);

  // Initial greeting
  useEffect(() => {
    if (restoredSessionRef.current) return;
    const timer = setTimeout(() => {
      setNegotiationStepSafe(NEGOTIATION_STEPS.INTRO_REASON);
      requestIntroMessage(NEGOTIATION_STEPS.INTRO_REASON);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  useEffect(() => {
    if (!sessionActiveRef.current) return;
    persistSession();
  }, [messages, negotiationStep, topics, showTopics, jobId, isJobRunning, hasStarted, currentPrice, confirmedPrice, paymentLink, hasGeneratedPreview, previewCourseId, awaitingConfirmation]);

  const syncMessages = (next) => {
    messagesRef.current = next;
    return next;
  };

  const appendMessage = (message) => {
    const next = [...messagesRef.current, message];
    messagesRef.current = next;
    setMessages(next);
  };

  const addBotMessage = (text, type = 'chat', meta = {}) => {
    const message = { type: 'bot', text, id: Date.now() + Math.random() };
    appendMessage(message);
    
    lastBotTypeRef.current = type;
    if (meta?.step === NEGOTIATION_STEPS.SHOW_TOPICS) {
      setShowTopics(true);
    } else if (meta?.step && meta.step !== NEGOTIATION_STEPS.SHOW_TOPICS) {
      setShowTopics(false);
    }
    if (type === 'task' && awaitingTaskRef.current) {
      awaitingTaskRef.current = false;
      if (deferredChatRef.current) {
        enqueueMessage(deferredChatRef.current);
        deferredChatRef.current = null;
      }
    }

    if (meta?.final && !flowCompleteRef.current) {
      flowCompleteRef.current = true;
      setIsRedirecting(true);
      const targetUrl = meta?.redirectUrl || redirectUrlRef.current;
      if (targetUrl) {
        setTimeout(() => router.push(targetUrl), 10000);
      }
    }
  };

  const markChatEnded = () => {
    if (chatEndedRef.current) return;
    chatEndedRef.current = true;
    setChatEnded(true);
    sessionActiveRef.current = false;
    sessionOwnerRef.current = false;
    pendingRequestsRef.current = 0;
    setIsThinking(false);
    setIsJobRunning(false);
    setIsRedirecting(false);
    setShowTopics(false);
    awaitingTaskRef.current = false;
    deferredChatRef.current = null;
    pendingBotRef.current = false;
    queueRef.current = [];
    taskInFlightRef.current = false;
    taskQueueRef.current = [];
    topicsRequestInFlightRef.current = false;
    introInFlightRef.current = false;
    introQueueRef.current = [];
    setAwaitingConfirmationSafe(false);
    setNegotiationStepSafe(NEGOTIATION_STEPS.DONE);
    addBotMessage(CHAT_ENDED_MESSAGE, 'chat');
  };

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== ONBOARDING_SESSION_KEY) return;
      if (!sessionOwnerRef.current) return;
      if (!event.newValue) {
        if (sessionActiveRef.current) {
          markChatEnded();
        }
        return;
      }
      try {
        const next = JSON.parse(event.newValue);
        if (next?.version !== ONBOARDING_SESSION_VERSION) return;
        const tabId = initTabId();
        if (sessionIdRef.current && next.sessionId && next.sessionId !== sessionIdRef.current) {
          markChatEnded();
        } else if (!sessionIdRef.current && next.ownerTabId && next.ownerTabId !== tabId) {
          markChatEnded();
        }
      } catch (error) {
        console.warn('Unable to parse onboarding session update:', error);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const addUserMessage = (text) => {
    const message = { type: 'user', text, id: Date.now() + Math.random() };
    appendMessage(message);
  };

  const setNegotiationStepSafe = (next) => {
    negotiationStepRef.current = next;
    setNegotiationStep(next);
  };

  const setAwaitingConfirmationSafe = (next) => {
    awaitingConfirmationRef.current = next;
    setAwaitingConfirmation(next);
  };

  const updateData = (updates) => {
    dataRef.current = { ...dataRef.current, ...updates };
  };

  const setTopicsSafe = (nextTopics) => {
    topicsRef.current = Array.isArray(nextTopics) ? nextTopics : [];
    setTopics(topicsRef.current);
  };

  const setThinkingDelta = (delta) => {
    pendingRequestsRef.current = Math.max(0, pendingRequestsRef.current + delta);
    setIsThinking(pendingRequestsRef.current > 0);
  };

  const handleLimitReached = (error) => {
    const isLimitError = error?.limitReached || error?.code === 'ONBOARDING_LIMIT_REACHED';
    if (!isLimitError) return false;
    if (limitReachedRef.current) return true;

    const message = error?.message || LIMIT_REACHED_MESSAGE;
    limitReachedRef.current = true;
    setLimitReached(true);
    if (typeof document !== 'undefined') {
      const maxAge = 15 * 60;
      document.cookie = `${CREATE_ACCOUNT_ACCESS_COOKIE}=limit; path=/; max-age=${maxAge}; samesite=lax`;
    }
    pendingRequestsRef.current = 0;
    setIsThinking(false);
    setIsJobRunning(false);
    setIsRedirecting(false);
    setShowTopics(false);
    awaitingTaskRef.current = false;
    deferredChatRef.current = null;
    pendingBotRef.current = false;
    lastBotTypeRef.current = null;
    queueRef.current = [];
    setAwaitingConfirmationSafe(false);
    addBotMessage(message, 'chat');
    return true;
  };

  const resetSessionState = () => {
    messagesRef.current = [];
    setMessages([]);
    setInput('');
    setShowTopics(false);
    setTopicsSafe([]);
    setJobId(null);
    setIsJobRunning(false);
    setIsRedirecting(false);
    setHasStarted(false);
    setNegotiationStepSafe(NEGOTIATION_STEPS.NONE);
    setCurrentPrice(10000);
    setConfirmedPrice(null);
    setPaymentLink(null);
    setHasGeneratedPreview(false);
    setPreviewCourseId(null);
    setAwaitingConfirmationSafe(false);
    pendingRequestsRef.current = 0;
    setIsThinking(false);
    awaitingTaskRef.current = false;
    deferredChatRef.current = null;
    taskInFlightRef.current = false;
    taskQueueRef.current = [];
    topicsRequestInFlightRef.current = false;
    introInFlightRef.current = false;
    introQueueRef.current = [];
    pendingBotRef.current = false;
    lastBotTypeRef.current = null;
    queueRef.current = [];
    taskRequestIdRef.current = 0;
    redirectUrlRef.current = null;
    flowCompleteRef.current = false;
    pendingNegotiationResponsesRef.current = new Map();
    negotiationTurnCounterRef.current = 0;
    nextNegotiationTurnRef.current = 1;
    dataRef.current = { collegeName: '', courseName: '', topic: '' };
    sessionActiveRef.current = false;
    sessionOwnerRef.current = false;
    sessionIdRef.current = null;
  };

  const startFreshSession = async () => {
    initTabId();
    if (limitReachedRef.current) {
      return;
    }
    resetSessionState();
    chatEndedRef.current = false;
    setChatEnded(false);
    sessionActiveRef.current = true;
    sessionOwnerRef.current = true;
    sessionIdRef.current = generateSessionId();
    onboardingSessionStartedRef.current = true;
    restoredSessionRef.current = false;
    setHasStarted(true);
    clearStoredSession();
    void api.startNewOnboardingSession();
    setNegotiationStepSafe(NEGOTIATION_STEPS.INTRO_REASON);
    requestIntroMessage(NEGOTIATION_STEPS.INTRO_REASON);
    persistSession({ status: 'active', hasStarted: true, jobId: null, isJobRunning: false, showTopics: false });
  };

  const shouldStartFreshSession = () => {
    initTabId();
    const stored = readStoredSession();
    if (!stored || stored.status !== 'active') return false;
    if (!stored.ownerTabId) return true;
    return stored.ownerTabId !== tabIdRef.current;
  };

  const buildLlmMessages = () =>
    messagesRef.current.map((msg) => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.text,
    }));

  const extractReplyParts = (response, fallback) => {
    if (Array.isArray(response?.reply)) {
      return response.reply.map((part) => String(part || '').trim()).filter(Boolean);
    }
    if (Array.isArray(response?.replyParts)) {
      return response.replyParts.map((part) => String(part || '').trim()).filter(Boolean);
    }
    if (typeof response?.reply === 'string') {
      const trimmed = response.reply.trim();
      return trimmed ? [trimmed] : [fallback];
    }
    return [fallback];
  };

  const enqueueReplyParts = (type, parts, meta = {}) => {
    if (!Array.isArray(parts) || parts.length === 0) return;
    parts.forEach((text, index) => {
      if (!text) return;
      const entry = {
        type,
        text,
        meta: index === parts.length - 1 ? meta : {},
      };
      enqueueMessage(entry);
    });
  };

  const enqueueMessage = (entry) => {
    if (!entry) return;
    const queue = queueRef.current;
    if (entry.type === 'task') {
      const existingIndex = queue.findIndex((item) => item.type === 'task');
      if (existingIndex !== -1) {
        const existing = queue[existingIndex];
        const existingOrder = STEP_ORDER[existing?.meta?.step] || 0;
        const nextOrder = STEP_ORDER[entry?.meta?.step] || 0;
        if (entry?.meta?.final || nextOrder >= existingOrder) {
          queue[existingIndex] = entry;
        }
      } else {
        queue.push(entry);
      }
    } else {
      queue.push(entry);
    }

    flushQueue();
  };

  const flushQueue = () => {
    const queue = queueRef.current;
    if (!queue.length) return;
    while (queue.length) {
      const next = queue.shift();
      addBotMessage(next.text, next.type, next.meta);
    }
  };

  const ensureOnboardingSession = async () => {
    if (onboardingSessionStartedRef.current) return;
    initTabId();
    onboardingSessionStartedRef.current = true;
    sessionActiveRef.current = true;
    sessionOwnerRef.current = true;
    if (!sessionIdRef.current) {
      sessionIdRef.current = generateSessionId();
    }
    chatEndedRef.current = false;
    setChatEnded(false);
    setHasStarted(true);
    if (restoredSessionRef.current) return;
    clearStoredSession();
    try {
      await api.startNewOnboardingSession();
    } catch (error) {}
    persistSession({ status: 'active', hasStarted: true });
  };

  const requestIntroMessage = async (step, latestUserMessage = null) => {
    if (introInFlightRef.current) {
      if (latestUserMessage) {
        introQueueRef.current.push(latestUserMessage);
      }
      return;
    }
    introInFlightRef.current = true;
    setThinkingDelta(1);
    try {
      const response = await api.getChatStep({
        mode: 'intro',
        messages: buildLlmMessages(),
        task: {
          step,
          latestUserMessage,
        },
      });

      const fallback =
        step === NEGOTIATION_STEPS.INTRO_ASK_USEFUL
          ? INTRO_FALLBACKS.askUseful
          : INTRO_FALLBACKS.reason;
      const replyParts = extractReplyParts(response, fallback);
      const nextStep = response?.nextStep;
      const validSteps = new Set(Object.values(NEGOTIATION_STEPS));
      const resolvedStep = validSteps.has(nextStep) ? nextStep : step;

      enqueueReplyParts('chat', replyParts, {});

      if (resolvedStep && resolvedStep !== negotiationStepRef.current) {
        setNegotiationStepSafe(resolvedStep);
      }
      if (resolvedStep === NEGOTIATION_STEPS.NEGOTIATING) {
        setAwaitingConfirmationSafe(false);
      }
    } catch (error) {
      const normalized = latestUserMessage ? latestUserMessage.toLowerCase() : '';
      const wantsDemo = /demo|preview|lesson|show me|prove/.test(normalized);
      const asksPrice = /price|cost|how much|\$|per month|monthly/.test(normalized);
      const asksWhat = /what is|what do you do|useful|why should|tell me about|explain/.test(normalized);
      let fallback = INTRO_FALLBACKS.reason;
      let fallbackStep = step;
      if (wantsDemo) {
        fallback = INTRO_FALLBACKS.demo;
        fallbackStep = NEGOTIATION_STEPS.ASK_COLLEGE;
      } else if (asksWhat) {
        fallback = INTRO_FALLBACKS.explain;
        fallbackStep = NEGOTIATION_STEPS.NEGOTIATING;
      } else if (asksPrice) {
        fallback = INTRO_FALLBACKS.price;
        fallbackStep = NEGOTIATION_STEPS.NEGOTIATING;
      } else if (step === NEGOTIATION_STEPS.INTRO_ASK_USEFUL) {
        fallback = INTRO_FALLBACKS.askUseful;
      }
      enqueueReplyParts('chat', [fallback], {});
      if (fallbackStep && fallbackStep !== negotiationStepRef.current) {
        setNegotiationStepSafe(fallbackStep);
      }
      if (fallbackStep === NEGOTIATION_STEPS.NEGOTIATING) {
        setAwaitingConfirmationSafe(false);
      }
    } finally {
      introInFlightRef.current = false;
      setThinkingDelta(-1);
      const drainQueue = async () => {
        while (introQueueRef.current.length > 0) {
          const nextQueued = introQueueRef.current.shift();
          if (!nextQueued) continue;
          await respondToUserMessage(nextQueued);
          if (introInFlightRef.current) return;
        }
      };
      void drainQueue();
    }
  };

  const processNegotiationPayload = (payload) => {
    if (!payload) return true;
    const replyParts = Array.isArray(payload.replyParts) && payload.replyParts.length > 0
      ? payload.replyParts
      : [FALLBACKS.negotiation];
    const suggestedPrice = payload.suggestedPrice;
    const askConfirmation = Boolean(payload.askConfirmation);
    const offerProveValue = Boolean(payload.offerProveValue);
    const currentStep = negotiationStepRef.current;
    const inTaskInput = [
      NEGOTIATION_STEPS.ASK_COLLEGE,
      NEGOTIATION_STEPS.ASK_COURSE,
      NEGOTIATION_STEPS.SHOW_TOPICS,
    ].includes(currentStep);
    const inPreviewFlow = [
      NEGOTIATION_STEPS.ASK_COLLEGE,
      NEGOTIATION_STEPS.ASK_COURSE,
      NEGOTIATION_STEPS.WAIT_TOPICS,
      NEGOTIATION_STEPS.SHOW_TOPICS,
      NEGOTIATION_STEPS.GENERATING_PREVIEW,
      NEGOTIATION_STEPS.PREVIEW_READY,
    ].includes(currentStep);

    if (suggestedPrice !== null) {
      setCurrentPrice(suggestedPrice);
    }

    if (offerProveValue && previewCourseId) {
      openPreviewInNewTab(previewCourseId);
      setHasGeneratedPreview(true);
      if (![NEGOTIATION_STEPS.PRICE_CONFIRMED, NEGOTIATION_STEPS.PAYMENT_COMPLETE].includes(currentStep)) {
        setNegotiationStepSafe(NEGOTIATION_STEPS.PREVIEW_READY);
      }
    } else if (offerProveValue && !hasGeneratedPreview && !inPreviewFlow) {
      setNegotiationStepSafe(NEGOTIATION_STEPS.ASK_COLLEGE);
      requestTaskMessage(NEGOTIATION_STEPS.ASK_COLLEGE);
      return true;
    } else if (askConfirmation && !inTaskInput) {
      setAwaitingConfirmationSafe(true);
      if (!inPreviewFlow) {
        setNegotiationStepSafe(NEGOTIATION_STEPS.AWAITING_CONFIRMATION);
      }
    } else if (!inTaskInput && !inPreviewFlow && negotiationStepRef.current === NEGOTIATION_STEPS.AWAITING_CONFIRMATION) {
      setAwaitingConfirmationSafe(false);
      setNegotiationStepSafe(NEGOTIATION_STEPS.NEGOTIATING);
    } else if (!inTaskInput && negotiationStepRef.current === NEGOTIATION_STEPS.NONE) {
      setNegotiationStepSafe(NEGOTIATION_STEPS.NEGOTIATING);
    }

    enqueueReplyParts('chat', replyParts, {});
    return true;
  };

  const flushNegotiationResponses = () => {
    const buffer = pendingNegotiationResponsesRef.current;
    let nextTurn = nextNegotiationTurnRef.current;
    if (!nextTurn) nextTurn = 1;
    while (buffer.has(nextTurn)) {
      const payload = buffer.get(nextTurn);
      buffer.delete(nextTurn);
      processNegotiationPayload(payload);
      nextTurn += 1;
    }
    nextNegotiationTurnRef.current = nextTurn;
  };

  const queueNegotiationResponse = (turnId, payload) => {
    if (turnId < nextNegotiationTurnRef.current) return;
    pendingNegotiationResponsesRef.current.set(turnId, payload);
    flushNegotiationResponses();
  };

  const requestNegotiationResponse = async (turnId) => {
    setThinkingDelta(1);
    try {
      const response = await api.getChatStep({
        mode: 'negotiation',
        messages: buildLlmMessages(),
      });

      const replyParts = extractReplyParts(response, FALLBACKS.negotiation);
      const suggestedPriceRaw = response?.suggestedPrice;
      let suggestedPrice = Number.isFinite(Number(suggestedPriceRaw))
        ? Math.round(Number(suggestedPriceRaw))
        : null;
      if (suggestedPrice !== null && suggestedPrice < 100) {
        suggestedPrice = Math.round(suggestedPrice * 100);
      }
      const askConfirmation = Boolean(response?.askConfirmation);
      const offerProveValue = Boolean(response?.offerProveValue);

      queueNegotiationResponse(turnId, {
        replyParts,
        suggestedPrice,
        askConfirmation,
        offerProveValue,
      });
    } catch (error) {
      if (handleLimitReached(error)) return;
      queueNegotiationResponse(turnId, {
        replyParts: [FALLBACKS.negotiation],
        suggestedPrice: null,
        askConfirmation: false,
        offerProveValue: false,
      });
    } finally {
      setThinkingDelta(-1);
    }
  };

  const requestTaskMessage = async (step, meta = {}) => {
    if (taskInFlightRef.current) {
      taskQueueRef.current.push({ step, meta });
      return;
    }
    const key = `${step}::${meta?.latestUserMessage || ''}`;
    const now = Date.now();
    if (!meta?.latestUserMessage && key === lastTaskKeyRef.current && now - lastTaskTimestampRef.current < 1500) {
      return;
    }
    lastTaskKeyRef.current = key;
    lastTaskTimestampRef.current = now;
    taskInFlightRef.current = true;
    const requestId = taskRequestIdRef.current + 1;
    taskRequestIdRef.current = requestId;
    setThinkingDelta(1);
    try {
      const metaWithStep = { ...meta, step };
      const response = await api.getChatStep({
        mode: 'task',
        messages: buildLlmMessages(),
        task: {
          step,
          collegeName: dataRef.current.collegeName,
          courseName: dataRef.current.courseName,
          topic: dataRef.current.topic,
          topics: topicsRef.current,
          latestUserMessage: meta?.latestUserMessage || null,
        },
      });

      if (requestId !== taskRequestIdRef.current) return;
      const replyParts = extractReplyParts(response, FALLBACKS.task);
      const fieldUpdates = response?.fieldUpdates || {};
      const resolvedUpdates = {
        collegeName: fieldUpdates?.collegeName || null,
        courseName: fieldUpdates?.courseName || null,
        topic: fieldUpdates?.topic || null,
      };
      if (resolvedUpdates.collegeName) {
        updateData({ collegeName: resolvedUpdates.collegeName });
      }
      if (resolvedUpdates.courseName) {
        updateData({ courseName: resolvedUpdates.courseName });
      }
      if (resolvedUpdates.topic) {
        updateData({ topic: resolvedUpdates.topic });
      }

      const nextStep = response?.nextStep;
      const validSteps = new Set(Object.values(NEGOTIATION_STEPS));
      const resolvedStep = validSteps.has(nextStep) ? nextStep : step;
      if (resolvedStep && resolvedStep !== negotiationStepRef.current) {
        setNegotiationStepSafe(resolvedStep);
      }

      if (resolvedStep === NEGOTIATION_STEPS.WAIT_TOPICS) {
        setShowTopics(false);
        if (dataRef.current.courseName) {
          fetchTopicsAndAsk();
        }
      }

      if (resolvedStep === NEGOTIATION_STEPS.GENERATING_PREVIEW) {
        setShowTopics(false);
        const selectedTopic = resolvedUpdates.topic || dataRef.current.topic;
        if (selectedTopic) {
          startLessonGeneration(selectedTopic);
        }
      }

      enqueueReplyParts('task', replyParts, { ...metaWithStep, step: resolvedStep });
    } catch (error) {
      if (handleLimitReached(error)) return;
      enqueueReplyParts('task', [FALLBACKS.task], { ...meta, step });
    } finally {
      taskInFlightRef.current = false;
      const next = taskQueueRef.current.shift();
      if (next) {
        setTimeout(() => {
          requestTaskMessage(next.step, next.meta);
        }, 0);
      }
      setThinkingDelta(-1);
    }
  };

  const fetchTopicsAndAsk = async () => {
    if (!sessionOwnerRef.current) return;
    if (topicsRequestInFlightRef.current) return;
    topicsRequestInFlightRef.current = true;
    setThinkingDelta(1);
    try {
      const topicRes = await api.getHardTopics({
        collegeName: dataRef.current.collegeName,
        courseName: dataRef.current.courseName,
      });

      const nextTopics = Array.isArray(topicRes?.topics) ? topicRes.topics : [];
      if (nextTopics.length === 0) {
        enqueueMessage({ type: 'task', text: FALLBACKS.topics });
        setNegotiationStepSafe(NEGOTIATION_STEPS.ASK_COURSE);
        setShowTopics(false);
        setTopicsSafe([]);
        return;
      }

      setTopicsSafe(nextTopics);
      setNegotiationStepSafe(NEGOTIATION_STEPS.SHOW_TOPICS);
      requestTaskMessage(NEGOTIATION_STEPS.SHOW_TOPICS);
    } catch (error) {
      enqueueMessage({ type: 'task', text: FALLBACKS.topics });
      setNegotiationStepSafe(NEGOTIATION_STEPS.ASK_COURSE);
      setShowTopics(false);
      setTopicsSafe([]);
    } finally {
      topicsRequestInFlightRef.current = false;
      setThinkingDelta(-1);
    }
  };

  const openPreviewInNewTab = (courseId, lessonId) => {
    if (!courseId || typeof window === 'undefined') return false;
    const params = new URLSearchParams({ preview: '1', negotiation: '1' });
    if (lessonId) {
      params.set('lesson', lessonId);
    }
    const url = `/courses/${courseId}?${params.toString()}`;
    const popup = window.open(url, '_blank');
    if (popup) {
      try {
        popup.opener = null;
      } catch (error) {}
      return true;
    }
    return false;
  };

  const startLessonGeneration = async (selectedTopic) => {
    if (!sessionOwnerRef.current) return;
    if (limitReachedRef.current) return;

    if (previewCourseId && hasGeneratedPreview) {
      openPreviewInNewTab(previewCourseId);
      setNegotiationStepSafe(NEGOTIATION_STEPS.PREVIEW_READY);
      return;
    }

    setIsJobRunning(true);
    try {
      const jobRes = await api.generateLesson({
        collegeName: dataRef.current.collegeName,
        courseName: dataRef.current.courseName,
        topic: selectedTopic,
      });
      setJobId(jobRes.jobId);
      persistSession({ jobId: jobRes.jobId, isJobRunning: true });
    } catch (error) {
      if (handleLimitReached(error)) {
        setIsJobRunning(false);
        return;
      }
      setIsJobRunning(false);
      enqueueMessage({ type: 'task', text: FALLBACKS.generation });
      setNegotiationStepSafe(NEGOTIATION_STEPS.SHOW_TOPICS);
      setShowTopics(true);
    }
  };

  const handleConfirmPrice = async (price) => {
    if (!price || limitReachedRef.current) return;
    setThinkingDelta(1);
    try {
      const response = await api.confirmNegotiationPrice(price);
      const link = response?.paymentLink || response?.payment_link || null;
      const resolvedPrice = typeof response?.confirmedPrice === 'number' ? response.confirmedPrice : price;
      setPaymentLink(link);
      setConfirmedPrice(resolvedPrice);
      setCurrentPrice(resolvedPrice);
      setNegotiationStepSafe(NEGOTIATION_STEPS.PRICE_CONFIRMED);
      setAwaitingConfirmationSafe(false);
      addBotMessage(
        link ? 'Locked in. Use the payment link when you are ready.' : 'Locked in. You can complete payment any time.',
        'chat'
      );
      pendingBotRef.current = false;
    } catch (error) {
      addBotMessage('I could not lock that price. Try again.', 'chat');
      pendingBotRef.current = false;
    } finally {
      setThinkingDelta(-1);
    }
  };

  const respondToUserMessage = async (trimmed) => {
    const currentStep = negotiationStepRef.current;

    if (currentStep === NEGOTIATION_STEPS.NONE) {
      setNegotiationStepSafe(NEGOTIATION_STEPS.INTRO_REASON);
      requestIntroMessage(NEGOTIATION_STEPS.INTRO_REASON, trimmed);
      return;
    }

    if ([NEGOTIATION_STEPS.INTRO_REASON, NEGOTIATION_STEPS.INTRO_ASK_USEFUL].includes(currentStep)) {
      requestIntroMessage(currentStep, trimmed);
      return;
    }

    if (currentStep === NEGOTIATION_STEPS.PRICE_CONFIRMED) {
      enqueueMessage({
        type: 'chat',
        text: 'Price is locked. Use the payment link above when you are ready.',
      });
      return;
    }

    if (currentStep === NEGOTIATION_STEPS.PAYMENT_COMPLETE) {
      enqueueMessage({
        type: 'chat',
        text: 'You are already set. Head to your dashboard when you are ready.',
      });
      return;
    }

    const isTaskInputStep = [
      NEGOTIATION_STEPS.ASK_COLLEGE,
      NEGOTIATION_STEPS.ASK_COURSE,
      NEGOTIATION_STEPS.SHOW_TOPICS,
    ].includes(currentStep);
    const inPreviewFlow = [
      NEGOTIATION_STEPS.ASK_COLLEGE,
      NEGOTIATION_STEPS.ASK_COURSE,
      NEGOTIATION_STEPS.WAIT_TOPICS,
      NEGOTIATION_STEPS.SHOW_TOPICS,
      NEGOTIATION_STEPS.GENERATING_PREVIEW,
      NEGOTIATION_STEPS.PREVIEW_READY,
    ].includes(currentStep);

    if (isTaskInputStep) {
      requestTaskMessage(currentStep, { latestUserMessage: trimmed });
      return;
    }

    const normalized = trimmed.toLowerCase();
    const isExplicitAccept = /\b(confirm|deal|i'?m in|im in|i accept|i'll take it|ill take it)\b/.test(normalized);
    const isSoftYes = /\b(yes|yep|yup|sure)\b/.test(normalized);
    const isOk = /\b(ok|okay)\b/.test(normalized);
    const hasNegation =
      /\b(no|nah|not|don't|do not|cant|can't|wont|won't|too much|too expensive|cannot)\b/.test(normalized);
    const currentDollars = Number.isFinite(currentPrice) ? Math.round(currentPrice / 100) : null;
    const mentionsCurrentPrice =
      currentDollars !== null && new RegExp(`\\b\\$?${currentDollars}\\b`).test(normalized);
    const shouldConfirm =
      !hasNegation &&
      (isExplicitAccept || ((isSoftYes || isOk) && (awaitingConfirmationRef.current || mentionsCurrentPrice)));

    if (!isTaskInputStep && !inPreviewFlow && shouldConfirm) {
      await handleConfirmPrice(currentPrice);
      return;
    }

    if (awaitingConfirmationRef.current && !isTaskInputStep && !inPreviewFlow) {
      setAwaitingConfirmationSafe(false);
      setNegotiationStepSafe(NEGOTIATION_STEPS.NEGOTIATING);
    }

    if (currentStep === NEGOTIATION_STEPS.PREVIEW_READY) {
      setNegotiationStepSafe(NEGOTIATION_STEPS.NEGOTIATING);
    }

    const negotiationTurnId = ++negotiationTurnCounterRef.current;
    requestNegotiationResponse(negotiationTurnId);
  };

  const handleUserSend = async (value) => {
    const trimmed = value.trim();
    if (!trimmed || isRedirecting || chatEndedRef.current || limitReachedRef.current) return;

    if (shouldStartFreshSession()) {
      await startFreshSession();
    }

    setInput('');
    addUserMessage(trimmed);

    if (!hasStarted) {
      void ensureOnboardingSession();
    }

    pendingBotRef.current = true;
    flushQueue();

    await respondToUserMessage(trimmed);
  };

  useEffect(() => {
    if (!jobId || !isJobRunning) return;
    if (!sessionOwnerRef.current) return;

    let pollInterval;

    pollInterval = setInterval(async () => {
      try {
        const status = await api.getLessonStatus(jobId);
        if (status.status === 'completed') {
          clearInterval(pollInterval);
          setIsJobRunning(false);
          persistCourseContinuation(status);
          setHasGeneratedPreview(true);
          setPreviewCourseId(status.courseId || null);
          const didOpen = openPreviewInNewTab(status.courseId, status.lessonId);
          if (![NEGOTIATION_STEPS.PRICE_CONFIRMED, NEGOTIATION_STEPS.PAYMENT_COMPLETE].includes(negotiationStepRef.current)) {
            setNegotiationStepSafe(NEGOTIATION_STEPS.PREVIEW_READY);
          }
          addBotMessage(
            didOpen
              ? 'Your preview lesson is here. I opened it in a new tab—come back when you are ready to keep negotiating.'
              : 'Your preview lesson is here. Use the button below to open it, then come back to keep negotiating.',
            'chat'
          );
          pendingBotRef.current = false;
        } else if (status.status === 'failed') {
          clearInterval(pollInterval);
          setIsJobRunning(false);
          addBotMessage(FALLBACKS.status, 'task');
          pendingBotRef.current = false;
          setNegotiationStepSafe(NEGOTIATION_STEPS.SHOW_TOPICS);
          setShowTopics(true);
        }
      } catch (error) {
        clearInterval(pollInterval);
        setIsJobRunning(false);
        addBotMessage(FALLBACKS.status, 'task');
        pendingBotRef.current = false;
        setNegotiationStepSafe(NEGOTIATION_STEPS.SHOW_TOPICS);
        setShowTopics(true);
      }
    }, 1500);

    return () => {
      clearInterval(pollInterval);
    };
  }, [jobId, isJobRunning]);

  const isInputDisabled = isRedirecting || chatEnded || limitReached;

  return (
    <div className="relative h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, rgba(var(--primary-rgb), var(--grid-glow-opacity)) 0%, transparent 100%)` }}
        />
        <div
          className="absolute top-1/2 -left-40 h-[500px] w-[500px] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.5)) 0%, transparent 100%)` }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-[var(--primary)]">
          <Image src="/images/kogno_logo.png" alt="Kogno" width={32} height={32} />
          Kogno
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-5 py-2 text-sm font-medium rounded-xl border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-all"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* Chat area - takes up remaining space */}
      <div
        ref={scrollContainerRef}
        className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6"
      >
        <div className="max-w-2xl mx-auto py-8">
          {/* Hero section - shown before first message */}
          <AnimatePresence>
            {!hasStarted && (
              <motion.div
                key="hero"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.4 }}
                className="text-center mb-12"
              >
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-4">
                  Learn smarter,
                  <span className="block text-[var(--primary)]">not harder</span>
                </h1>
                <p className="text-base sm:text-lg text-[var(--muted-foreground)] max-w-xl mx-auto leading-relaxed mb-6">
                  Personalized study plans, flashcards, and progress tracking—all in one place.
                </p>
                <div className="flex flex-col items-center gap-2 text-[var(--muted-foreground)]">
                  <span className="text-sm font-medium">Get started</span>
                  <motion.svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    animate={{ y: [0, 6, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </motion.svg>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat messages */}
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              m.type === 'bot' ? <BotMessage key={m.id}>{m.text}</BotMessage> : <UserMessage key={m.id}>{m.text}</UserMessage>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {(isThinking || isJobRunning) && (
            <div className="flex justify-start mb-4">
              <div className="bg-[var(--surface-1)] px-4 py-3 rounded-2xl rounded-tl-none border border-white/5">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {awaitingConfirmation && !isThinking && !chatEnded && !limitReached && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-3 mb-4"
            >
              <button
                onClick={() => handleConfirmPrice(currentPrice)}
                className="px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity"
              >
                Confirm {formatPrice(currentPrice)}/mo
              </button>
              <button
                onClick={() => {
                  setAwaitingConfirmationSafe(false);
                  setNegotiationStepSafe(NEGOTIATION_STEPS.NEGOTIATING);
                }}
                className="px-6 py-2.5 rounded-xl bg-[var(--surface-1)] border border-white/10 text-[var(--foreground)] font-medium hover:bg-[var(--surface-2)] transition-colors"
              >
                Keep negotiating
              </button>
            </motion.div>
          )}

          {hasGeneratedPreview && previewCourseId && !chatEnded && !limitReached && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <button
                type="button"
                onClick={() => openPreviewInNewTab(previewCourseId)}
                className="inline-flex items-center justify-center px-5 py-2 text-sm font-medium rounded-xl bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
              >
                Open preview lesson
              </button>
            </motion.div>
          )}

          {negotiationStep === NEGOTIATION_STEPS.PRICE_CONFIRMED && paymentLink && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-2xl border border-white/10 bg-[var(--surface-1)] p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-medium text-[var(--foreground)]">
                    Price locked at {formatPrice(confirmedPrice ?? currentPrice)}/mo
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    Complete payment to unlock your subscription.
                  </div>
                </div>
                <a
                  href={paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-5 py-2 text-sm font-medium rounded-xl bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
                >
                  Pay now
                </a>
              </div>
            </motion.div>
          )}

          {negotiationStep === NEGOTIATION_STEPS.PAYMENT_COMPLETE && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-2xl border border-white/10 bg-[var(--surface-1)] p-4 text-sm text-[var(--foreground)]"
            >
              Payment confirmed. Head to your dashboard to finish setup.
            </motion.div>
          )}

          {/* Topic chips when available */}
          {showTopics && topics.length > 0 && !chatEnded && !limitReached && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2 mb-4"
            >
              {topics.map((t) => (
                <button
                  key={t}
                  onClick={() => handleUserSend(t)}
                  className="px-4 py-2 text-sm bg-[var(--surface-1)] hover:bg-[var(--primary)] hover:text-white border border-white/10 rounded-full transition-colors"
                >
                  {t}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Input area - fixed at bottom */}
      <div className="relative z-10 border-t border-white/5 bg-[var(--background)]/80 backdrop-blur-xl px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleUserSend(input);
                }
              }}
              placeholder="Type your message..."
              disabled={isInputDisabled}
              rows={1}
              className="flex-1 bg-[var(--surface-1)] border border-white/10 rounded-2xl px-5 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-50 resize-none overflow-hidden"
              style={{ maxHeight: '150px' }}
              autoFocus
            />
            <button
              onClick={() => handleUserSend(input)}
              disabled={!input.trim() || isInputDisabled}
              className="p-3 bg-[var(--primary)] text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--primary)]/90 transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
