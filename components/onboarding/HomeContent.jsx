'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import * as api from '@/lib/onboarding';

const STEPS = {
  ASK_COURSE: 'ASK_COURSE',
  ASK_COLLEGE: 'ASK_COLLEGE',
  VALIDATE_COURSE: 'VALIDATE_COURSE',
  SHOW_TOPICS: 'SHOW_TOPICS',
  ASK_TOPIC_CUSTOM: 'ASK_TOPIC_CUSTOM',
  VALIDATE_TOPIC: 'VALIDATE_TOPIC',
  START_JOB: 'START_JOB',
  WAIT_JOB: 'WAIT_JOB',
  COMPLETED: 'COMPLETED',
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
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState(STEPS.ASK_COURSE);
  const [data, setData] = useState({ courseName: '', collegeName: '', topic: '' });
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState([]);
  const [jobId, setJobId] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);
  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, topics]);

  // Initial greeting
  useEffect(() => {
    const timer = setTimeout(() => {
      addBotMessage("Hey! I'm Kogno. What's the hardest class you're taking right now?");
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const addBotMessage = (text) => {
    setMessages(prev => [...prev, { type: 'bot', text, id: Date.now() + Math.random() }]);
  };

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, { type: 'user', text, id: Date.now() + Math.random() }]);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const val = input.trim();
    setInput('');
    addUserMessage(val);

    if (!hasStarted) {
      setHasStarted(true);
    }

    if (step === STEPS.ASK_COURSE) {
      setData(prev => ({ ...prev, courseName: val }));
      setStep(STEPS.ASK_COLLEGE);
      setTimeout(() => addBotMessage("Got it. And which college are you at?"), 600);
    } else if (step === STEPS.ASK_COLLEGE) {
      setData(prev => ({ ...prev, collegeName: val }));
      await validateCourseData(val);
    } else if (step === STEPS.ASK_TOPIC_CUSTOM) {
      await handleTopicSelection(val);
    }
  };

  const handleCustomTopicSubmit = async () => {
    if (!input.trim()) return;
    const val = input.trim();
    setInput('');
    await handleTopicSelection(val);
  };

  const validateCourseData = async (college) => {
    setLoading(true);
    setStep(STEPS.VALIDATE_COURSE);
    try {
      const currentData = { ...data, collegeName: college };
      const res = await api.validateCourse(currentData);

      if (res.valid) {
        const normalizedCourse = res.normalizedCourseName || currentData.courseName;
        const normalizedCollege = res.normalizedCollegeName || currentData.collegeName;
        const normalizedData = { courseName: normalizedCourse, collegeName: normalizedCollege };
        setData(prev => ({ ...prev, ...normalizedData }));

        const topicRes = await api.getHardTopics(normalizedData);
        setTopics(topicRes.topics || []);
        setStep(STEPS.SHOW_TOPICS);
        addBotMessage("Here are the hardest topics I could find. Pick one below, or tell me another one - I can teach it to you in 5 minutes.");
      } else {
        setStep(STEPS.ASK_COURSE);
        addBotMessage("Hmm, I couldn't find that course. Mind checking the name and college again? What's the course name?");
      }
    } catch (e) {
      console.error(e);
      addBotMessage("Sorry, I had trouble checking that. Let's try again. What's the course name?");
      setStep(STEPS.ASK_COURSE);
    } finally {
      setLoading(false);
      if (step === STEPS.ASK_COURSE) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  };

  const handleTopicSelection = async (topic) => {
    if (step === STEPS.SHOW_TOPICS) {
      addUserMessage(topic);
    }

    if (!hasStarted) {
      setHasStarted(true);
    }

    setLoading(true);
    setStep(STEPS.VALIDATE_TOPIC);

    try {
      const currentData = { ...data, topic };
      const validRes = await api.validateTopic(currentData);

      if (validRes.valid) {
        const normalizedTopic = validRes.normalizedTopic || topic;
        const normalizedData = { ...data, topic: normalizedTopic };
        setData(prev => ({ ...prev, topic: normalizedTopic }));
        setStep(STEPS.START_JOB);
        const jobRes = await api.generateLesson(normalizedData);
        setJobId(jobRes.jobId);
        setStep(STEPS.WAIT_JOB);
        addBotMessage("On it! Creating your personalized lesson...");
      } else {
        setStep(STEPS.SHOW_TOPICS);
        if (Array.isArray(validRes.suggestedTopics) && validRes.suggestedTopics.length) {
          setTopics(validRes.suggestedTopics);
          addBotMessage("That topic doesn't seem to fit the course. Try one of these instead, or be more specific.");
        } else {
          addBotMessage("That topic doesn't seem to fit the course. Try picking one from the list or be more specific.");
        }
      }
    } catch (e) {
      addBotMessage("Something went wrong. Please try picking a topic again.");
      setStep(STEPS.SHOW_TOPICS);
    } finally {
      setLoading(false);
    }
  };

  // Polling for job status
  useEffect(() => {
    if (step !== STEPS.WAIT_JOB || !jobId) return;

    let stallInterval;
    let pollInterval;

    const stalls = [
      "Analyzing past exams...",
      "Structuring the key concepts...",
      "Generating practice questions...",
      "Almost there..."
    ];
    let stallIndex = 0;

    stallInterval = setInterval(() => {
      if (stallIndex < stalls.length) {
        addBotMessage(stalls[stallIndex]);
        stallIndex++;
      }
    }, 2500);

    pollInterval = setInterval(async () => {
      try {
        const status = await api.getLessonStatus(jobId);
        if (status.status === 'completed') {
          clearInterval(stallInterval);
          clearInterval(pollInterval);
          setStep(STEPS.COMPLETED);
          addBotMessage("Ready! Taking you there now.");
          setTimeout(() => {
            if (status.courseId) {
              router.push(`/courses/${status.courseId}`);
            } else {
              router.push('/dashboard');
            }
          }, 1000);
        } else if (status.status === 'failed') {
          clearInterval(stallInterval);
          clearInterval(pollInterval);
          setStep(STEPS.SHOW_TOPICS);
          addBotMessage("Oops, I couldn't generate that lesson. Try another topic?");
        }
      } catch (e) {
        console.error(e);
      }
    }, 1500);

    return () => {
      clearInterval(stallInterval);
      clearInterval(pollInterval);
    };
  }, [step, jobId, router]);

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
        <Link
          href="/auth/sign-in"
          className="px-5 py-2 text-sm font-medium rounded-xl bg-[var(--primary)] text-white border border-transparent hover:bg-transparent hover:text-[var(--foreground)] hover:border-[var(--border)] transition-all"
        >
          Sign in
        </Link>
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
          {loading && (
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

          {/* Topic chips when in SHOW_TOPICS step */}
          {step === STEPS.SHOW_TOPICS && topics.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2 mb-4"
            >
              {topics.map(t => (
                <button
                  key={t}
                  onClick={() => handleTopicSelection(t)}
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
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (step === STEPS.SHOW_TOPICS) {
                    handleCustomTopicSubmit();
                  } else {
                    handleSend();
                  }
                }
              }}
              placeholder={
                step === STEPS.WAIT_JOB
                  ? "Generating lesson..."
                  : step === STEPS.SHOW_TOPICS
                    ? "Or type a topic..."
                    : "Type your answer..."
              }
              disabled={loading || step === STEPS.WAIT_JOB || step === STEPS.COMPLETED}
              className="w-full bg-[var(--surface-1)] border border-white/10 rounded-2xl px-5 py-4 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-50 pr-14"
              autoFocus
            />
            <button
              onClick={step === STEPS.SHOW_TOPICS ? handleCustomTopicSubmit : handleSend}
              disabled={!input.trim() || loading || step === STEPS.WAIT_JOB || step === STEPS.COMPLETED}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-[var(--primary)] text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--primary)]/90 transition-colors"
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
