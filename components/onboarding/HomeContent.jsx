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
const ONBOARDING_SESSION_VERSION = 1;
const ONBOARDING_TAB_KEY = "kogno_onboarding_tab_id";
const CHAT_ENDED_MESSAGE = "This chat has ended.";
const LIMIT_REACHED_MESSAGE =
  "You have hit the limit on the number of attempts you can use this feature.";
const CREATE_ACCOUNT_ACCESS_COOKIE = "kogno_onboarding_create_account";
const INITIAL_MESSAGE = 'Kogno is made for people who actually can learn on their own and have agency, can you really do that?';

const TASK_STEPS = {
  NONE: 'NONE',
  ASK_COLLEGE: 'ASK_COLLEGE',
  ASK_COURSE: 'ASK_COURSE',
  WAIT_TOPICS: 'WAIT_TOPICS',
  TOPICS_READY: 'TOPICS_READY',
  SHOW_TOPICS: 'SHOW_TOPICS',
  WAIT_JOB: 'WAIT_JOB',
  JOB_DONE: 'JOB_DONE',
  FINAL_MESSAGE: 'FINAL_MESSAGE',
  DONE: 'DONE',
};

const TASK_ORDER = {
  [TASK_STEPS.ASK_COLLEGE]: 1,
  [TASK_STEPS.ASK_COURSE]: 2,
  [TASK_STEPS.WAIT_TOPICS]: 2.5,
  [TASK_STEPS.TOPICS_READY]: 2.8,
  [TASK_STEPS.SHOW_TOPICS]: 3,
  [TASK_STEPS.WAIT_JOB]: 3.5,
  [TASK_STEPS.JOB_DONE]: 3.8,
  [TASK_STEPS.FINAL_MESSAGE]: 4,
};

const FALLBACKS = {
  gate: 'Tell me how you learn on your own and how you follow through.',
  chat: 'Got it. Tell me more.',
  task: 'Okay. What college are you at?',
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

const CollegeInputForm = ({ onSubmit }) => {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-end gap-2 mb-4"
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter your college name..."
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          }
        }}
        className="flex-1 px-4 py-3 bg-[var(--surface-1)] border border-white/10 rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        className="p-3 bg-[var(--primary)] text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </motion.div>
  );
};

