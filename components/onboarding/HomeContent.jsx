'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import * as api from '@/lib/onboarding';
import { supabase } from '@/lib/supabase/client';

const REFERRAL_STORAGE_KEY = "kogno_ref";
const REFERRAL_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ONBOARDING_SESSION_KEY = "kogno_onboarding_session_v1";
const ONBOARDING_SESSION_VERSION = 4;
const ONBOARDING_TAB_KEY = "kogno_onboarding_tab_id";
const CHAT_ENDED_MESSAGE = "This chat has ended.";
const LIMIT_REACHED_MESSAGE =
  "You have hit the limit on the number of attempts you can use this feature.";
const CREATE_ACCOUNT_ACCESS_COOKIE = "kogno_onboarding_create_account";
const MAX_NEGOTIATION_OFFERS = 6;
const MIN_NEGOTIATION_PRICE_CENTS = 100;
const TRIAL_OFFER_MESSAGE =
  "Ok, how about this. I'll let you try it for a week - no credit card. We can set pricing aside while you try it, or keep talking price if you want. Come back next week and we can finish this.";
const INTRO_FALLBACKS = {
  reason:
    "Hey! I'm Kogno, what brought you here today? Exam coming up? Friend brought you here? Or just trying to learn something?",
  askUseful: "Got it. What are you hoping to get out of this?",
  explain:
    "Kogno turns your class into a tight study plan with lessons, practice, and exams in one place. List price is $100/month. How does that sound?",
  price: "List price is $100/month. How does that sound?",
  demo: "We don't do demos. List price is $100/month. How does that sound?",
};

