'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/api';
import { getAnonUserId } from '@/lib/onboarding';
import { BotMessage, UserMessage, TypingIndicator } from '@/components/chat/ChatMessage';
import { createMessageQueue, scrollToBottom } from '@/lib/chatHelpers';
import { supabase } from '@/lib/supabase/client';

const INITIAL_PROMPT = 'What course do you want to study and which university?';
const RETRY_FIRST =
  "Hmm, I couldn't quite catch that! Could you tell me again - what's the course name (like 'Physics 101' or 'Intro to Biology') and which college/university is it at?";
const RETRY_SECOND =
  "I'm still having trouble understanding. Please type the course name and college separately, like: 'Physics 101' and 'Stanford University'";

const buildCollegeFollowup = (courseName) =>
  `Got it, ${courseName}! Which college or university is this course at?`;
const buildCourseFollowup = (collegeName) =>
  `Great, ${collegeName}. What's the course name?`;
const buildConfirmation = (courseName, collegeName) =>
  `Perfect - ${courseName} at ${collegeName}.`;
const FINAL_MESSAGE = "I'll start building your cram-focused course now.";

const STUDY_MODE = 'cram';

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
    text: INITIAL_PROMPT,
    id: Date.now() + Math.random(),
    meta: {},
  });
  const [messages, setMessages] = useState([initialMessageRef.current]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [pendingField, setPendingField] = useState(null);
  const [courseInfo, setCourseInfo] = useState({
    courseName: '',
    collegeName: '',
    studyMode: STUDY_MODE,
  });
  const [isComplete, setIsComplete] = useState(false);

  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef([initialMessageRef.current]);
  const queueRef = useRef([]);
  const messageQueueTimerRef = useRef(null);
  const messageQueueActiveRef = useRef(false);
  const parseAttemptsRef = useRef(0);

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
    };
  }, []);

  useEffect(() => {
    scrollToBottom(scrollContainerRef);
  }, [messages, isThinking]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/create-account');
  };

  const handleParseFailure = () => {
    parseAttemptsRef.current += 1;
    const message = parseAttemptsRef.current === 1 ? RETRY_FIRST : RETRY_SECOND;
    enqueueReplyParts('chat', [message]);
  };

  const finalizeCourseInfo = (nextCourseName, nextCollegeName) => {
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
    setIsComplete(true);
    enqueueReplyParts('chat', [buildConfirmation(courseName, collegeName), FINAL_MESSAGE]);
  };

  const handleParsedResult = (result) => {
    const courseName = typeof result?.courseName === 'string' ? result.courseName.trim() : '';
    const collegeName =
      typeof result?.university === 'string'
        ? result.university.trim()
        : typeof result?.collegeName === 'string'
        ? result.collegeName.trim()
        : '';
    const clarification =
      typeof result?.clarification === 'string' ? result.clarification.trim() : '';

    if (courseName && collegeName) {
      finalizeCourseInfo(courseName, collegeName);
      return;
    }

    if (courseName && !collegeName) {
      setCourseInfo((prev) => ({ ...prev, courseName }));
      setPendingField('collegeName');
      parseAttemptsRef.current = 0;
      enqueueReplyParts('chat', [buildCollegeFollowup(courseName)]);
      return;
    }

    if (!courseName && collegeName) {
      setCourseInfo((prev) => ({ ...prev, collegeName }));
      setPendingField('courseName');
      parseAttemptsRef.current = 0;
      enqueueReplyParts('chat', [buildCourseFollowup(collegeName)]);
      return;
    }

    if (clarification) {
      parseAttemptsRef.current = 0;
      enqueueReplyParts('chat', [clarification]);
      return;
    }

    handleParseFailure();
  };

  const parseCourseInfo = async (message) => {
    const localParsed = parseCourseInfoLocal(message);
    if (localParsed) {
      handleParsedResult(localParsed);
      return;
    }

    setIsThinking(true);
    try {
      const response = await authFetch('/api/onboarding/parse-course-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, anonUserId: getAnonUserId() }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to parse course info');
      }

      handleParsedResult(result);
    } catch (error) {
      handleParseFailure();
    } finally {
      setIsThinking(false);
    }
  };

  const handleUserSend = async (raw) => {
    const trimmed = raw.trim();
    if (!trimmed || isThinking || isComplete) return;
    setInput('');
    addUserMessage(trimmed);

    if (pendingField === 'collegeName') {
      if (courseInfo.courseName) {
        finalizeCourseInfo(courseInfo.courseName, trimmed);
        return;
      }
      setPendingField(null);
    }

    if (pendingField === 'courseName') {
      if (courseInfo.collegeName) {
        finalizeCourseInfo(trimmed, courseInfo.collegeName);
        return;
      }
      setPendingField(null);
    }

    await parseCourseInfo(trimmed);
  };

  const isInputDisabled = isThinking || isComplete;
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
          onClick={handleSignOut}
          className="px-4 py-2 rounded-xl bg-[var(--surface-1)] border border-white/10 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
        >
          Sign out
        </button>
      </header>

      <div
        ref={scrollContainerRef}
        className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6"
      >
        <div className="max-w-2xl mx-auto py-8">
          <AnimatePresence initial={false}>
            {messages.map((message) =>
              message.type === 'bot' ? (
                <BotMessage key={message.id}>{message.text}</BotMessage>
              ) : (
                <UserMessage key={message.id}>{message.text}</UserMessage>
              )
            )}
          </AnimatePresence>

          {isThinking && <TypingIndicator />}
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
              placeholder={isComplete ? 'Generating your course...' : 'Type your message...'}
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
