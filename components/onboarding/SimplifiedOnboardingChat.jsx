'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/api';
import { ensureAnonUserId, generateAnonCourse, generateAnonTopics, getAnonUserId } from '@/lib/onboarding';
import { BotMessage, UserMessage, TypingIndicator } from '@/components/chat/ChatMessage';
import { createMessageQueue, getMessageDelayMs, scrollToBottom } from '@/lib/chatHelpers';
import TopicApprovalSection from '@/components/onboarding/TopicApprovalSection';
import DurationInput from '@/components/ui/DurationInput';
import { supabase } from '@/lib/supabase/client';
import { transferAnonData } from '@/lib/onboarding';
import {
  getCourseChatCollegeFollowup,
  getCourseChatGreeting,
  getCourseChatRetryMessage,
  getTopicsLoadingMessage,
  getTopicsGeneratedMessage,
} from '@/components/courses/create/courseChatMessages';
import { interpolateMessage } from '@/components/courses/create/conversationFlow';
import { defaultTopicRating } from '@/app/courses/create/utils';

const STAGES = {
  COLLECTING: 'collecting',
  STUDY_MODE_SELECTION: 'study_mode_selection',
  TIME_SELECTION: 'time_selection',
  SYLLABUS_COLLECTION: 'syllabus_collection',
  TOPICS_GENERATING: 'topics_generating',
  TOPICS_APPROVAL: 'topics_approval',
  COURSE_GENERATING: 'course_generating',
};

// Quick preset options for duration picker (same as main course creation)
const DURATION_QUICK_OPTIONS = [
  { label: '1 hour', minutes: 60 },
  { label: '3 hours', minutes: 180 },
  { label: '1 day', minutes: 1440 },
  { label: '3 days', minutes: 4320 },
  { label: '1 week', minutes: 10080 },
];

const STUDY_MODES = {
  DEEP: 'deep',
  CRAM: 'cram',
};

// Convert a File to base64 string
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const base64 = result.split(',')[1] ?? '';
        resolve(base64);
      } else {
        reject(new Error(`Unable to read ${file.name}`));
      }
    };
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
    reader.readAsDataURL(file);
  });
};

// Build file payload in OpenRouter format (same as main course creation)
const buildFilePayload = async (files) => {
  const payloads = await Promise.all(
    files.map(async (file) => {
      const base64 = await fileToBase64(file);
      const mimeType = file.type || 'application/octet-stream';
      return {
        type: 'file',
        file: {
          filename: file.name,
          file_data: `data:${mimeType};base64,${base64}`,
        },
      };
    })
  );
  return payloads;
};

const buildCourseConfirmation = (courseName, collegeName) =>
  `I have ${courseName} at ${collegeName}. Is that right? Choose Yes to continue or No to correct it.`;

