'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/api';
import { generateAnonTopics, getAnonUserId } from '@/lib/onboarding';
import { BotMessage, UserMessage, TypingIndicator } from '@/components/chat/ChatMessage';
import { createMessageQueue, getMessageDelayMs, scrollToBottom } from '@/lib/chatHelpers';
import TopicApprovalSection from '@/components/onboarding/TopicApprovalSection';
import {
  getCourseChatCollegeFollowup,
  getCourseChatGreeting,
  getCourseChatRetryMessage,
  getTopicsLoadingMessage,
  getTopicsGeneratedMessage,
} from '@/components/courses/create/courseChatMessages';
import { interpolateMessage } from '@/components/courses/create/conversationFlow';
import { defaultTopicRating } from '@/app/courses/create/utils';

const STUDY_MODE = 'cram';
const STAGES = {
  COLLECTING: 'collecting',
  TOPICS_GENERATING: 'topics_generating',
  TOPICS_APPROVAL: 'topics_approval',
  COURSE_GENERATING: 'course_generating',
};

const normalizeOverviewTopics = (rawTopics) => {
  if (!Array.isArray(rawTopics)) return [];
  return rawTopics.map((module, index) => {
    const moduleId =
      typeof module?.id === 'string'
        ? module.id
        : typeof module?.module_id === 'string'
        ? module.module_id
        : `overview_${index + 1}`;
    const moduleTitle =
      typeof module === 'string'
        ? module
        : typeof module?.title === 'string'
        ? module.title
        : typeof module?.name === 'string'
        ? module.name
        : `Module ${index + 1}`;
    const rawSubtopics = Array.isArray(module?.subtopics)
      ? module.subtopics
      : Array.isArray(module?.lessons)
      ? module.lessons
      : Array.isArray(module?.topics)
      ? module.topics
      : [];
    const subtopics = rawSubtopics.map((subtopic, subIndex) => ({
      ...subtopic,
      id:
        typeof subtopic?.id === 'string'
          ? subtopic.id
          : `subtopic_${index + 1}_${subIndex + 1}`,
      title:
        typeof subtopic?.title === 'string'
          ? subtopic.title
          : typeof subtopic?.name === 'string'
          ? subtopic.name
          : `Topic ${subIndex + 1}`,
      familiarity: Number.isFinite(subtopic?.familiarity)
        ? subtopic.familiarity
        : defaultTopicRating,
    }));

    const baseModule = module && typeof module === 'object' ? module : {};
    return {
      ...baseModule,
      id: moduleId,
      title: moduleTitle,
      subtopics,
    };
  });
};

const normalizeTopicsPayload = (payload) => {
  const safePayload = payload && typeof payload === 'object' ? payload : {};
  return {
    ...safePayload,
    overviewTopics: normalizeOverviewTopics(
      safePayload.overviewTopics || safePayload.topics || []
    ),
  };
};

const buildInitialRatings = (overviewTopics) =>
  (overviewTopics || []).reduce((acc, topic) => {
    if (!topic?.id) return acc;
    const rating = Number.isFinite(topic?.familiarity)
      ? topic.familiarity
      : defaultTopicRating;
    acc[topic.id] = rating;
    return acc;
  }, {});

const parseCourseInfoLocal = (raw) => {
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  if (!text) return null;

  const atMatch = text.match(/(.+?)\s+at\s+(.+)/i);
  if (atMatch) {
    return { courseName: atMatch[1].trim(), university: atMatch[2].trim() };
  }

  const commaIndex = text.lastIndexOf(',');
  if (commaIndex > 0 && commaIndex < text.length - 1) {
    return {
      courseName: text.slice(0, commaIndex).trim(),
      university: text.slice(commaIndex + 1).trim(),
    };
  }

  const atSymbolIndex = text.lastIndexOf('@');
  if (atSymbolIndex > 0 && atSymbolIndex < text.length - 1) {
    return {
      courseName: text.slice(0, atSymbolIndex).trim(),
      university: text.slice(atSymbolIndex + 1).trim(),
    };
  }

  const dashIndex = text.lastIndexOf(' - ');
  if (dashIndex > 0 && dashIndex < text.length - 3) {
    return {
      courseName: text.slice(0, dashIndex).trim(),
      university: text.slice(dashIndex + 3).trim(),
    };
  }

  return null;
};