export default function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [topics, setTopics] = useState([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [taskStep, setTaskStep] = useState(TASK_STEPS.NONE);
  const [isJobRunning, setIsJobRunning] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [chatEnded, setChatEnded] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [showTopics, setShowTopics] = useState(false);
  const [collegeConfirmation, setCollegeConfirmation] = useState(null); // college name to confirm
  const [showCollegeInput, setShowCollegeInput] = useState(false); // show input after clicking "No"

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
  const lastBotTypeRef = useRef(null);
  const limitReachedRef = useRef(false);
  const gateConvincedRef = useRef(false);
  const taskStepRef = useRef(TASK_STEPS.NONE);
  const dataRef = useRef({ collegeName: '', courseName: '', topic: '' });
  const topicsRef = useRef([]);
  const pendingRequestsRef = useRef(0);
  const latestChatTurnRef = useRef(0);
  const latestGateTurnRef = useRef(0);
  const taskRequestIdRef = useRef(0);
  const redirectUrlRef = useRef(null);
  const flowCompleteRef = useRef(false);
  const turnCounterRef = useRef(0);
  const awaitingTaskRef = useRef(false);
  const deferredChatRef = useRef(null);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
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
        taskStep: taskStepRef.current,
        data: dataRef.current,
        topics: topicsRef.current,
        showTopics: typeof overrides.showTopics === 'boolean' ? overrides.showTopics : showTopics,
        jobId: overrides.jobId ?? jobId,
        isJobRunning: overrides.isJobRunning ?? isJobRunning,
        redirectUrl: overrides.redirectUrl ?? redirectUrlRef.current,
        gateConvinced: gateConvincedRef.current,
        hasStarted: overrides.hasStarted ?? hasStarted,
      };
      window.localStorage.setItem(ONBOARDING_SESSION_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Unable to persist onboarding session:', error);
    }
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

    if (stored.taskStep) {
      setTaskStepSafe(stored.taskStep);
    }

    if (stored.isJobRunning || stored.taskStep === TASK_STEPS.WAIT_JOB) {
      setIsJobRunning(true);
    }

    if (stored.gateConvinced || (stored.taskStep && stored.taskStep !== TASK_STEPS.NONE)) {
      gateConvincedRef.current = true;
    }

    if (sessionOwnerRef.current && stored.taskStep === TASK_STEPS.WAIT_TOPICS &&
        (!Array.isArray(stored.topics) || stored.topics.length === 0)) {
      fetchTopicsAndAsk();
    }
  }, []);

  // Initial greeting
  useEffect(() => {
    if (restoredSessionRef.current) return;
    const timer = setTimeout(() => {
      addBotMessage(INITIAL_MESSAGE, 'task');
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
  }, [messages, taskStep, topics, showTopics, jobId, isJobRunning, hasStarted]);

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
    if (meta?.step === TASK_STEPS.SHOW_TOPICS) {
      setShowTopics(true);
    } else if (meta?.step && meta.step !== TASK_STEPS.SHOW_TOPICS) {
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
    setTaskStepSafe(TASK_STEPS.DONE);
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

  const setTaskStepSafe = (next) => {
    taskStepRef.current = next;
    setTaskStep(next);
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
    setCollegeConfirmation(null);
    setShowCollegeInput(false);
    awaitingTaskRef.current = false;
    deferredChatRef.current = null;
    pendingBotRef.current = false;
    lastBotTypeRef.current = null;
    queueRef.current = [];
    addBotMessage(message, 'chat');
    return true;
  };

  const resetSessionState = () => {
    messagesRef.current = [];
    setMessages([]);
    setInput('');
    setCollegeConfirmation(null);
    setShowCollegeInput(false);
    setShowTopics(false);
    setTopicsSafe([]);
    setJobId(null);
    setIsJobRunning(false);
    setIsRedirecting(false);
    setHasStarted(false);
    setTaskStepSafe(TASK_STEPS.NONE);
    pendingRequestsRef.current = 0;
    setIsThinking(false);
    gateConvincedRef.current = false;
    awaitingTaskRef.current = false;
    deferredChatRef.current = null;
    pendingBotRef.current = false;
    lastBotTypeRef.current = null;
    queueRef.current = [];
    latestChatTurnRef.current = 0;
    latestGateTurnRef.current = 0;
    taskRequestIdRef.current = 0;
    redirectUrlRef.current = null;
    flowCompleteRef.current = false;
    turnCounterRef.current = 0;
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
    addBotMessage(INITIAL_MESSAGE, 'task');
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

  const enqueueMessage = (entry) => {
    if (!entry) return;
    const queue = queueRef.current;
    const existingIndex = queue.findIndex((item) => item.type === entry.type);

    if (existingIndex !== -1) {
      if (entry.type === 'chat') {
        queue[existingIndex] = entry;
      } else if (entry.type === 'task') {
        const existing = queue[existingIndex];
        const existingOrder = TASK_ORDER[existing?.meta?.step] || 0;
        const nextOrder = TASK_ORDER[entry?.meta?.step] || 0;
        if (entry?.meta?.final || nextOrder >= existingOrder) {
          queue[existingIndex] = entry;
        } else {
          return;
        }
      } else {
        return;
      }
    } else {
      queue.push(entry);
    }

    if (queue.length > 2) {
      const taskEntry = queue.find((item) => item.type === 'task');
      const chatEntry = queue.find((item) => item.type === 'chat');
      queueRef.current = [taskEntry, chatEntry].filter(Boolean);
    }

    flushQueue();
  };

  const flushQueue = () => {
    if (!pendingBotRef.current) return;
    const queue = queueRef.current;
    if (!queue.length) return;
    const next = queue.shift();
    addBotMessage(next.text, next.type, next.meta);
    pendingBotRef.current = false;
  };

  const dropQueuedChat = () => {
    queueRef.current = queueRef.current.filter((item) => item.type !== 'chat');
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

  const requestGatekeeper = async (turnId) => {
    latestGateTurnRef.current = turnId;
    setThinkingDelta(1);
    try {
      const response = await api.getChatStep({
        mode: 'gatekeeper',
        messages: buildLlmMessages(),
      });

      if (turnId !== latestGateTurnRef.current) return;
      const convinced = Boolean(response?.convinced);
      const reply = response?.reply || '';

      if (!convinced) {
        enqueueMessage({ type: 'task', text: reply || FALLBACKS.gate });
        return;
      }

      gateConvincedRef.current = true;
      setTaskStepSafe(TASK_STEPS.ASK_COLLEGE);
      awaitingTaskRef.current = true;
      requestTaskMessage(TASK_STEPS.ASK_COLLEGE);
    } catch (error) {
      if (handleLimitReached(error)) return;
      enqueueMessage({ type: 'task', text: FALLBACKS.gate });
    } finally {
      setThinkingDelta(-1);
    }
  };

  const requestChatResponse = async (turnId) => {
    latestChatTurnRef.current = turnId;
    setThinkingDelta(1);
    try {
      const response = await api.getChatStep({
        mode: 'chat',
        messages: buildLlmMessages(),
        task: {
          step: taskStepRef.current,
        }
      });

      if (turnId !== latestChatTurnRef.current) return;
      const reply = response?.reply || '';
      const entry = { type: 'chat', text: reply || FALLBACKS.chat };
      if (awaitingTaskRef.current) {
        deferredChatRef.current = entry;
        return;
      }
      enqueueMessage(entry);
    } catch (error) {
      if (handleLimitReached(error)) return;
      const entry = { type: 'chat', text: FALLBACKS.chat };
      if (awaitingTaskRef.current) {
        deferredChatRef.current = entry;
        return;
      }
      enqueueMessage(entry);
    } finally {
      setThinkingDelta(-1);
    }
  };

  const requestTaskMessage = async (step, meta = {}) => {
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
        },
      });

      if (requestId !== taskRequestIdRef.current) return;
      const reply = response?.reply || '';
      enqueueMessage({ type: 'task', text: reply || FALLBACKS.task, meta: metaWithStep });
    } catch (error) {
      if (handleLimitReached(error)) return;
      enqueueMessage({ type: 'task', text: FALLBACKS.task, meta: { ...meta, step } });
    } finally {
      setThinkingDelta(-1);
    }
  };

  const fetchTopicsAndAsk = async () => {
    if (!sessionOwnerRef.current) return;
    setThinkingDelta(1);
    try {
      const topicRes = await api.getHardTopics({
        collegeName: dataRef.current.collegeName,
        courseName: dataRef.current.courseName,
      });

      const nextTopics = Array.isArray(topicRes?.topics) ? topicRes.topics : [];
      if (nextTopics.length === 0) {
        enqueueMessage({ type: 'task', text: FALLBACKS.topics });
        setTaskStepSafe(TASK_STEPS.ASK_COURSE);
        setShowTopics(false);
        setTopicsSafe([]);
        return;
      }

      setTopicsSafe(nextTopics);
      setTaskStepSafe(TASK_STEPS.TOPICS_READY);
    } catch (error) {
      enqueueMessage({ type: 'task', text: FALLBACKS.topics });
      setTaskStepSafe(TASK_STEPS.ASK_COURSE);
      setShowTopics(false);
      setTopicsSafe([]);
    } finally {
      setThinkingDelta(-1);
    }
  };

  const startLessonGeneration = async (selectedTopic) => {
    if (!sessionOwnerRef.current) return;
    if (limitReachedRef.current) return;
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
      setTaskStepSafe(TASK_STEPS.SHOW_TOPICS);
      setShowTopics(true);
    }
  };

  const processTaskResponse = (text, turnId) => {
    const step = taskStepRef.current;

    if (step === TASK_STEPS.ASK_COLLEGE) {
      updateData({ collegeName: text });
      setTaskStepSafe(TASK_STEPS.ASK_COURSE);
      requestTaskMessage(TASK_STEPS.ASK_COURSE);
      return true;
    }

    if (step === TASK_STEPS.ASK_COURSE) {
      updateData({ courseName: text });
      setTaskStepSafe(TASK_STEPS.WAIT_TOPICS);
      fetchTopicsAndAsk();
      return false;
    }

    if (step === TASK_STEPS.SHOW_TOPICS) {
      updateData({ topic: text });
      setShowTopics(false);
      setTaskStepSafe(TASK_STEPS.WAIT_JOB);
      startLessonGeneration(text);
      return false;
    }
    return false;
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
    dropQueuedChat();
    flushQueue();

    const turnId = ++turnCounterRef.current;

    if (!gateConvincedRef.current) {
      requestGatekeeper(turnId);
      return;
    }

    // Determine if we should process this as a task response or chat
    const currentStep = taskStepRef.current;

    if (currentStep === TASK_STEPS.TOPICS_READY) {
      setTaskStepSafe(TASK_STEPS.SHOW_TOPICS);
      requestTaskMessage(TASK_STEPS.SHOW_TOPICS);
      return;
    }

    if (currentStep === TASK_STEPS.JOB_DONE) {
      setTaskStepSafe(TASK_STEPS.FINAL_MESSAGE);
      requestTaskMessage(TASK_STEPS.FINAL_MESSAGE, { final: true, redirectUrl: redirectUrlRef.current });
      return;
    }

    const isTaskInputStep = [TASK_STEPS.ASK_COLLEGE, TASK_STEPS.ASK_COURSE, TASK_STEPS.SHOW_TOPICS].includes(currentStep);

    if (isTaskInputStep) {
      const sentMessage = processTaskResponse(trimmed, turnId);
      if (sentMessage) return;
    }

    requestChatResponse(turnId);
  };

  useEffect(() => {
    if (taskStep !== TASK_STEPS.WAIT_JOB || !jobId) return;
    if (!sessionOwnerRef.current) return;

    let pollInterval;

    pollInterval = setInterval(async () => {
      try {
        const status = await api.getLessonStatus(jobId);
        if (status.status === 'completed') {
          clearInterval(pollInterval);
          setIsJobRunning(false);
          redirectUrlRef.current = status.resultUrl || status.redirectUrl || (status.courseId ? `/courses/${status.courseId}?preview=1&jobId=${jobId}` : '/dashboard');
          setTaskStepSafe(TASK_STEPS.JOB_DONE);
        } else if (status.status === 'failed') {
          clearInterval(pollInterval);
          setIsJobRunning(false);
          enqueueMessage({ type: 'task', text: FALLBACKS.status });
          setTaskStepSafe(TASK_STEPS.SHOW_TOPICS);
          setShowTopics(true);
        }
      } catch (error) {
        clearInterval(pollInterval);
        setIsJobRunning(false);
        enqueueMessage({ type: 'task', text: FALLBACKS.status });
        setTaskStepSafe(TASK_STEPS.SHOW_TOPICS);
        setShowTopics(true);
      }
    }, 1500);

    return () => {
      clearInterval(pollInterval);
    };
  }, [taskStep, jobId]);

  const isInputDisabled = isRedirecting || chatEnded || limitReached;

  // Handler for confirming college (user clicked "Yes")
  const handleCollegeConfirm = () => {
    if (!collegeConfirmation || chatEndedRef.current || limitReachedRef.current) return;

    addUserMessage('Yes');
    setCollegeConfirmation(null);
    setShowCollegeInput(false);

    if (!hasStarted) {
      void ensureOnboardingSession();
    }

    pendingBotRef.current = true;
    dropQueuedChat();
    flushQueue();

    const turnId = ++turnCounterRef.current;

    // Process as if user confirmed the college
    updateData({ collegeName: collegeConfirmation });
    setTaskStepSafe(TASK_STEPS.ASK_COURSE);
    requestTaskMessage(TASK_STEPS.ASK_COURSE);
    requestChatResponse(turnId);
  };

  // Handler for declining college confirmation (user clicked "No")
  const handleCollegeDecline = () => {
    if (chatEndedRef.current || limitReachedRef.current) return;
    setShowCollegeInput(true);
  };

  // Handler for submitting a different college name
  const handleCollegeSubmit = (collegeName) => {
    if (chatEndedRef.current || limitReachedRef.current) return;
    addUserMessage(collegeName);
    setCollegeConfirmation(null);
    setShowCollegeInput(false);

    if (!hasStarted) {
      void ensureOnboardingSession();
    }

    pendingBotRef.current = true;
    dropQueuedChat();
    flushQueue();

    const turnId = ++turnCounterRef.current;

    updateData({ collegeName });
    setTaskStepSafe(TASK_STEPS.ASK_COURSE);
    requestTaskMessage(TASK_STEPS.ASK_COURSE);
    requestChatResponse(turnId);
  };

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
          {limitReached && (
            <Link
              href="/auth/create-account"
              className="px-5 py-2 text-sm font-medium rounded-xl border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-all"
            >
              Create account
            </Link>
          )}
          <Link
            href="/auth/sign-in"
            className="px-5 py-2 text-sm font-medium rounded-xl bg-[var(--primary)] text-white border border-transparent hover:bg-transparent hover:text-[var(--foreground)] hover:border-[var(--border)] transition-all"
          >
            Sign in
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

          {/* College confirmation buttons */}
          {collegeConfirmation && !showCollegeInput && !isThinking && !chatEnded && !limitReached && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-4"
            >
              <button
                onClick={handleCollegeConfirm}
                className="px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity"
              >
                Yes
              </button>
              <button
                onClick={handleCollegeDecline}
                className="px-6 py-2.5 rounded-xl bg-[var(--surface-1)] border border-white/10 text-[var(--foreground)] font-medium hover:bg-[var(--surface-2)] transition-colors"
              >
                No
              </button>
            </motion.div>
          )}

          {/* College input when user clicked "No" */}
          {showCollegeInput && !isThinking && !chatEnded && !limitReached && (
            <CollegeInputForm onSubmit={handleCollegeSubmit} />
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