const NEGOTIATION_STEPS = {
  NONE: 'NONE',
  INTRO_REASON: 'INTRO_REASON',
  INTRO_ASK_USEFUL: 'INTRO_ASK_USEFUL',
  NEGOTIATING: 'NEGOTIATING',
  AWAITING_CONFIRMATION: 'AWAITING_CONFIRMATION',
  PRICE_CONFIRMED: 'PRICE_CONFIRMED',
  PAYMENT_COMPLETE: 'PAYMENT_COMPLETE',
  DONE: 'DONE',
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

export default function HomeContent({ variant = 'page' }) {
  const isOverlay = variant === 'overlay';
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [negotiationStep, setNegotiationStep] = useState(NEGOTIATION_STEPS.NONE);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [chatEnded, setChatEnded] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(10000);
  const [confirmedPrice, setConfirmedPrice] = useState(null);
  const [paymentLink, setPaymentLink] = useState(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [offerHistory, setOfferHistory] = useState([]);
  const [trialStatus, setTrialStatus] = useState('none');
  const [trialOfferCents, setTrialOfferCents] = useState(null);
  const [trialEndsAt, setTrialEndsAt] = useState(null);
  const [trialDeclined, setTrialDeclined] = useState(false);
  const [trialExpiredAcknowledged, setTrialExpiredAcknowledged] = useState(false);
  const [isContinuingFree, setIsContinuingFree] = useState(false);
  const [negotiationStatusLoaded, setNegotiationStatusLoaded] = useState(false);

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
  const pendingNegotiationResponsesRef = useRef(new Map());
  const negotiationTurnCounterRef = useRef(0);
  const nextNegotiationTurnRef = useRef(1);
  const limitReachedRef = useRef(false);
  const negotiationStepRef = useRef(NEGOTIATION_STEPS.NONE);
  const awaitingConfirmationRef = useRef(false);
  const pendingRequestsRef = useRef(0);
  const redirectUrlRef = useRef(null);
  const flowCompleteRef = useRef(false);
  const introInFlightRef = useRef(false);
  const introQueueRef = useRef([]);
  const offerHistoryRef = useRef([]);
  const trialStatusRef = useRef('none');
  const trialOfferCentsRef = useRef(null);
  const trialEndsAtRef = useRef(null);
  const trialDeclinedRef = useRef(false);
  const latestOfferCentsRef = useRef(null);
  const negotiationSyncTimerRef = useRef(null);
  const negotiationSyncInFlightRef = useRef(false);
  const negotiationSyncQueuedRef = useRef(false);

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

  const resolveOfferCents = (value) => {
    if (!Number.isFinite(value)) return null;
    const rounded = Math.round(value);
    return Math.max(rounded, MIN_NEGOTIATION_PRICE_CENTS);
  };

  const rememberLatestOffer = (value) => {
    const resolved = resolveOfferCents(value);
    if (resolved === null) return null;
    latestOfferCentsRef.current = resolved;
    return resolved;
  };

  const getNegotiationFallback = () => {
    const resolved =
      Number.isFinite(currentPrice) && currentPrice > 0
        ? Math.max(currentPrice, MIN_NEGOTIATION_PRICE_CENTS)
        : 10000;
    return `Price is ${formatPrice(resolved)}/mo. How does that sound?`;
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
        redirectUrl: overrides.redirectUrl ?? redirectUrlRef.current,
        hasStarted: overrides.hasStarted ?? hasStarted,
        currentPrice: overrides.currentPrice ?? currentPrice,
        confirmedPrice: overrides.confirmedPrice ?? confirmedPrice,
        paymentLink: overrides.paymentLink ?? paymentLink,
        awaitingConfirmation: overrides.awaitingConfirmation ?? awaitingConfirmationRef.current,
        offerHistory: overrides.offerHistory ?? offerHistoryRef.current,
        trialStatus: overrides.trialStatus ?? trialStatusRef.current,
        trialOfferCents: overrides.trialOfferCents ?? trialOfferCentsRef.current,
        trialEndsAt: overrides.trialEndsAt ?? trialEndsAtRef.current,
        trialDeclined: overrides.trialDeclined ?? trialDeclinedRef.current,
      };
      window.localStorage.setItem(ONBOARDING_SESSION_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Unable to persist onboarding session:', error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

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

    if (typeof stored.awaitingConfirmation === 'boolean') {
      setAwaitingConfirmationSafe(stored.awaitingConfirmation);
    }

    if (Array.isArray(stored.offerHistory)) {
      setOfferHistorySafe(stored.offerHistory);
    }

    if (stored.trialStatus) {
      setTrialStatusSafe(stored.trialStatus);
    }

    if (typeof stored.trialOfferCents === 'number') {
      setTrialOfferCentsSafe(stored.trialOfferCents);
    }

    if (stored.trialEndsAt) {
      setTrialEndsAtSafe(stored.trialEndsAt);
    }
    if (typeof stored.trialDeclined === 'boolean') {
      setTrialDeclinedSafe(stored.trialDeclined);
    }

  }, []);

  useEffect(() => {
    let mounted = true;
    const loadNegotiationStatus = async () => {
      try {
        const status = await api.getNegotiationStatus();
        if (!mounted || !status) return;

        if (Array.isArray(status.negotiationHistory) && status.negotiationHistory.length > 0) {
          const restored = status.negotiationHistory.map((msg, index) => ({
            type: msg.role === 'user' ? 'user' : 'bot',
            text: msg.content,
            id: Date.now() + index + Math.random(),
          }));
          const synced = syncMessages(restored);
          setMessages(synced);
          setHasStarted(true);
          onboardingSessionStartedRef.current = true;
          restoredSessionRef.current = true;
          sessionActiveRef.current = true;
          sessionOwnerRef.current = true;
          if (!sessionIdRef.current) {
            sessionIdRef.current = generateSessionId();
          }
        }

        if (typeof status.confirmedPrice === 'number') {
          setConfirmedPrice(status.confirmedPrice);
          setCurrentPrice(Math.max(status.confirmedPrice, MIN_NEGOTIATION_PRICE_CENTS));
        }

        if (status.paymentLink) {
          setPaymentLink(status.paymentLink);
        }

        if (Array.isArray(status.offerHistory)) {
          setOfferHistorySafe(status.offerHistory);
          if (!status.lastOfferCents && status.offerHistory.length > 0) {
            const lastOffer = status.offerHistory[status.offerHistory.length - 1];
            if (typeof lastOffer === 'number') {
              setCurrentPrice(Math.max(lastOffer, MIN_NEGOTIATION_PRICE_CENTS));
            }
          }
        }

        if (status.lastOfferCents && typeof status.lastOfferCents === 'number') {
          setCurrentPrice(Math.max(status.lastOfferCents, MIN_NEGOTIATION_PRICE_CENTS));
        }

        if (typeof status.trialOfferCents === 'number') {
          const clampedTrial = Math.max(status.trialOfferCents, MIN_NEGOTIATION_PRICE_CENTS);
          setTrialOfferCentsSafe(clampedTrial);
          if (!status.lastOfferCents) {
            setCurrentPrice(clampedTrial);
          }
        }

        if (status.trialStatus) {
          setTrialStatusSafe(status.trialStatus);
          if (status.trialStatus === 'expired') {
            setNegotiationStepSafe(NEGOTIATION_STEPS.NEGOTIATING);
          }
        }

        if (status.trialEndsAt) {
          setTrialEndsAtSafe(status.trialEndsAt);
        }

        const hasNegotiationState =
          Boolean(status.confirmedPrice || status.paymentLink) ||
          (status.trialStatus && status.trialStatus !== 'none');
        if (hasNegotiationState) {
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
      } finally {
        if (mounted) {
          setNegotiationStatusLoaded(true);
        }
      }
    };

    loadNegotiationStatus();
    return () => {
      mounted = false;
    };
  }, []);

  // Initial greeting
  useEffect(() => {
    if (!negotiationStatusLoaded) return;
    if (restoredSessionRef.current) return;
    if (messagesRef.current.length > 0) return;
    if (onboardingSessionStartedRef.current) return;
    if (trialStatusRef.current && trialStatusRef.current !== 'none') return;
    const timer = setTimeout(() => {
      setNegotiationStepSafe(NEGOTIATION_STEPS.INTRO_REASON);
      requestIntroMessage(NEGOTIATION_STEPS.INTRO_REASON);
    }, 400);
    return () => clearTimeout(timer);
  }, [negotiationStatusLoaded]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  useEffect(() => {
    if (!sessionActiveRef.current) return;
    persistSession();
  }, [
    messages,
    negotiationStep,
    hasStarted,
    currentPrice,
    confirmedPrice,
    paymentLink,
    awaitingConfirmation,
    offerHistory,
    trialStatus,
    trialOfferCents,
    trialEndsAt,
    trialDeclined,
  ]);

  useEffect(() => {
    setTrialExpiredAcknowledged(false);
  }, [trialStatus]);

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
    const message = { type: 'bot', text, id: Date.now() + Math.random(), meta };
    appendMessage(message);
    scheduleNegotiationSync();

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
    setIsRedirecting(false);
    queueRef.current = [];
    introInFlightRef.current = false;
    introQueueRef.current = [];
    setAwaitingConfirmationSafe(false);
    setTrialStatusSafe('none');
    setTrialOfferCentsSafe(null);
    setTrialEndsAtSafe(null);
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
    scheduleNegotiationSync();
  };

  const setNegotiationStepSafe = (next) => {
    negotiationStepRef.current = next;
    setNegotiationStep(next);
  };

  const setAwaitingConfirmationSafe = (next) => {
    awaitingConfirmationRef.current = next;
    setAwaitingConfirmation(next);
  };

  const setOfferHistorySafe = (next) => {
    offerHistoryRef.current = Array.isArray(next) ? next : [];
    setOfferHistory(offerHistoryRef.current);
  };

  const setTrialStatusSafe = (next) => {
    trialStatusRef.current = next || 'none';
    setTrialStatus(trialStatusRef.current);
  };

  const setTrialOfferCentsSafe = (next) => {
    trialOfferCentsRef.current = typeof next === 'number' ? next : null;
    setTrialOfferCents(trialOfferCentsRef.current);
  };

  const setTrialEndsAtSafe = (next) => {
    trialEndsAtRef.current = next || null;
    setTrialEndsAt(trialEndsAtRef.current);
  };

  const setTrialDeclinedSafe = (next) => {
    trialDeclinedRef.current = Boolean(next);
    setTrialDeclined(trialDeclinedRef.current);
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
    setIsRedirecting(false);
    queueRef.current = [];
    setAwaitingConfirmationSafe(false);
    addBotMessage(message, 'chat');
    return true;
  };

  const resetSessionState = () => {
    messagesRef.current = [];
    setMessages([]);
    setInput('');
    setIsRedirecting(false);
    setHasStarted(false);
    setNegotiationStepSafe(NEGOTIATION_STEPS.NONE);
    setCurrentPrice(10000);
    setConfirmedPrice(null);
    setPaymentLink(null);
    setAwaitingConfirmationSafe(false);
    setOfferHistorySafe([]);
    setTrialStatusSafe('none');
    setTrialOfferCentsSafe(null);
    setTrialEndsAtSafe(null);
    setTrialDeclinedSafe(false);
    pendingRequestsRef.current = 0;
    setIsThinking(false);
    introInFlightRef.current = false;
    introQueueRef.current = [];
    queueRef.current = [];
    redirectUrlRef.current = null;
    flowCompleteRef.current = false;
    pendingNegotiationResponsesRef.current = new Map();
    negotiationTurnCounterRef.current = 0;
    nextNegotiationTurnRef.current = 1;
    offerHistoryRef.current = [];
    trialStatusRef.current = 'none';
    trialOfferCentsRef.current = null;
    trialEndsAtRef.current = null;
    trialDeclinedRef.current = false;
    latestOfferCentsRef.current = null;
    if (negotiationSyncTimerRef.current) {
      clearTimeout(negotiationSyncTimerRef.current);
      negotiationSyncTimerRef.current = null;
    }
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
    persistSession({ status: 'active', hasStarted: true });
  };

  const shouldStartFreshSession = () => {
    initTabId();
    if (messagesRef.current.length > 0) return false;
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

  const buildNegotiationSyncPayload = () => {
    const history = buildLlmMessages();
    const offers = Array.isArray(offerHistoryRef.current) ? offerHistoryRef.current : [];
    const lastOffer = offers.length > 0 ? offers[offers.length - 1] : currentPrice;
    const clampedLastOffer = Number.isFinite(lastOffer)
      ? Math.max(lastOffer, MIN_NEGOTIATION_PRICE_CENTS)
      : null;
    return {
      messages: history,
      offerHistory: offers,
      offerCount: offers.length,
      lastOfferCents: clampedLastOffer,
      trialStatus: trialStatusRef.current,
      trialOfferCents: trialOfferCentsRef.current,
    };
  };

  const runNegotiationSync = async () => {
    if (!sessionActiveRef.current || !sessionOwnerRef.current) return;
    if (negotiationSyncInFlightRef.current) {
      negotiationSyncQueuedRef.current = true;
      return;
    }
    negotiationSyncInFlightRef.current = true;
    const payload = buildNegotiationSyncPayload();
    try {
      await api.syncNegotiationState(payload);
    } catch (error) {}
    negotiationSyncInFlightRef.current = false;
    if (negotiationSyncQueuedRef.current) {
      negotiationSyncQueuedRef.current = false;
      runNegotiationSync();
    }
  };

  const scheduleNegotiationSync = () => {
    if (!sessionActiveRef.current || !sessionOwnerRef.current) return;
    if (negotiationSyncTimerRef.current) {
      clearTimeout(negotiationSyncTimerRef.current);
    }
    negotiationSyncTimerRef.current = setTimeout(runNegotiationSync, 600);
  };

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
    queueRef.current.push(entry);

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
    scheduleNegotiationSync();
  };

  const getOfferCount = () => {
    const offers = Array.isArray(offerHistoryRef.current) ? offerHistoryRef.current : [];
    return offers.length;
  };

  const canOfferTrial = () => getOfferCount() >= MAX_NEGOTIATION_OFFERS && !trialDeclinedRef.current;

  const getNegotiationMeta = () => {
    const offers = Array.isArray(offerHistoryRef.current) ? offerHistoryRef.current : [];
    return {
      offerCount: offers.length,
      lastOfferCents: offers.length > 0 ? offers[offers.length - 1] : null,
      trialStatus: trialStatusRef.current,
      trialDeclined: trialDeclinedRef.current,
    };
  };

  const extractPriceFromReply = (parts) => {
    const text = Array.isArray(parts) ? parts.join(' ') : String(parts || '');
    if (!text) return null;
    const match = text.match(/\$?\s*(\d{1,3}(?:\.\d{1,2})?)\s*(?:\/\s*mo(?:nth)?|per\s*month|monthly|\/\s*month|mo\b)/i);
    if (!match) return null;
    const value = Number(match[1]);
    if (!Number.isFinite(value)) return null;
    return Math.round(value * 100);
  };

  const getOfferCentsFromMessage = (message) => {
    if (!message || message.type !== 'bot') return null;
    if (Number.isFinite(message.meta?.offerCents)) return message.meta.offerCents;
    const inferred = extractPriceFromReply([message.text]);
    return resolveOfferCents(inferred);
  };

  const isTrialOfferMessage = (message) => {
    if (!message || message.type !== 'bot') return false;
    if (message.meta?.offerType === 'trial') return true;
    if (typeof message.text !== 'string') return false;
    return message.text === TRIAL_OFFER_MESSAGE || message.text.includes('try it for a week');
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
        negotiation: getNegotiationMeta(),
      });

      const fallback =
        step === NEGOTIATION_STEPS.INTRO_ASK_USEFUL
          ? INTRO_FALLBACKS.askUseful
          : INTRO_FALLBACKS.reason;
      const replyParts = extractReplyParts(response, fallback);
      const offerCents = rememberLatestOffer(extractPriceFromReply(replyParts));
      const offerTrial = Boolean(response?.offerTrial);
      const nextStep = response?.nextStep;
      const validSteps = new Set(Object.values(NEGOTIATION_STEPS));
      const resolvedStep = validSteps.has(nextStep) ? nextStep : step;

      if (offerTrial && canOfferTrial()) {
        enterTrialOffer(offerCents ?? currentPrice);
        return;
      }

      enqueueReplyParts('chat', replyParts, offerCents ? { offerCents, offerType: 'price' } : {});

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
      const wantsHelp = /(help|tutor|homework|study|physics|chemistry|biology|math|calculus|algebra|organic|economics|history|english|programming|cs|computer science|coding)/.test(
        normalized
      );
      let fallback = INTRO_FALLBACKS.reason;
      let fallbackStep = step;
      if (wantsDemo) {
        fallback = INTRO_FALLBACKS.demo;
        fallbackStep = NEGOTIATION_STEPS.NEGOTIATING;
      } else if (wantsHelp) {
        fallback =
          "Yeah, I can help with that. Kogno builds a focused plan from your syllabus—one of our backend folks used it for physics last quarter and pulled a 98 after a few hours a week. List price is $100/month. How does that sound?";
        fallbackStep = NEGOTIATION_STEPS.NEGOTIATING;
      } else if (asksWhat) {
        fallback = INTRO_FALLBACKS.explain;
        fallbackStep = NEGOTIATION_STEPS.NEGOTIATING;
      } else if (asksPrice) {
        fallback = INTRO_FALLBACKS.price;
        fallbackStep = NEGOTIATION_STEPS.NEGOTIATING;
      } else if (step === NEGOTIATION_STEPS.INTRO_ASK_USEFUL) {
        fallback = INTRO_FALLBACKS.askUseful;
      }
      const fallbackOfferCents = rememberLatestOffer(extractPriceFromReply([fallback]));
      enqueueReplyParts(
        'chat',
        [fallback],
        fallbackOfferCents ? { offerCents: fallbackOfferCents, offerType: 'price' } : {}
      );
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

  const enterTrialOffer = (offerCents) => {
    if (trialStatusRef.current === 'active' || trialStatusRef.current === 'offered') return;
    const resolvedOffer = Number.isFinite(offerCents)
      ? Math.max(offerCents, MIN_NEGOTIATION_PRICE_CENTS)
      : Math.max(currentPrice, MIN_NEGOTIATION_PRICE_CENTS);
    const latestOfferCents = rememberLatestOffer(resolvedOffer);
    setTrialOfferCentsSafe(resolvedOffer);
    setTrialStatusSafe('offered');
    setAwaitingConfirmationSafe(false);
    setTrialDeclinedSafe(false);
    enqueueReplyParts(
      'chat',
      [TRIAL_OFFER_MESSAGE],
      latestOfferCents ? { offerCents: latestOfferCents, offerType: 'trial' } : { offerType: 'trial' }
    );
    scheduleNegotiationSync();
    return true;
  };

  const trackOfferHistory = (priceCents) => {
    if (!Number.isFinite(priceCents)) return;
    const clamped = Math.max(priceCents, MIN_NEGOTIATION_PRICE_CENTS);
    setCurrentPrice(clamped);
    const existing = Array.isArray(offerHistoryRef.current) ? offerHistoryRef.current : [];
    if (existing.includes(clamped)) return;
    const next = [...existing, clamped];
    setOfferHistorySafe(next);
    if (next.length >= MAX_NEGOTIATION_OFFERS && trialStatusRef.current === 'none' && canOfferTrial()) {
      return enterTrialOffer(clamped);
    }
    return false;
  };

  const processNegotiationPayload = (payload) => {
    if (!payload) return true;
    if (trialStatusRef.current === 'offered' || trialStatusRef.current === 'active') {
      return true;
    }
    let replyParts = Array.isArray(payload.replyParts) && payload.replyParts.length > 0
      ? payload.replyParts
      : [getNegotiationFallback()];
    let suggestedPrice = payload.suggestedPrice;
    const inferredOffer = (suggestedPrice === null || suggestedPrice === undefined)
      ? extractPriceFromReply(replyParts)
      : null;
    const latestOfferCents = rememberLatestOffer(suggestedPrice ?? inferredOffer);
    if ((suggestedPrice === null || suggestedPrice === undefined) && Number.isFinite(inferredOffer)) {
      suggestedPrice = inferredOffer;
    }
    const askConfirmation = Boolean(payload.askConfirmation);
    const offerTrial = Boolean(payload.offerTrial);
    const trialBlocked = !canOfferTrial();
    if (trialBlocked) {
      const filtered = replyParts.filter((part) => !/trial|no credit card|free week/i.test(part));
      if (filtered.length !== replyParts.length) {
        replyParts = filtered.length > 0 ? filtered : [getNegotiationFallback()];
      }
    }

    if (Number.isFinite(suggestedPrice)) {
      const currentOffer = Number.isFinite(currentPrice) ? currentPrice : null;
      if (
        currentOffer !== null &&
        Array.isArray(offerHistoryRef.current) &&
        offerHistoryRef.current.length > 0 &&
        suggestedPrice > currentOffer
      ) {
        suggestedPrice = currentOffer;
      }
      const didAutoOffer = trackOfferHistory(suggestedPrice);
      if (didAutoOffer) {
        return true;
      }
    }

    if (offerTrial && trialBlocked && replyParts.length === 0) {
      replyParts = [getNegotiationFallback()];
    }

    if (offerTrial && canOfferTrial()) {
      enterTrialOffer(latestOfferCents ?? suggestedPrice ?? currentPrice);
      return true;
    }

    if (askConfirmation) {
      setAwaitingConfirmationSafe(true);
      setNegotiationStepSafe(NEGOTIATION_STEPS.AWAITING_CONFIRMATION);
    } else if (negotiationStepRef.current === NEGOTIATION_STEPS.AWAITING_CONFIRMATION) {
      setAwaitingConfirmationSafe(false);
      setNegotiationStepSafe(NEGOTIATION_STEPS.NEGOTIATING);
    } else if (negotiationStepRef.current === NEGOTIATION_STEPS.NONE) {
      setNegotiationStepSafe(NEGOTIATION_STEPS.NEGOTIATING);
    }

    enqueueReplyParts('chat', replyParts, latestOfferCents ? { offerCents: latestOfferCents, offerType: 'price' } : {});
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
        negotiation: getNegotiationMeta(),
      });

      const replyParts = extractReplyParts(response, getNegotiationFallback());
      const suggestedPriceRaw = response?.suggestedPrice;
      let suggestedPrice = null;
      if (suggestedPriceRaw !== null && suggestedPriceRaw !== undefined && suggestedPriceRaw !== '') {
        const parsed = typeof suggestedPriceRaw === 'string'
          ? Number(suggestedPriceRaw.trim())
          : Number(suggestedPriceRaw);
        if (Number.isFinite(parsed)) {
          suggestedPrice = Math.round(parsed);
        }
      }
      if (suggestedPrice !== null && suggestedPrice < 100) {
        suggestedPrice = Math.round(suggestedPrice * 100);
      }
      if (suggestedPrice !== null && suggestedPrice < MIN_NEGOTIATION_PRICE_CENTS) {
        suggestedPrice = MIN_NEGOTIATION_PRICE_CENTS;
      }
      const askConfirmation = Boolean(response?.askConfirmation);
      const offerTrial = Boolean(response?.offerTrial);

      queueNegotiationResponse(turnId, {
        replyParts,
        suggestedPrice,
        askConfirmation,
        offerTrial,
      });
    } catch (error) {
      if (handleLimitReached(error)) return;
      queueNegotiationResponse(turnId, {
        replyParts: [getNegotiationFallback()],
        suggestedPrice: null,
        askConfirmation: false,
        offerTrial: false,
      });
    } finally {
      setThinkingDelta(-1);
    }
  };

  const handleConfirmPrice = async (price) => {
    if (!price || limitReachedRef.current) return;
    if (price < MIN_NEGOTIATION_PRICE_CENTS) {
      addBotMessage(`Minimum is ${formatPrice(MIN_NEGOTIATION_PRICE_CENTS)}/mo.`, 'chat');
      return;
    }
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
    } catch (error) {
      addBotMessage('I could not lock that price. Try again.', 'chat');
    } finally {
      setThinkingDelta(-1);
    }
  };

  const startTrial = async () => {
    if (trialStatusRef.current !== 'offered' || limitReachedRef.current) return;
    setThinkingDelta(1);
    try {
      const offers = Array.isArray(offerHistoryRef.current) ? offerHistoryRef.current : [];
      const lastOffer = offers.length > 0 ? offers[offers.length - 1] : currentPrice;
      const resolvedTrialOffer = Math.max(
        trialOfferCentsRef.current ?? lastOffer ?? MIN_NEGOTIATION_PRICE_CENTS,
        MIN_NEGOTIATION_PRICE_CENTS
      );
      const response = await api.startNegotiationTrial({
        trialOfferCents: resolvedTrialOffer,
        messages: buildLlmMessages(),
        offerHistory: offers,
        offerCount: offers.length,
        lastOfferCents: lastOffer,
      });
      setTrialStatusSafe(response?.trialStatus || 'active');
      setTrialOfferCentsSafe(
        typeof response?.trialOfferCents === 'number' ? response.trialOfferCents : trialOfferCentsRef.current
      );
      setTrialEndsAtSafe(response?.trialEndsAt || null);
      setAwaitingConfirmationSafe(false);
      router.push('/dashboard');
    } catch (error) {
      addBotMessage('Could not start the trial. Try again.', 'chat');
    } finally {
      setThinkingDelta(-1);
    }
  };

  const continueWithFreePlan = async () => {
    if (isContinuingFree || limitReachedRef.current) return;
    setIsContinuingFree(true);
    try {
      const response = await api.continueWithFreePlan();
      setTrialStatusSafe(response?.trialStatus || 'expired_free');
      setAwaitingConfirmationSafe(false);
      addBotMessage(
        'All set. You can keep using Kogno on the free plan with limits.',
        'chat'
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kogno:trial-gate-dismiss'));
      }
      if (!isOverlay) {
        router.push('/dashboard');
      }
    } catch (error) {
      addBotMessage('Could not switch to the free plan. Try again.', 'chat');
    } finally {
      setIsContinuingFree(false);
    }
  };

  const continueExpiredChat = () => {
    if (trialExpiredAcknowledged) return;
    setTrialExpiredAcknowledged(true);
    addBotMessage("Alright, let's keep talking price.", "chat");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/create-account');
  };

  const respondToUserMessage = async (trimmed) => {
    const currentStep = negotiationStepRef.current;
    const normalized = trimmed.toLowerCase();

    if (trialStatusRef.current === 'offered') {
      const declineTrial =
        /\b(no|nah|not now|pass|skip|keep negotiating|continue|keep talking|keep discussing|talk price|price|negotiate)\b/.test(
          normalized
        );
      if (!declineTrial) {
        enqueueMessage({
          type: 'chat',
          text: "Use the 1-week trial button below if you want to try it. If you'd rather keep pricing, say so.",
        });
        return;
      }
      setTrialStatusSafe('none');
      setTrialDeclinedSafe(true);
      setAwaitingConfirmationSafe(false);
      setNegotiationStepSafe(NEGOTIATION_STEPS.NEGOTIATING);
    }

    if (trialStatusRef.current === 'active') {
      enqueueMessage({
        type: 'chat',
        text: "Your trial is active. Come back when the week is up and we'll settle on price.",
      });
      return;
    }

    if (trialDeclinedRef.current) {
      const wantsTrial = /\b(trial|try it|try it out|free week|week)\b/.test(normalized);
      if (wantsTrial) {
        enterTrialOffer(currentPrice);
        return;
      }
    }

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

    const words = normalized.split(/\s+/).filter(Boolean);
    const isExplicitAccept = /\b(confirm|deal|i'?m in|im in|i accept|i'll take it|ill take it)\b/.test(normalized);
    const hasAffirmation = /\b(yes|yep|yup|ok|okay|sure|confirm|deal|in)\b/.test(normalized);
    const hasNegation =
      /\b(no|nah|not|don't|do not|cant|can't|wont|won't|too much|too expensive|cannot)\b/.test(normalized);
    const hasCounterCue =
      /\b(how about|what if|if|unless|but|instead|can you|could you|lower|cheaper|discount|reduce|drop|offer)\b/.test(
        normalized
      );
    const currentDollars = Number.isFinite(currentPrice) ? Math.round(currentPrice / 100) : null;
    const mentionsCurrentPrice =
      currentDollars !== null && new RegExp(`\\b\\$?${currentDollars}\\b`).test(normalized);
    const mentionsAnyPrice = /\$?\d+(\.\d+)?/.test(normalized);
    const wantsDifferentPrice = mentionsAnyPrice && !mentionsCurrentPrice;
    const shortAffirmation = hasAffirmation && words.length <= 4;
    const shouldConfirm =
      !hasNegation &&
      !hasCounterCue &&
      !wantsDifferentPrice &&
      (isExplicitAccept || (shortAffirmation && (awaitingConfirmationRef.current || mentionsCurrentPrice)));

    if (shouldConfirm) {
      await handleConfirmPrice(currentPrice);
      return;
    }

    if (awaitingConfirmationRef.current) {
      setAwaitingConfirmationSafe(false);
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

    flushQueue();

    await respondToUserMessage(trimmed);
  };



  const showExpiredOfferActions =
    (trialStatus === 'expired' && trialExpiredAcknowledged) || trialStatus === 'expired_free';
  const showExpiredGateActions = trialStatus === 'expired' && !trialExpiredAcknowledged;
  const isInputDisabled =
    isRedirecting || chatEnded || limitReached || (trialStatus === 'expired' && !trialExpiredAcknowledged);
  const latestPriceOfferMessage = (() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (!message || message.type !== 'bot') continue;
      const offerCents = getOfferCentsFromMessage(message);
      if (Number.isFinite(offerCents) && message.meta?.offerType !== 'trial' && !isTrialOfferMessage(message)) {
        return { index: i, offerCents };
      }
    }
    return null;
  })();
  const latestTrialOfferMessage = (() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (!message || message.type !== 'bot') continue;
      if (isTrialOfferMessage(message)) {
        const offerCents = getOfferCentsFromMessage(message);
        return { index: i, offerCents };
      }
    }
    return null;
  })();
  const allowOfferActions =
    !showExpiredGateActions &&
    !isThinking &&
    !isRedirecting &&
    !chatEnded &&
    !limitReached &&
    negotiationStep !== NEGOTIATION_STEPS.PRICE_CONFIRMED &&
    negotiationStep !== NEGOTIATION_STEPS.PAYMENT_COMPLETE &&
    trialStatus !== 'active';
  const showFreeTrialAction = trialStatus === 'offered';
  const showFreeLimitedAction = showExpiredOfferActions;

  const containerClassName = isOverlay
    ? "relative h-full w-full min-h-0 rounded-3xl border border-white/10 bg-[var(--background)]/85 text-[var(--foreground)] flex flex-col overflow-hidden shadow-2xl"
    : "relative h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col overflow-hidden";

  return (
    <div className={containerClassName}>
      {!isOverlay && (
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
      )}

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-[var(--primary)]">
          <Image src="/images/kogno_logo.png" alt="Kogno" width={32} height={32} />
          Kogno
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="px-4 py-2 rounded-xl bg-[var(--surface-1)] border border-white/10 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
        >
          Sign out
        </button>
      </header>

      {/* Chat area - takes up remaining space */}
      <div
        ref={scrollContainerRef}
        className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6"
      >
        <div className="max-w-2xl mx-auto py-8">
          {/* Chat messages */}
          <AnimatePresence initial={false}>
            {messages.map((m, index) => {
              if (m.type === 'bot') {
                const isLatestPriceOffer =
                  allowOfferActions && trialStatus !== 'offered' && latestPriceOfferMessage?.index === index;
                const isLatestTrialOffer =
                  allowOfferActions && trialStatus === 'offered' && latestTrialOfferMessage?.index === index;
                const offerCents = isLatestPriceOffer ? latestPriceOfferMessage?.offerCents : null;
                return (
                  <div key={m.id}>
                    <BotMessage>{m.text}</BotMessage>
                    {isLatestPriceOffer && Number.isFinite(offerCents) && (
                      <div className="flex justify-start -mt-2 mb-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            onClick={() => handleConfirmPrice(offerCents)}
                            className="px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity"
                          >
                            Accept {formatPrice(offerCents)}/month
                          </button>
                          {showFreeLimitedAction && (
                            <button
                              onClick={continueWithFreePlan}
                              disabled={isContinuingFree}
                              className="px-6 py-2.5 rounded-xl border border-white/10 text-[var(--foreground)] font-medium hover:bg-[var(--surface-2)] transition-colors disabled:opacity-60"
                            >
                              {isContinuingFree ? 'Switching...' : 'Continue free (limited)'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    {isLatestTrialOffer && showFreeTrialAction && (
                      <div className="flex justify-start -mt-2 mb-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            onClick={startTrial}
                            className="px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity"
                          >
                            Accept free trial
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              return <UserMessage key={m.id}>{m.text}</UserMessage>;
            })}
          </AnimatePresence>

          {/* Loading indicator */}
          {isThinking && (
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

          {showExpiredGateActions && !isThinking && !chatEnded && !limitReached && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-2xl border border-white/10 bg-[var(--surface-1)] p-4"
            >
              <div className="text-sm font-medium text-[var(--foreground)]">
                Your trial ended
              </div>
              <div className="text-xs text-[var(--muted-foreground)] mt-1">
                Continue on the free plan with limited courses, exams, and cheatsheets.
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={continueWithFreePlan}
                  disabled={isContinuingFree}
                  className="px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {isContinuingFree ? 'Switching...' : 'Continue free (limited)'}
                </button>
                <button
                  onClick={continueExpiredChat}
                  className="px-6 py-2.5 rounded-xl border border-white/10 text-[var(--foreground)] font-medium hover:bg-[var(--surface-2)] transition-colors"
                >
                  Continue Chat
                </button>
              </div>
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