const normalizeCorrectionInput = (value) => {
  if (typeof value !== 'string') return '';
  let text = value.trim();
  if (!text) return '';

  const prefixPatterns = [
    /^(no|nah|nope|incorrect|wrong)\b[,:;\-\s]*/i,
    /^(actually|sorry|my bad|i meant|meant|should be|it's|its|it should be)\b[,:;\-\s]*/i,
  ];

  let changed = true;
  let guard = 0;
  while (changed && guard < 4) {
    changed = false;
    for (const pattern of prefixPatterns) {
      const next = text.replace(pattern, '').trim();
      if (next !== text) {
        text = next;
        changed = true;
      }
    }
    guard += 1;
  }

  return text;
};

const parseCorrectionLocal = (raw) => {
  const cleaned = normalizeCorrectionInput(raw);
  if (!cleaned) return null;

  const parsed = parseCourseInfoLocal(cleaned);
  if (parsed?.courseName && parsed?.university) {
    return { courseName: parsed.courseName, collegeName: parsed.university };
  }

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    const last = tokens[tokens.length - 1];
    const rest = tokens.slice(0, -1).join(' ');
    const restHasDigits = /\d/.test(rest);
    const lastHasDigits = /\d/.test(last);
    if (restHasDigits && !lastHasDigits && last.length <= 5) {
      return { courseName: rest, collegeName: last };
    }
  }

  const hasDigits = /\d/.test(cleaned);
  const looksLikeCollege = /university|college|institute|school|polytechnic|tech|academy|campus|state/i.test(
    cleaned
  );
  if (hasDigits && !looksLikeCollege) {
    return { courseName: cleaned };
  }
  if (looksLikeCollege || cleaned.length <= 5) {
    return { collegeName: cleaned };
  }

  return null;
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

const stripLeadingPhrases = (value, { allowAtPrefix = false } = {}) => {
  if (typeof value !== 'string') return '';
  let text = value.trim();
  if (!text) return '';

  const rules = [
    /^(it's|it is|its|course is|class is|my course is|the course is)\b[,:;\-\s]*/i,
    /^(university is|college is|school is)\b[,:;\-\s]*/i,
  ];

  if (allowAtPrefix) {
    rules.unshift(/^at\b[,:;\-\s]*/i);
  }

  let changed = true;
  let guard = 0;
  while (changed && guard < 4) {
    changed = false;
    for (const pattern of rules) {
      const next = text.replace(pattern, '').trim();
      if (next !== text) {
        text = next;
        changed = true;
      }
    }
    guard += 1;
  }

  return text;
};

const normalizeParsedCourseInfo = (result) => {
  const courseName =
    typeof result?.courseName === 'string'
      ? result.courseName.trim()
      : typeof result?.course === 'string'
      ? result.course.trim()
      : '';
  const collegeName =
    typeof result?.university === 'string'
      ? result.university.trim()
      : typeof result?.collegeName === 'string'
      ? result.collegeName.trim()
      : typeof result?.college === 'string'
      ? result.college.trim()
      : '';

  return {
    courseName: stripLeadingPhrases(courseName) || '',
    collegeName: stripLeadingPhrases(collegeName, { allowAtPrefix: true }) || '',
  };
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
    studyMode: '',
    studyHours: 24, // Default to 1 day
    studyMinutes: 0,
    syllabusText: '',
    syllabusFiles: [],
  });
  const [isConfirmingCourse, setIsConfirmingCourse] = useState(false);
  const [needsCourseCorrection, setNeedsCourseCorrection] = useState(false);
  const [stage, setStage] = useState(STAGES.COLLECTING);
  const [topicsPayload, setTopicsPayload] = useState(null);
  const [familiarityRatings, setFamiliarityRatings] = useState({});
  const [isSavingTopics, setIsSavingTopics] = useState(false);
  const [topicError, setTopicError] = useState(null);
  const [topicsProgress, setTopicsProgress] = useState(0);
  const [topicsProgressMessage, setTopicsProgressMessage] = useState('');
  const [topicsApproved, setTopicsApproved] = useState(false);
  const [courseProgress, setCourseProgress] = useState(0);
  const [courseProgressMessage, setCourseProgressMessage] = useState('');
  const [courseModulesComplete, setCourseModulesComplete] = useState(0);
  const [courseTotalModules, setCourseTotalModules] = useState(null);
  const [courseId, setCourseId] = useState(null);
  const [courseError, setCourseError] = useState(null);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]);

  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
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
  const courseAccessNotifiedRef = useRef(false);
  const courseCompletionNotifiedRef = useRef(false);

  const resolveAnonUserId = async () => {
    const resolved = await ensureAnonUserId();
    if (resolved && anonUserIdRef.current !== resolved) {
      anonUserIdRef.current = resolved;
    }
    return resolved || anonUserIdRef.current;
  };

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
    void resolveAnonUserId();
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
    const history = generationHistoryRef.current || [];
    generationHistoryRef.current = [...history, { role: 'assistant', content: introMessage }].slice(-12);
    addBotMessage(introMessage);
  }, [stage]);

  // Listen for auth state changes to handle signup completion
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setShowSignupPrompt(false);
        setIsAuthenticating(false);

        // Transfer anonymous course data to the new user
        try {
          const anonUserId = anonUserIdRef.current;
          if (anonUserId) {
            await transferAnonData(anonUserId);
          }

          // If course is ready, redirect to it
          if (courseId) {
            router.push(`/courses/${courseId}`);
          }
        } catch (error) {
          console.error('[SimplifiedOnboardingChat] Failed to transfer anon data:', error);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [courseId, router]);

  useEffect(() => {
    if (!courseId || courseAccessNotifiedRef.current) return;
    if (courseModulesComplete < 1) return;
    courseAccessNotifiedRef.current = true;
    const readyMessage =
      'We are still generating your course, but the first module is ready! You can jump in now.';
    const history = generationHistoryRef.current || [];
    generationHistoryRef.current = [...history, { role: 'assistant', content: readyMessage }].slice(-12);
    enqueueReplyParts('chat', [readyMessage]);
  }, [courseId, courseModulesComplete, enqueueReplyParts]);

  useEffect(() => {
    if (stage !== STAGES.COURSE_GENERATING) return;
    if (courseCompletionNotifiedRef.current) return;
    if (courseProgress < 100) return;
    courseCompletionNotifiedRef.current = true;
    setCourseProgressMessage((prev) => prev || 'Course ready.');
    const completionMessage = 'Your full course is ready now.';
    const history = generationHistoryRef.current || [];
    generationHistoryRef.current = [...history, { role: 'assistant', content: completionMessage }].slice(-12);
    enqueueReplyParts('chat', [completionMessage]);
  }, [stage, courseProgress, enqueueReplyParts]);

  const handleGoogleSignup = async () => {
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set('mode', 'signup');
      callbackUrl.searchParams.set('provider', 'google');
      if (courseId) {
        callbackUrl.searchParams.set('redirectTo', `/courses/${courseId}`);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setAuthError(error.message);
        setIsAuthenticating(false);
      }
    } catch (err) {
      setAuthError('An unexpected error occurred. Please try again.');
      setIsAuthenticating(false);
    }
  };

  const handleEmailSignup = () => {
    // Redirect to the signup page with return URL
    const returnUrl = courseId ? `/courses/${courseId}` : '/';
    router.push(`/auth/sign-in?redirectTo=${encodeURIComponent(returnUrl)}`);
  };

  const handleSignIn = () => {
    router.push('/auth/sign-in');
  };

  const handleAccessCourse = async () => {
    if (!courseId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        router.push(`/courses/${courseId}`);
        return;
      }
    } catch (error) {
      console.warn('[SimplifiedOnboardingChat] Failed to check auth session:', error);
    }
    setShowSignupPrompt(true);
  };

  const fetchCourseInfo = async (message) => {
    const anonUserId = await resolveAnonUserId();
    const response = await authFetch('/api/onboarding/parse-course-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, anonUserId }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result?.error || 'Failed to parse course info');
    }
    return result;
  };

  const handleParseFailure = (message) => {
    parseAttemptsRef.current += 1;
    const fallback = getCourseChatRetryMessage(parseAttemptsRef.current);
    const reply = typeof message === 'string' && message.trim() ? message.trim() : fallback;
    enqueueReplyParts('chat', [reply]);
  };

  const applyCourseCorrection = (nextCourseName, nextCollegeName) => {
    const courseName = nextCourseName?.trim() || courseInfo.courseName;
    const collegeName = nextCollegeName?.trim() || courseInfo.collegeName;

    if (!courseName && !collegeName) {
      enqueueReplyParts('chat', [
        "Please send the course name and college together, like 'Physics 101 at Stanford'.",
      ]);
      setNeedsCourseCorrection(true);
      return;
    }
    if (!courseName) {
      enqueueReplyParts('chat', ["What's the course name?"]);
      setNeedsCourseCorrection(true);
      return;
    }
    if (!collegeName) {
      enqueueReplyParts('chat', ['Which college or university is it at?']);
      setNeedsCourseCorrection(true);
      return;
    }

    setCourseInfo((prev) => ({
      ...prev,
      courseName,
      collegeName,
    }));
    setPendingField(null);
    parseAttemptsRef.current = 0;
    setNeedsCourseCorrection(false);
    setIsConfirmingCourse(true);
    enqueueReplyParts('chat', [buildCourseConfirmation(courseName, collegeName)]);
  };

  const handleCourseCorrectionInput = async (rawInput) => {
    const cleaned = normalizeCorrectionInput(rawInput);
    if (!cleaned) {
      enqueueReplyParts('chat', [
        "Please send the course name and college together, like 'Physics 101 at Stanford'.",
      ]);
      setNeedsCourseCorrection(true);
      return;
    }

    const localUpdate = parseCorrectionLocal(cleaned);
    setIsThinking(true);
    try {
      const result = await fetchCourseInfo(cleaned);
      const { courseName, collegeName } = normalizeParsedCourseInfo(result);
      applyCourseCorrection(
        courseName || localUpdate?.courseName || courseInfo.courseName,
        collegeName || localUpdate?.collegeName || courseInfo.collegeName
      );
    } catch (error) {
      console.error('[SimplifiedOnboardingChat] Correction parse failed:', error);
      if (localUpdate) {
        applyCourseCorrection(localUpdate.courseName, localUpdate.collegeName);
      } else {
        enqueueReplyParts('chat', [
          "Please send the course name and college together, like 'Physics 101 at Stanford'.",
        ]);
        setNeedsCourseCorrection(true);
      }
    } finally {
      setIsThinking(false);
    }
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
    const anonUserId = await resolveAnonUserId();
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

  const createAnonCourseRecord = async (courseName, collegeName, studyMode, syllabusText) => {
    const anonUserId = await resolveAnonUserId();
    if (!anonUserId) return null;
    try {
      const response = await authFetch('/api/onboarding/anon-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anonUserId,
          courseName,
          university: collegeName,
          studyMode: studyMode || STUDY_MODES.DEEP,
          syllabusText: syllabusText || '',
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

  const startTopicGeneration = async () => {
    const { courseName, collegeName, studyMode, studyHours, studyMinutes, syllabusText, syllabusFiles } = courseInfo;
    if (!courseName || !collegeName) return;

    setStage(STAGES.TOPICS_GENERATING);
    setIsThinking(true);
    setTopicError(null);
    setCourseError(null);
    setIsConfirmingCourse(false);
    setNeedsCourseCorrection(false);
    setTopicsProgress(0);
    setTopicsProgressMessage('');
    setTopicsApproved(false);
    setCourseProgress(0);
    setCourseProgressMessage('');
    setCourseModulesComplete(0);
    setCourseTotalModules(null);
    setCourseId(null);
    courseAccessNotifiedRef.current = false;
    courseCompletionNotifiedRef.current = false;
    generationIntroSentRef.current = false;
    setShowSignupPrompt(false);
    generationHistoryRef.current = [];
    setIsGenerationReplying(false);

    const topicsHint = 'Feel free to ask any questions or just chat with me in the meantime.';
    generationHistoryRef.current = [{ role: 'assistant', content: topicsHint }];
    enqueueReplyParts('chat', [getTopicsLoadingMessage(), topicsHint]);

    const anonUserId = await resolveAnonUserId();
    if (!anonUserId) return;

    await createAnonCourseRecord(courseName, collegeName, studyMode, syllabusText);

    // Calculate finishByDate from studyHours/studyMinutes (same as main course creation)
    const totalMs = (studyHours * 60 * 60 * 1000) + (studyMinutes * 60 * 1000);
    const finishByDate = totalMs > 0 ? new Date(Date.now() + totalMs).toISOString() : null;

    try {
      const result = await generateAnonTopics(
        anonUserId,
        courseName,
        collegeName,
        {
          studyMode: studyMode || STUDY_MODES.DEEP,
          finishByDate,
          syllabusText: syllabusText || '',
          syllabusFiles: syllabusFiles || [],
          onProgress: (progressValue, message) => {
            if (typeof progressValue === 'number') {
              setTopicsProgress((prev) => Math.max(prev, Math.min(progressValue, 100)));
            }
            if (typeof message === 'string' && message.trim()) {
              setTopicsProgressMessage(message.trim());
            }
          },
        }
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

      setTopicsProgress(100);
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

    setCourseInfo((prev) => ({
      ...prev,
      courseName,
      collegeName,
    }));
    setPendingField(null);
    parseAttemptsRef.current = 0;
    setIsConfirmingCourse(true);
    setNeedsCourseCorrection(false);
    enqueueReplyParts('chat', [buildCourseConfirmation(courseName, collegeName)]);
  };

  const transitionToStudyModeSelection = () => {
    setStage(STAGES.STUDY_MODE_SELECTION);
    setIsConfirmingCourse(false);
    enqueueReplyParts('chat', [
      "Great! How do you want to study this course?",
      "Deep Study is for intuitive and comprehensive understanding of the subject. I'd use it to follow along with your course week by week.",
      "Cram Mode is for when you have an exam coming up. It focuses on the subjects that will get you the highest grade with the limited time you have.",
    ]);
  };

  const handleStudyModeSelection = (mode) => {
    // Add user message showing their selection
    addUserMessage(mode === STUDY_MODES.DEEP ? 'Deep Study' : 'Cram Mode');

    setCourseInfo((prev) => ({ ...prev, studyMode: mode }));

    if (mode === STUDY_MODES.DEEP) {
      setStage(STAGES.SYLLABUS_COLLECTION);
      enqueueReplyParts('chat', [
        "Deep dive mode - I'll build you a comprehensive course for thorough understanding.",
        "Do you have a syllabus, course outline, or specific topics you want to cover? Paste them below, or type 'skip' to let me generate topics based on the course name.",
      ]);
    } else {
      // For cram mode, ask how much time they have
      setStage(STAGES.TIME_SELECTION);
      enqueueReplyParts('chat', [
        "Cram mode activated! I'll focus on high-yield exam content.",
        "How much time do you have until your exam?",
      ]);
    }
  };

  const handleDurationChange = ({ hours, minutes }) => {
    setCourseInfo((prev) => ({ ...prev, studyHours: hours, studyMinutes: minutes }));
  };

  const handleDurationSubmit = () => {
    const { studyHours, studyMinutes } = courseInfo;
    // Format duration for display
    const parts = [];
    if (studyHours > 0) parts.push(`${studyHours} hour${studyHours !== 1 ? 's' : ''}`);
    if (studyMinutes > 0) parts.push(`${studyMinutes} minute${studyMinutes !== 1 ? 's' : ''}`);
    const displayText = parts.join(' ') || '0 minutes';

    addUserMessage(displayText);
    setStage(STAGES.SYLLABUS_COLLECTION);

    enqueueReplyParts('chat', [
      `Got it - ${displayText} to go. I'll prioritize the highest-yield exam content.`,
      "Upload a practice exam, past exam, or study guide. You can also paste exam topics or type 'skip' to let me generate common exam topics.",
    ]);
  };

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const acceptedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    const validFiles = files.filter(
      (file) => acceptedTypes.includes(file.type) || file.name.endsWith('.txt') || file.name.endsWith('.pdf') || file.name.endsWith('.doc') || file.name.endsWith('.docx')
    );

    if (validFiles.length === 0) {
      enqueueReplyParts('chat', ['Please upload a PDF, Word doc, or text file.']);
      return;
    }

    const fileNames = validFiles.map((f) => f.name).join(', ');
    addUserMessage(`Attached: ${fileNames}`);

    // Show a loading state while encoding files
    enqueueReplyParts('chat', [
      `Got it! I'll use ${validFiles.length > 1 ? 'these files' : 'this file'} to build your topics.`,
    ]);

    try {
      // Encode files as base64 in OpenRouter format (same as main course creation)
      const encodedFiles = await buildFilePayload(validFiles);

      // Also read text content for text files as fallback syllabusText
      const textContents = await Promise.all(
        validFiles.map(async (file) => {
          if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
            return await file.text();
          }
          return '';
        })
      );
      const textContent = textContents.filter(Boolean).join('\n\n');

      setCourseInfo((prev) => ({
        ...prev,
        syllabusText: textContent,
        syllabusFiles: encodedFiles,
      }));
    } catch (error) {
      console.error('[SimplifiedOnboardingChat] Failed to encode files:', error);
      enqueueReplyParts('chat', ['Had trouble reading the files. Please try again or paste the content directly.']);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Start topic generation
    void startTopicGeneration();
  };

  const handleSyllabusInput = (text) => {
    const trimmed = text.trim().toLowerCase();
    const isSkip = trimmed === 'skip' || trimmed === 'no' || trimmed === 'none';

    if (isSkip) {
      setCourseInfo((prev) => ({ ...prev, syllabusText: '' }));
      enqueueReplyParts('chat', [
        "No problem! I'll generate topics based on the course name.",
      ]);
    } else {
      setCourseInfo((prev) => ({ ...prev, syllabusText: text.trim() }));
      enqueueReplyParts('chat', [
        "Got it! I'll use this to build your topics.",
      ]);
    }

    // Start topic generation
    void startTopicGeneration();
  };

  const handleParsedResult = async (result) => {
    const { courseName, collegeName } = normalizeParsedCourseInfo(result);
    const clarification =
      typeof result?.clarification === 'string' ? result.clarification.trim() : '';
    if (courseName && collegeName) {
      await finalizeCourseInfo(courseName, collegeName);
      return;
    }

    if (courseName && !collegeName) {
      setCourseInfo((prev) => ({ ...prev, courseName }));
      setPendingField('collegeName');
      parseAttemptsRef.current = 0;
      enqueueReplyParts('chat', [clarification || getCourseChatCollegeFollowup(courseName)]);
      return;
    }

    if (!courseName && collegeName) {
      setCourseInfo((prev) => ({ ...prev, collegeName }));
      setPendingField('courseName');
      parseAttemptsRef.current = 0;
      enqueueReplyParts('chat', [
        clarification || `Got it, ${collegeName}! What's the course name?`,
      ]);
      return;
    }

    handleParseFailure(clarification);
  };

  const parseCourseInfo = async (message) => {
    setIsThinking(true);
    try {
      const result = await fetchCourseInfo(message);
      await handleParsedResult(result);
    } catch (error) {
      handleParseFailure();
    } finally {
      setIsThinking(false);
    }
  };

  const handlePendingFieldInput = async (field, message) => {
    setIsThinking(true);
    try {
      const result = await fetchCourseInfo(message);
      const { courseName, collegeName } = normalizeParsedCourseInfo(result);
      const clarification =
        typeof result?.clarification === 'string' ? result.clarification.trim() : '';

      if (field === 'collegeName') {
        const resolvedCourse = courseName || courseInfo.courseName;
        const resolvedCollege = collegeName || courseInfo.collegeName;
        if (resolvedCourse && resolvedCollege) {
          await finalizeCourseInfo(resolvedCourse, resolvedCollege);
          return;
        }
        if (resolvedCourse && !resolvedCollege) {
          setCourseInfo((prev) => ({ ...prev, courseName: resolvedCourse }));
          setPendingField('collegeName');
          parseAttemptsRef.current = 0;
          enqueueReplyParts('chat', [
            clarification || getCourseChatCollegeFollowup(resolvedCourse),
          ]);
          return;
        }
        handleParseFailure(clarification);
        return;
      }

      if (field === 'courseName') {
        const resolvedCourse = courseName || courseInfo.courseName;
        const resolvedCollege = collegeName || courseInfo.collegeName;
        if (resolvedCourse && resolvedCollege) {
          await finalizeCourseInfo(resolvedCourse, resolvedCollege);
          return;
        }
        if (!resolvedCourse && resolvedCollege) {
          setCourseInfo((prev) => ({ ...prev, collegeName: resolvedCollege }));
          setPendingField('courseName');
          parseAttemptsRef.current = 0;
          enqueueReplyParts('chat', [
            clarification || `Got it, ${resolvedCollege}! What's the course name?`,
          ]);
          return;
        }
        handleParseFailure(clarification);
        return;
      }
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
    if (topicsApproved) return;
    schedulePersist({ immediate: true });
    setTopicsApproved(true);
    void startCourseGeneration();
  };

  const handleRetryTopics = async () => {
    if (!courseInfo.courseName || !courseInfo.collegeName) return;
    await startTopicGeneration();
  };

  const startCourseGeneration = async () => {
    if (!courseInfo.courseName || !courseInfo.collegeName) return;
    const topics = topicsPayloadRef.current;
    if (!topics) return;
    const anonUserId = await resolveAnonUserId();
    if (!anonUserId) return;

    setStage(STAGES.COURSE_GENERATING);
    setIsThinking(false);
    setCourseError(null);
    setCourseProgress(0);
    setCourseProgressMessage('');
    setCourseModulesComplete(0);
    setCourseTotalModules(null);
    setCourseId(null);
    courseAccessNotifiedRef.current = false;
    courseCompletionNotifiedRef.current = false;
    generationIntroSentRef.current = false;
    setIsGenerationReplying(false);
    setShowSignupPrompt(false);

    // Calculate finishByDate from studyHours/studyMinutes (same as main course creation)
    const totalMs = (courseInfo.studyHours * 60 * 60 * 1000) + (courseInfo.studyMinutes * 60 * 1000);
    const finishByDate = totalMs > 0 ? new Date(Date.now() + totalMs).toISOString() : null;

    try {
      const result = await generateAnonCourse({
        anonUserId,
        courseName: courseInfo.courseName,
        university: courseInfo.collegeName,
        studyMode: courseInfo.studyMode || STUDY_MODES.DEEP,
        finishByDate,
        syllabusText: courseInfo.syllabusText || '',
        syllabusFiles: courseInfo.syllabusFiles || [],
        topicsPayload: topics,
        familiarityRatings: ratingsRef.current,
        onProgress: (progressValue, message, meta) => {
          if (typeof progressValue === 'number') {
            setCourseProgress((prev) => Math.max(prev, Math.min(progressValue, 100)));
          }
          if (typeof message === 'string' && message.trim()) {
            setCourseProgressMessage(message.trim());
          }
          if (Number.isFinite(meta?.modulesComplete)) {
            setCourseModulesComplete(meta.modulesComplete);
          }
          if (Number.isFinite(meta?.totalModules)) {
            setCourseTotalModules(meta.totalModules);
          }
          if (meta?.courseId) {
            setCourseId(meta.courseId);
          }
        },
      });
      if (result?.courseId) {
        setCourseId(result.courseId);
      }
      setCourseProgress(100);
    } catch (error) {
      console.error('[SimplifiedOnboardingChat] Course generation failed:', error);
      setCourseError('Something went wrong building your course.');
      enqueueReplyParts('chat', ['Something went wrong building your course. Please try again.']);
    }
  };

  const sendGenerationChat = async (text) => {
    if (!text) return;
    setIsGenerationReplying(true);

    const stripSchemaLines = (value) => {
      if (typeof value !== 'string') return '';
      const cleaned = value
        .split('\n')
        .filter((line) => !/suggestTopic/i.test(line.trim()))
        .join('\n')
        .trim();
      return cleaned;
    };

    const nextHistory = [
      ...(generationHistoryRef.current || []),
      { role: 'user', content: text },
    ].slice(-12);
    generationHistoryRef.current = nextHistory;

    try {
      const anonUserId = await resolveAnonUserId();
      const response = await authFetch('/api/onboarding/generation-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory,
          anonUserId,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to generate reply');
      }

      const rawReplyParts = Array.isArray(result?.replyParts)
        ? result.replyParts
        : typeof result?.reply === 'string'
        ? [result.reply]
        : [];
      const replyParts = rawReplyParts
        .map(stripSchemaLines)
        .filter((part) => part && part.trim());

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

    if (stage === STAGES.TOPICS_GENERATING || stage === STAGES.COURSE_GENERATING) {
      if (isGenerationReplying) return;
      setInput('');
      addUserMessage(trimmed);
      await sendGenerationChat(trimmed);
      return;
    }

    // Handle syllabus collection stage
    if (stage === STAGES.SYLLABUS_COLLECTION) {
      setInput('');
      addUserMessage(trimmed);
      handleSyllabusInput(trimmed);
      return;
    }

    if (isThinking || stage !== STAGES.COLLECTING) return;
    setInput('');
    addUserMessage(trimmed);

    if (isConfirmingCourse) {
      const normalized = trimmed.toLowerCase();
      const firstWord = normalized.split(/[^a-z]+/).find(Boolean) || '';
      const yesValues = new Set(['yes', 'y', 'yep', 'yeah', 'correct', 'right']);
      const noValues = new Set(['no', 'n', 'nope', 'nah', 'incorrect', 'wrong']);

      if (yesValues.has(firstWord)) {
        if (courseInfo.courseName && courseInfo.collegeName) {
          transitionToStudyModeSelection();
        } else {
          setIsConfirmingCourse(false);
          enqueueReplyParts('chat', ['Please send the course name and college again.']);
        }
        return;
      }

      if (noValues.has(firstWord)) {
        const remainder = normalized.includes(firstWord)
          ? trimmed
              .slice(normalized.indexOf(firstWord) + firstWord.length)
              .replace(/^[,\s:;-]+/, '')
              .trim()
          : '';
        setIsConfirmingCourse(false);
        if (remainder) {
          await handleCourseCorrectionInput(remainder);
          return;
        }
        setNeedsCourseCorrection(true);
        enqueueReplyParts('chat', [
          'Got it - send the correct course and college, or just the part to change.',
        ]);
        return;
      }

      setIsConfirmingCourse(false);
      await handleCourseCorrectionInput(trimmed);
      return;
    }

    if (needsCourseCorrection) {
      await handleCourseCorrectionInput(trimmed);
      return;
    }

    if (pendingField === 'collegeName') {
      await handlePendingFieldInput('collegeName', trimmed);
      return;
    }

    if (pendingField === 'courseName') {
      await handlePendingFieldInput('courseName', trimmed);
      return;
    }

    await parseCourseInfo(trimmed);
  };

  const isInputDisabled =
    stage === STAGES.COLLECTING
      ? isThinking || isConfirmingCourse
      : stage === STAGES.STUDY_MODE_SELECTION
      ? true // Use buttons for study mode
      : stage === STAGES.TIME_SELECTION
      ? true // Use buttons for time selection
      : stage === STAGES.SYLLABUS_COLLECTION
      ? false
      : stage === STAGES.TOPICS_GENERATING || stage === STAGES.COURSE_GENERATING
      ? isGenerationReplying
      : true;
  const inputPlaceholder =
    stage === STAGES.STUDY_MODE_SELECTION
      ? 'Select a study mode above...'
      : stage === STAGES.TIME_SELECTION
      ? 'Select how much time you have...'
      : stage === STAGES.SYLLABUS_COLLECTION
      ? courseInfo.studyMode === STUDY_MODES.CRAM
        ? "Paste exam topics or study guide, or type 'skip'..."
        : "Paste your syllabus/topics here, or type 'skip'..."
      : stage === STAGES.TOPICS_GENERATING
      ? 'Ask me anything while I build your topics...'
      : stage === STAGES.TOPICS_APPROVAL
      ? 'Review topics below...'
      : stage === STAGES.COURSE_GENERATING
      ? 'Ask me anything while I build your course...'
      : 'Type your message...';
  const normalizedTopicsProgress = Number.isFinite(topicsProgress)
    ? Math.min(Math.max(topicsProgress, 0), 100)
    : 0;
  const normalizedCourseProgress = Number.isFinite(courseProgress)
    ? Math.min(Math.max(courseProgress, 0), 100)
    : 0;
  const courseAccessReady =
    Boolean(courseId) && (courseModulesComplete >= 1 || normalizedCourseProgress >= 100);
  const courseModulesLabel =
    Number.isFinite(courseTotalModules) && courseTotalModules > 0
      ? `${courseModulesComplete}/${courseTotalModules} modules`
      : null;
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
                      isApproved={topicsApproved}
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
          {stage === STAGES.TOPICS_GENERATING && (
            <div className="mb-4 rounded-2xl border border-white/10 bg-[var(--surface-2)] px-4 py-3">
              <div className="flex items-center justify-between text-xs font-medium text-[var(--foreground)]">
                <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--primary)]" />
                <span>Building your topics...</span>
                <span className="text-[var(--muted-foreground)]">{normalizedTopicsProgress}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
                  style={{ width: `${normalizedTopicsProgress}%` }}
                />
              </div>
              {topicsProgressMessage && (
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">{topicsProgressMessage}</p>
              )}
            </div>
          )}
          {stage === STAGES.COURSE_GENERATING && (
            <div className="mb-4 rounded-2xl border border-white/10 bg-[var(--surface-2)] px-4 py-3">
              <div className="flex items-center justify-between text-xs font-medium text-[var(--foreground)]">
                <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--primary)]" />
                <span>Building your course...</span>
                <span className="text-[var(--muted-foreground)]">{normalizedCourseProgress}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
                  style={{ width: `${normalizedCourseProgress}%` }}
                />
              </div>
              {(courseModulesLabel || courseProgressMessage) && (
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[var(--muted-foreground)]">
                  <span>{courseProgressMessage || 'Generating modules...'}</span>
                  {courseModulesLabel && <span>{courseModulesLabel}</span>}
                </div>
              )}
              {courseError && (
                <p className="mt-2 text-xs text-[var(--danger)]">{courseError}</p>
              )}
              {courseAccessReady && (
                <button
                  type="button"
                  onClick={handleAccessCourse}
                  className="mt-3 w-full rounded-xl border border-white/10 bg-[var(--surface-1)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  Access Course
                </button>
              )}
            </div>
          )}
          {stage === STAGES.STUDY_MODE_SELECTION ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleStudyModeSelection(STUDY_MODES.DEEP)}
                className="flex-1 rounded-xl border border-white/10 bg-[var(--surface-1)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-white transition-colors"
              >
                Deep Study
              </button>
              <button
                type="button"
                onClick={() => handleStudyModeSelection(STUDY_MODES.CRAM)}
                className="flex-1 rounded-xl border border-white/10 bg-[var(--surface-1)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-white transition-colors"
              >
                Cram Mode
              </button>
            </div>
          ) : stage === STAGES.TIME_SELECTION ? (
            <div className="space-y-4">
              <DurationInput
                hours={courseInfo.studyHours}
                minutes={courseInfo.studyMinutes}
                onChange={handleDurationChange}
                summaryLabel="Time until exam"
                quickOptions={DURATION_QUICK_OPTIONS}
              />
              <button
                type="button"
                onClick={handleDurationSubmit}
                className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--primary)]/90 transition-colors"
              >
                Continue
              </button>
            </div>
          ) : isConfirmingCourse ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleUserSend('Yes')}
                className="flex-1 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--primary)]/90 transition-colors"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => handleUserSend('No')}
                className="flex-1 rounded-xl border border-white/10 bg-[var(--surface-1)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-3">
              {stage === STAGES.SYLLABUS_COLLECTION && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 border border-white/10 bg-[var(--surface-1)] text-[var(--muted-foreground)] rounded-xl hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] transition-colors flex-shrink-0"
                    title="Attach syllabus file"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                </>
              )}
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
          )}
        </div>
      </div>

      {showSignupPrompt && (
        <div className="absolute inset-0 z-20 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[var(--surface-2)] px-6 py-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--foreground)]">Create your account to access the course</h3>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Sign up now to open your course and keep your progress saved.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSignupPrompt(false)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                aria-label="Close"
              >
                X
              </button>
            </div>

            {authError && (
              <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {authError}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={isAuthenticating}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-[var(--surface-1)] text-[var(--foreground)] font-medium hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAuthenticating ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                <span>{isAuthenticating ? 'Redirecting...' : 'Sign up with Google'}</span>
              </button>
              <button
                type="button"
                onClick={handleEmailSignup}
                disabled={isAuthenticating}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-[var(--surface-1)] text-[var(--foreground)] font-medium hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Sign up with Email</span>
              </button>
              <button
                type="button"
                onClick={handleSignIn}
                className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Already have an account? Sign in
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
