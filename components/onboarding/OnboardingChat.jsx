'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import * as api from '@/lib/onboarding';

const STEPS = {
  ASK_COURSE: 'ASK_COURSE',
  ASK_COLLEGE: 'ASK_COLLEGE',
  SHOW_TOPICS: 'SHOW_TOPICS',
  ASK_TOPIC_CUSTOM: 'ASK_TOPIC_CUSTOM',
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

export default function OnboardingChat({ onFirstMessage }) {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState(STEPS.ASK_COURSE);
  const [data, setData] = useState({ courseName: '', collegeName: '', topic: '' });
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState([]);
  const [jobId, setJobId] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const onboardingSessionStartedRef = useRef(false);

  const scrollContainerRef = useRef(null);

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

  const ensureOnboardingSession = async () => {
    if (onboardingSessionStartedRef.current) return;
    onboardingSessionStartedRef.current = true;
    setHasStarted(true);
    try {
      await api.startNewOnboardingSession();
    } catch (error) {}
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const val = input.trim();
    setInput('');
    addUserMessage(val);

    // Notify parent when first message is sent
    if (!hasStarted) {
      void ensureOnboardingSession();
      onFirstMessage?.();
    }

    if (step === STEPS.ASK_COURSE) {
      setData(prev => ({ ...prev, courseName: val }));
      setStep(STEPS.ASK_COLLEGE);
      setTimeout(() => addBotMessage("Got it. And which college are you at?"), 600);
    } else if (step === STEPS.ASK_COLLEGE) {
      setData(prev => ({ ...prev, collegeName: val }));
      await fetchTopicsForCourse(val);
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

  const fetchTopicsForCourse = async (college) => {
    setLoading(true);
    try {
      const currentData = { ...data, collegeName: college };
      const topicRes = await api.getHardTopics(currentData);
      const nextTopics = Array.isArray(topicRes?.topics) ? topicRes.topics : [];
      if (nextTopics.length > 0) {
        setData(prev => ({ ...prev, ...currentData }));
        setTopics(nextTopics);
        setStep(STEPS.SHOW_TOPICS);
        addBotMessage("Here are the hardest topics I could find. Pick one below, or tell me another one - I can teach it to you in 5 minutes.");
      } else {
        setStep(STEPS.ASK_COURSE);
        addBotMessage("Hmm, I couldn't find topics for that course. Mind checking the name and college again? What's the course name?");
      }
    } catch (e) {
      console.error(e);
      addBotMessage("Sorry, I had trouble finding topics for that course. Let's try again. What's the course name?");
      setStep(STEPS.ASK_COURSE);
    } finally {
      setLoading(false);
      // Refocus input if needed, though topics view doesn't primarily use it initially
      if (step === STEPS.ASK_COURSE) {
         setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  };

  const handleTopicSelection = async (topic) => {
    if (step === STEPS.SHOW_TOPICS) {
         addUserMessage(topic);
    }
    
    setLoading(true);
    setStep(STEPS.START_JOB);
    
    try {
        const currentData = { ...data, topic };
        setData(prev => ({ ...prev, topic }));
        const jobRes = await api.generateLesson(currentData);
        setJobId(jobRes.jobId);
        setStep(STEPS.WAIT_JOB);
        addBotMessage("On it! Creating your personalized lesson...");
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
                     const nextUrl = status.resultUrl || status.redirectUrl || (status.courseId ? `/courses/${status.courseId}?preview=1&jobId=${jobId}` : null);
                     if (nextUrl) router.push(nextUrl);
                     else router.push('/dashboard');
                }, 1000);
            } else if (status.status === 'failed') {
                clearInterval(stallInterval);
                clearInterval(pollInterval);
                setStep(STEPS.SHOW_TOPICS);
                addBotMessage("Oops, I couldn't generate that lesson. Try another topic?");
            }
        } catch (e) {
            console.error(e);
            clearInterval(stallInterval);
            clearInterval(pollInterval);
            setStep(STEPS.SHOW_TOPICS);
            addBotMessage("I couldn't check the lesson status. Try another topic?");
        }
    }, 1500);

    return () => {
        clearInterval(stallInterval);
        clearInterval(pollInterval);
    };
  }, [step, jobId, router]);

  return (
    <div className="w-full max-w-lg mx-auto bg-[var(--surface-1)]/30 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden flex flex-col h-[500px] shadow-2xl relative z-20">
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            m.type === 'bot' ? <BotMessage key={m.id}>{m.text}</BotMessage> : <UserMessage key={m.id}>{m.text}</UserMessage>
          ))}
        </AnimatePresence>
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
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-[var(--surface-1)]/50 border-t border-white/5">
        {step === STEPS.SHOW_TOPICS ? (
            <div className="space-y-3">
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {topics.map(t => (
                        <button
                            key={t}
                    onClick={() => handleTopicSelection(t)}
                    className="px-3 py-1.5 text-sm bg-[var(--surface-1)] hover:bg-[var(--primary)] hover:text-white border border-white/10 rounded-full transition-colors text-left"
                >
                    {t}
                        </button>
                    ))}
                </div>
                <div className="relative">
                     <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCustomTopicSubmit()}
                        placeholder="Or type a topic..."
                        className="w-full bg-[var(--background)] border border-white/10 rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                    />
                     <button 
                        onClick={handleCustomTopicSubmit}
                        disabled={!input.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[var(--primary)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--primary)]/90"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>
        ) : (
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={step === STEPS.WAIT_JOB ? "Generating lesson..." : "Type your answer..."}
                    disabled={loading || step === STEPS.WAIT_JOB || step === STEPS.COMPLETED}
                    className="w-full bg-[var(--background)] border border-white/10 rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-50"
                    autoFocus
                />
                <button 
                    onClick={handleSend}
                    disabled={!input.trim() || loading || step === STEPS.WAIT_JOB}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[var(--primary)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--primary)]/90"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
            </div>
        )}
      </div>
    </div>
  );
}

/*
MANUAL TEST CHECKLIST:
1. Initial Load:
   - Verify the chat component appears on the homepage.
   - Verify the initial greeting "Hey! I'm Kogno..." appears after a short delay.

2. Course Entry:
   - Type a course name (e.g., "Calculus 2").
   - Verify the bot asks for the college name.

3. College Entry:
   - Type a college name (e.g., "MIT").
   - Verify the "Validating..." state (loading dots).
   - Verify the topics list appears (mocked or real).

4. Topic Selection:
   - Click a topic chip.
   - Verify the input updates or the selection is processed immediately.
   - Verify the "Creating your personalized lesson..." message appears.

5. Custom Topic:
   - Type a custom topic in the "Or type a topic..." input.
   - Verify validation triggers and then moves to lesson generation.

6. Job Generation:
   - Verify the "Analyzing...", "Structuring..." stall messages appear sequentially.
   - Verify polling occurs (check network tab for /lesson-status calls).

7. Completion:
   - Verify redirection to the course/lesson page when status returns 'completed'.
   - Verify error handling if status returns 'failed'.
*/