export default function SimplifiedOnboardingChat({ variant = 'page' }) {
  const isOverlay = variant === 'overlay';
  const router = useRouter();
  const initialMessageRef = useRef({
    type: 'bot',
    text: getCourseChatGreeting(),
    id: Date.now() + Math.random(),
    meta: {},
  });
  const [messages, setMessages] = useState([initialMessageRef.current]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isGenerationReplying, setIsGenerationReplying] = useState(false);
  const [pendingField, setPendingField] = useState(null);
  const [courseInfo, setCourseInfo] = useState({
    courseName: '',
    collegeName: '',
    studyMode: STUDY_MODE,
  });
  const [stage, setStage] = useState(STAGES.COLLECTING);
  const [topicsPayload, setTopicsPayload] = useState(null);
  const [familiarityRatings, setFamiliarityRatings] = useState({});
  const [isSavingTopics, setIsSavingTopics] = useState(false);
  const [topicError, setTopicError] = useState(null);

  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef([initialMessageRef.current]);
  const queueRef = useRef([]);
  const messageQueueTimerRef = useRef(null);
  const messageQueueActiveRef = useRef(false);
  const parseAttemptsRef = useRef(0);
  const anonUserIdRef = useRef(getAnonUserId());
  const topicsPayloadRef = useRef(topicsPayload);
  const ratingsRef = useRef(familiarityRatings);
  const persistTimerRef = useRef(null);
  const topicsMessageTimerRef = useRef(null);
  const topicsMessageIdRef = useRef(null);
  const generationHistoryRef = useRef([]);
  const generationIntroSentRef = useRef(false);

  const syncMessages = (next) => {
    messagesRef.current = next;
    return next;
  };

  const appendMessage = (message) => {
    setMessages((prev) => syncMessages([...prev, message]));
  };

  const addBotMessage = (text, type = 'chat', meta = {}) => {
    const message = { type: 'bot', text, id: Date.now() + Math.random(), meta };
    appendMessage(message);
  };

  const addUserMessage = (text) => {
    const message = { type: 'user', text, id: Date.now() + Math.random() };
    appendMessage(message);
  };

  const messageQueueRef = useRef(null);
  if (!messageQueueRef.current) {
    messageQueueRef.current = createMessageQueue({
      queueRef,
      isActiveRef: messageQueueActiveRef,
      timerRef: messageQueueTimerRef,
      onMessage: addBotMessage,
    });
  }

  const { enqueueReplyParts } = messageQueueRef.current;

  useEffect(() => {
    return () => {
      messageQueueRef.current?.clearMessageQueue();
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      if (topicsMessageTimerRef.current) {
        clearTimeout(topicsMessageTimerRef.current);
        topicsMessageTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    topicsPayloadRef.current = topicsPayload;
  }, [topicsPayload]);

  useEffect(() => {
    ratingsRef.current = familiarityRatings;
  }, [familiarityRatings]);

  useEffect(() => {
    scrollToBottom(scrollContainerRef);
  }, [messages, isThinking, isGenerationReplying]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  useEffect(() => {
    if (stage !== STAGES.COURSE_GENERATING || generationIntroSentRef.current) return;
    generationIntroSentRef.current = true;
    const introMessage = "I'm building your course now. Ask me anything while I work.";
    generationHistoryRef.current = [{ role: 'assistant', content: introMessage }];
    addBotMessage(introMessage);
  }, [stage]);

  const handleSignIn = () => {
    router.push('/auth/sign-in');
  };

  const handleParseFailure = () => {
    parseAttemptsRef.current += 1;
    enqueueReplyParts('chat', [getCourseChatRetryMessage(parseAttemptsRef.current)]);
  };

  const appendTopicsMessage = (delayMs = 0) => {
    if (topicsMessageIdRef.current) return;
    const publish = () => {
      if (topicsMessageIdRef.current) return;
      const id = Date.now() + Math.random();
      topicsMessageIdRef.current = id;
      appendMessage({ type: 'topics', id });
    };

    if (delayMs > 0) {
      if (topicsMessageTimerRef.current) {
        clearTimeout(topicsMessageTimerRef.current);
      }
      topicsMessageTimerRef.current = setTimeout(() => {
        topicsMessageTimerRef.current = null;
        publish();
      }, delayMs);
      return;
    }

    publish();
  };

  const persistAnonCourse = async ({ nextTopics, nextRatings } = {}) => {
    const anonUserId = anonUserIdRef.current;
    if (!anonUserId) return;

    const topicsToPersist =
      typeof nextTopics !== 'undefined' ? nextTopics : topicsPayloadRef.current;
    const ratingsToPersist =
      typeof nextRatings !== 'undefined' ? nextRatings : ratingsRef.current;
    const payload = {};

    if (typeof topicsToPersist !== 'undefined' && topicsToPersist !== null) {
      payload.topics = topicsToPersist;
    }
    if (typeof ratingsToPersist !== 'undefined' && ratingsToPersist !== null) {
      payload.familiarityRatings = ratingsToPersist;
    }
    if (Object.keys(payload).length === 0) return;

    setIsSavingTopics(true);
    try {
      await authFetch(`/api/onboarding/anon-course/${anonUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('[SimplifiedOnboardingChat] Failed to persist anon topics:', error);
    } finally {
      setIsSavingTopics(false);
    }
  };

  const schedulePersist = ({ nextTopics, nextRatings, immediate = false } = {}) => {
    if (immediate) {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      persistAnonCourse({ nextTopics, nextRatings });
      return;
    }

    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      persistAnonCourse({ nextTopics, nextRatings });
    }, 500);
  };

  const createAnonCourseRecord = async (courseName, collegeName) => {
    const anonUserId = anonUserIdRef.current;
    if (!anonUserId) return null;
    try {
      const response = await authFetch('/api/onboarding/anon-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anonUserId,
          courseName,
          university: collegeName,
          studyMode: STUDY_MODE,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to create anon course');
      }
      return result?.course || null;
    } catch (error) {
      console.error('[SimplifiedOnboardingChat] Failed to create anon course:', error);
      return null;
    }
  };

  const startTopicGeneration = async (courseName, collegeName) => {
    setStage(STAGES.TOPICS_GENERATING);
    setIsThinking(true);
    setTopicError(null);
    generationIntroSentRef.current = false;
    generationHistoryRef.current = [];
    setIsGenerationReplying(false);

    enqueueReplyParts('chat', [getTopicsLoadingMessage()]);

    await createAnonCourseRecord(courseName, collegeName);

    try {
      const result = await generateAnonTopics(
        anonUserIdRef.current,
        courseName,
        collegeName,
        { studyMode: STUDY_MODE }
      );
      const normalizedPayload = normalizeTopicsPayload(result?.topics || {});
      const normalizedOverview = normalizedPayload.overviewTopics || [];
      const initialRatings = buildInitialRatings(normalizedOverview);

      setTopicsPayload(normalizedPayload);
      setFamiliarityRatings(initialRatings);
      schedulePersist({ nextTopics: normalizedPayload, nextRatings: initialRatings });

      const topicsMessage = interpolateMessage(getTopicsGeneratedMessage(), {
        overviewTopics: normalizedOverview,
      });
      if (topicsMessage) {
        enqueueReplyParts('chat', [topicsMessage]);
        appendTopicsMessage(getMessageDelayMs(topicsMessage));
      } else {
        appendTopicsMessage();
      }

      setStage(STAGES.TOPICS_APPROVAL);
    } catch (error) {
      console.error('[SimplifiedOnboardingChat] Topic generation failed:', error);
      setTopicError('Something went wrong generating topics.');
      enqueueReplyParts('chat', ['Something went wrong generating topics. Please try again.']);
      appendTopicsMessage(getMessageDelayMs('Something went wrong generating topics. Please try again.'));
      setStage(STAGES.TOPICS_APPROVAL);
    } finally {
      setIsThinking(false);
    }
  };

  const finalizeCourseInfo = async (nextCourseName, nextCollegeName) => {
    if (stage !== STAGES.COLLECTING) return;
    const courseName = nextCourseName?.trim();
    const collegeName = nextCollegeName?.trim();
    if (!courseName || !collegeName) {
      handleParseFailure();
      return;
    }

    setCourseInfo({
      courseName,
      collegeName,
      studyMode: STUDY_MODE,
    });
    setPendingField(null);
    parseAttemptsRef.current = 0;
    await startTopicGeneration(courseName, collegeName);
  };

  const handleParsedResult = async (result) => {
    const courseName = typeof result?.courseName === 'string' ? result.courseName.trim() : '';
    const collegeName =
      typeof result?.university === 'string'
        ? result.university.trim()
        : typeof result?.collegeName === 'string'
        ? result.collegeName.trim()
        : '';
    if (courseName && collegeName) {
      await finalizeCourseInfo(courseName, collegeName);
      return;
    }

    if (courseName && !collegeName) {
      setCourseInfo((prev) => ({ ...prev, courseName }));
      setPendingField('collegeName');
      parseAttemptsRef.current = 0;
      enqueueReplyParts('chat', [getCourseChatCollegeFollowup(courseName)]);
      return;
    }

    handleParseFailure();
  };

  const parseCourseInfo = async (message) => {
    const localParsed = parseCourseInfoLocal(message);
    if (localParsed) {
      await handleParsedResult(localParsed);
      return;
    }

    setIsThinking(true);
    try {
      const response = await authFetch('/api/onboarding/parse-course-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, anonUserId: anonUserIdRef.current }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to parse course info');
      }

      await handleParsedResult(result);
    } catch (error) {
      handleParseFailure();
    } finally {
      setIsThinking(false);
    }
  };

  const overviewTopics = topicsPayload?.overviewTopics || [];

  const handleTopicTitleChange = (topicId, title) => {
    if (!topicId) return;
    const currentPayload = topicsPayloadRef.current;
    if (!currentPayload) return;
    const nextOverview = (currentPayload.overviewTopics || []).map((topic) =>
      topic.id === topicId ? { ...topic, title } : topic
    );
    const nextPayload = { ...currentPayload, overviewTopics: nextOverview };
    setTopicsPayload(nextPayload);
    schedulePersist({ nextTopics: nextPayload });
  };

  const handleRatingChange = (topicId, rating) => {
    if (!topicId) return;
    const nextRatings = { ...(ratingsRef.current || {}), [topicId]: rating };
    setFamiliarityRatings(nextRatings);
    schedulePersist({ nextRatings });
  };

  const handleTopicRemove = (topic, _index, _rating) => {
    if (!topic?.id) return;
    const currentPayload = topicsPayloadRef.current;
    if (!currentPayload) return;
    const nextOverview = (currentPayload.overviewTopics || []).filter(
      (entry) => entry.id !== topic.id
    );
    const nextPayload = { ...currentPayload, overviewTopics: nextOverview };
    const nextRatings = { ...(ratingsRef.current || {}) };
    delete nextRatings[topic.id];
    setTopicsPayload(nextPayload);
    setFamiliarityRatings(nextRatings);
    schedulePersist({ nextTopics: nextPayload, nextRatings });
  };

  const handleTopicRestore = (topic, index, rating) => {
    if (!topic?.id) return;
    const currentPayload = topicsPayloadRef.current || { overviewTopics: [] };
    const currentOverview = currentPayload.overviewTopics || [];
    const nextOverview = [...currentOverview];
    const safeIndex =
      Number.isFinite(index) && index >= 0 ? Math.min(index, nextOverview.length) : nextOverview.length;
    nextOverview.splice(safeIndex, 0, topic);
    const nextPayload = { ...currentPayload, overviewTopics: nextOverview };
    const nextRatings = { ...(ratingsRef.current || {}) };
    nextRatings[topic.id] = Number.isFinite(rating) ? rating : defaultTopicRating;
    setTopicsPayload(nextPayload);
    setFamiliarityRatings(nextRatings);
    schedulePersist({ nextTopics: nextPayload, nextRatings });
  };

  const handleApproveTopics = () => {
    if (stage !== STAGES.TOPICS_APPROVAL) return;
    schedulePersist({ immediate: true });
    setStage(STAGES.COURSE_GENERATING);
  };

  const handleRetryTopics = async () => {
    if (!courseInfo.courseName || !courseInfo.collegeName) return;
    await startTopicGeneration(courseInfo.courseName, courseInfo.collegeName);
  };

  const sendGenerationChat = async (text) => {
    if (!text) return;
    setIsGenerationReplying(true);

    const nextHistory = [
      ...(generationHistoryRef.current || []),
      { role: 'user', content: text },
    ].slice(-12);
    generationHistoryRef.current = nextHistory;

    try {
      const response = await authFetch('/api/onboarding/generation-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory,
          anonUserId: anonUserIdRef.current,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to generate reply');
      }

      const replyParts = Array.isArray(result?.replyParts)
        ? result.replyParts
        : typeof result?.reply === 'string'
        ? [result.reply]
        : [];

      if (replyParts.length === 0) {
        throw new Error('No reply returned');
      }

      generationHistoryRef.current = [
        ...generationHistoryRef.current,
        ...replyParts.map((part) => ({ role: 'assistant', content: part })),
      ].slice(-12);

      enqueueReplyParts('chat', replyParts);
    } catch (error) {
      console.error('[SimplifiedOnboardingChat] Generation chat error:', error);
      enqueueReplyParts('chat', [
        'Sorry - something went wrong while I was responding. Mind trying again?',
      ]);
    } finally {
      setIsGenerationReplying(false);
    }
  };

  const handleUserSend = async (raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    if (stage === STAGES.COURSE_GENERATING) {
      if (isGenerationReplying) return;
      setInput('');
      addUserMessage(trimmed);
      await sendGenerationChat(trimmed);
      return;
    }

    if (isThinking || stage !== STAGES.COLLECTING) return;
    setInput('');
    addUserMessage(trimmed);

    if (pendingField === 'collegeName') {
      if (courseInfo.courseName) {
        await finalizeCourseInfo(courseInfo.courseName, trimmed);
        return;
      }
      setPendingField(null);
    }

    await parseCourseInfo(trimmed);
  };

  const isInputDisabled =
    stage === STAGES.COLLECTING
      ? isThinking
      : stage === STAGES.COURSE_GENERATING
      ? isGenerationReplying
      : true;
  const inputPlaceholder =
    stage === STAGES.TOPICS_GENERATING
      ? 'Generating topics...'
      : stage === STAGES.TOPICS_APPROVAL
      ? 'Review topics below...'
      : stage === STAGES.COURSE_GENERATING
      ? 'Ask me anything while I build your course...'
      : 'Type your message...';
  const showTyping = isThinking || isGenerationReplying;
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
              backgroundSize: '60px 60px',
            }}
          />
        </div>
      )}

      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 text-lg sm:text-xl font-bold text-[var(--primary)]">
          <Image
            src="/images/kogno_logo.png"
            alt="Kogno"
            width={32}
            height={32}
            className="h-7 w-7 sm:h-8 sm:w-8 object-contain"
          />
          Kogno
        </Link>
        <button
          type="button"
          onClick={handleSignIn}
          className="px-4 py-2 rounded-xl bg-[var(--surface-1)] border border-white/10 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
        >
          Sign in
        </button>
      </header>

      <div
        ref={scrollContainerRef}
        className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6"
      >
        <div className="max-w-2xl mx-auto py-8">
          {stage === STAGES.COURSE_GENERATING && (
            <div className="mb-4 rounded-2xl border border-white/10 bg-[var(--surface-2)] px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--foreground)]">
                <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--primary)]" />
                Building your course...
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-[var(--primary)]" />
              </div>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                Ask questions while I finish assembling your plan.
              </p>
            </div>
          )}
          <AnimatePresence initial={false}>
            {messages.map((message) => {
              if (message.type === 'bot') {
                return <BotMessage key={message.id}>{message.text}</BotMessage>;
              }
              if (message.type === 'user') {
                return <UserMessage key={message.id}>{message.text}</UserMessage>;
              }
              if (message.type === 'topics') {
                return (
                  <BotMessage key={message.id}>
                    <TopicApprovalSection
                      topics={overviewTopics}
                      familiarityRatings={familiarityRatings}
                      onTopicTitleChange={handleTopicTitleChange}
                      onTopicRemove={handleTopicRemove}
                      onTopicRestore={handleTopicRestore}
                      onRatingChange={handleRatingChange}
                      onApprove={handleApproveTopics}
                      onRetry={topicError ? handleRetryTopics : null}
                      isSaving={isSavingTopics}
                      error={topicError}
                      isApproved={stage === STAGES.COURSE_GENERATING}
                    />
                  </BotMessage>
                );
              }
              return null;
            })}
          </AnimatePresence>

          {showTyping && <TypingIndicator />}
        </div>
      </div>

      <div className="relative z-10 border-t border-white/5 bg-[var(--background)]/80 backdrop-blur-xl px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                event.target.style.height = 'auto';
                event.target.style.height = `${Math.min(event.target.scrollHeight, 150)}px`;
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleUserSend(input);
                }
              }}
              placeholder={inputPlaceholder}
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
