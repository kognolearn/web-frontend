"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MathJax } from "better-react-mathjax";
import { supabase } from "@/lib/supabase/client";

// Calculate spaced repetition intervals based on time remaining
// Uses percentages of remaining time following spaced repetition best practices
function getConfidenceIntervals(secondsRemaining) {
  // Convert seconds to minutes for calculations
  const minutesRemaining = Math.max(secondsRemaining / 60, 60); // min 1 hour worth
  
  // Spaced repetition intervals as percentage of remaining time:
  // again: ~0.1% - review very soon
  // hard: ~1% - short interval
  // good: ~10% - medium interval
  // easy: ~25% - long interval (confident, space it out)
  return {
    again: Math.max(1, Math.round(minutesRemaining * 0.001)),      // min 1 minute
    hard: Math.max(5, Math.round(minutesRemaining * 0.01)),        // min 5 minutes
    good: Math.max(30, Math.round(minutesRemaining * 0.1)),        // min 30 minutes
    easy: Math.max(60, Math.round(minutesRemaining * 0.25)),       // min 1 hour
  };
}

// Format minutes to readable string
function formatInterval(minutes) {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} hr`;
  return `${Math.round(minutes / 1440)} day`;
}

const CONFIDENCE_LABELS = {
  again: { label: "Again", description: "I didn't know this", color: "rose" },
  hard: { label: "Hard", description: "I struggled", color: "amber" },
  good: { label: "Good", description: "I remembered", color: "emerald" },
  easy: { label: "Easy", description: "Too easy!", color: "sky" },
};

export default function ReviewPage() {
  const { courseId } = useParams();
  const router = useRouter();
  
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("questions");
  
  // Questions state
  const [incorrectQuestions, setIncorrectQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  
  // Flashcards state
  const [flashcards, setFlashcards] = useState([]);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [studyPlan, setStudyPlan] = useState(null);
  const [studyPlanLoading, setStudyPlanLoading] = useState(true);
  const [selectedLessons, setSelectedLessons] = useState([]);
  const [flashcardStudyMode, setFlashcardStudyMode] = useState(false);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Course data
  const [courseName, setCourseName] = useState("");
  const [secondsToComplete, setSecondsToComplete] = useState(3600); // default 1 hour

  // Initialize user
  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/sign-in");
        return;
      }
      setUserId(user.id);
      setLoading(false);
    };
    initUser();
  }, [router]);

  // Fetch course info and study plan
  useEffect(() => {
    if (!userId || !courseId) return;
    
    const fetchCourseData = async () => {
      setStudyPlanLoading(true);
      try {
        // Fetch course name
        const courseRes = await fetch(`/api/courses?userId=${encodeURIComponent(userId)}`);
        if (courseRes.ok) {
          const courseData = await courseRes.json();
          const course = courseData.courses?.find(c => c.id === courseId);
          if (course) {
            setCourseName(course.title || course.course_title || course.name || "Course");
            if (typeof course.seconds_to_complete === 'number') {
              setSecondsToComplete(course.seconds_to_complete);
            } else if (typeof course.secondsToComplete === 'number') {
              setSecondsToComplete(course.secondsToComplete);
            }
          }
        }
        
        // Fetch study plan for lesson selection
        const planRes = await fetch(`/api/courses/${courseId}/plan?userId=${encodeURIComponent(userId)}`);
        if (planRes.ok) {
          const planData = await planRes.json();
          setStudyPlan(planData);
        }
      } catch (err) {
        console.error("Error fetching course data:", err);
      } finally {
        setStudyPlanLoading(false);
      }
    };
    
    fetchCourseData();
  }, [userId, courseId]);

  // Fetch incorrect questions
  useEffect(() => {
    if (!userId || !courseId) return;
    
    const fetchQuestions = async () => {
      setQuestionsLoading(true);
      try {
        const res = await fetch(
          `/api/courses/${courseId}/questions?userId=${encodeURIComponent(userId)}&correctness=incorrect`
        );
        if (res.ok) {
          const data = await res.json();
          setIncorrectQuestions(data.questions || []);
        }
      } catch (err) {
        console.error("Error fetching questions:", err);
      } finally {
        setQuestionsLoading(false);
      }
    };
    
    fetchQuestions();
  }, [userId, courseId]);

  // Get all lessons from study plan
  const allLessons = useMemo(() => {
    if (!studyPlan?.modules) return [];
    
    const lessons = [];
    studyPlan.modules.forEach(module => {
      module.lessons?.forEach(lesson => {
        lessons.push({
          id: lesson.id,
          title: lesson.title || lesson.name,
          moduleName: module.title || module.name,
        });
      });
    });
    return lessons;
  }, [studyPlan]);

  // Current flashcard being studied
  const currentFlashcard = flashcards[currentFlashcardIndex];

  // Toggle lesson selection
  const toggleLessonSelection = (lessonId) => {
    setSelectedLessons(prev => 
      prev.includes(lessonId) 
        ? prev.filter(id => id !== lessonId)
        : [...prev, lessonId]
    );
  };

  // Select all lessons
  const selectAllLessons = () => {
    setSelectedLessons(allLessons.map(l => l.id));
  };

  // Select all lessons in a module
  const selectModule = (moduleName) => {
    const moduleLessonIds = allLessons
      .filter(l => l.moduleName === moduleName)
      .map(l => l.id);
    setSelectedLessons(prev => {
      const newSet = new Set(prev);
      moduleLessonIds.forEach(id => newSet.add(id));
      return Array.from(newSet);
    });
  };

  // Deselect all lessons in a module
  const deselectModule = (moduleName) => {
    const moduleLessonIds = new Set(
      allLessons.filter(l => l.moduleName === moduleName).map(l => l.id)
    );
    setSelectedLessons(prev => prev.filter(id => !moduleLessonIds.has(id)));
  };

  // Clear lesson selection
  const clearLessonSelection = () => {
    setSelectedLessons([]);
  };

  // Fetch flashcards for selected lessons and start study
  const startFlashcardStudy = async () => {
    if (!selectedLessons.length || !userId) return;
    
    setFlashcardsLoading(true);
    try {
      const now = new Date().toISOString();
      const lessonsParam = selectedLessons.join(",");
      const res = await fetch(
        `/api/courses/${courseId}/flashcards?userId=${encodeURIComponent(userId)}&current_timestamp=${encodeURIComponent(now)}&lessons=${encodeURIComponent(lessonsParam)}`
      );
      if (res.ok) {
        const data = await res.json();
        // Filter client-side to ensure timezone correctness
        const currentTime = new Date();
        const dueFlashcards = (data.flashcards || []).filter(card => {
          if (!card.next_show_timestamp) return true;
          const cardTime = new Date(card.next_show_timestamp);
          return cardTime <= currentTime;
        });
        
        if (dueFlashcards.length > 0) {
          setFlashcards(dueFlashcards);
          setCurrentFlashcardIndex(0);
          setIsFlipped(false);
          setFlashcardStudyMode(true);
        } else {
          setFlashcards([]);
        }
      }
    } catch (err) {
      console.error("Error fetching flashcards:", err);
    } finally {
      setFlashcardsLoading(false);
    }
  };

  // Calculate intervals based on remaining course time
  const confidenceIntervals = useMemo(() => {
    return getConfidenceIntervals(secondsToComplete);
  }, [secondsToComplete]);

  // Handle confidence rating
  const handleConfidenceRating = async (confidence) => {
    if (!currentFlashcard || !userId) return;
    
    const intervalMinutes = confidenceIntervals[confidence];
    const nextShowTime = new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString();
    
    try {
      await fetch(`/api/courses/${courseId}/flashcards`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          updates: [{
            id: currentFlashcard.id,
            next_show_timestamp: nextShowTime,
          }],
        }),
      });
      
      // Move to next card or end study
      if (currentFlashcardIndex < flashcards.length - 1) {
        setCurrentFlashcardIndex(prev => prev + 1);
        setIsFlipped(false);
      } else {
        // Study complete
        setFlashcardStudyMode(false);
        setSelectedLessons([]);
        setFlashcards([]);
      }
    } catch (err) {
      console.error("Error updating flashcard:", err);
    }
  };

  // Flip card
  const flipCard = () => setIsFlipped(prev => !prev);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface-1)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold">Review Mode</h1>
                <p className="text-sm text-[var(--muted-foreground)]">{courseName}</p>
              </div>
            </div>
            <Link
              href={`/courses/${courseId}`}
              className="btn btn-outline btn-sm"
            >
              Back to Course
            </Link>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-[var(--border)] bg-[var(--surface-1)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            <button
              onClick={() => { setActiveTab("questions"); setFlashcardStudyMode(false); }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "questions"
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Questions to Review
                {!questionsLoading && (
                  <span className="px-1.5 py-0.5 text-xs rounded-full bg-[var(--surface-2)]">
                    {incorrectQuestions.length}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("flashcards")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "flashcards"
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Flashcards
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === "questions" && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <QuestionsReview 
                questions={incorrectQuestions} 
                loading={questionsLoading} 
              />
            </motion.div>
          )}
          
          {activeTab === "flashcards" && !flashcardStudyMode && (
            <motion.div
              key="flashcards-select"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <FlashcardLessonSelector
                lessons={allLessons}
                selectedLessons={selectedLessons}
                toggleLesson={toggleLessonSelection}
                selectAll={selectAllLessons}
                clearAll={clearLessonSelection}
                selectModule={selectModule}
                deselectModule={deselectModule}
                onStart={startFlashcardStudy}
                loading={studyPlanLoading}
                fetchingFlashcards={flashcardsLoading}
              />
            </motion.div>
          )}
          
          {activeTab === "flashcards" && flashcardStudyMode && currentFlashcard && (
            <motion.div
              key="flashcards-study"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <FlashcardStudy
                flashcard={currentFlashcard}
                index={currentFlashcardIndex}
                total={flashcards.length}
                isFlipped={isFlipped}
                onFlip={flipCard}
                onRate={handleConfidenceRating}
                onExit={() => { setFlashcardStudyMode(false); setFlashcards([]); }}
                intervals={confidenceIntervals}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Questions Review Component
function QuestionsReview({ questions, loading }) {
  const [expandedId, setExpandedId] = useState(null);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full mb-4" />
        <p className="text-[var(--muted-foreground)]">Loading questions...</p>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">No questions to review</h3>
        <p className="text-[var(--muted-foreground)] max-w-md">
          Continue in your course and we'll add questions here as you go. Questions you get wrong will appear here for review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">
          {questions.length} question{questions.length !== 1 ? "s" : ""} to review
        </h2>
      </div>
      
      {questions.map((q, idx) => (
        <div
          key={q.id}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden"
        >
          <button
            onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
            className="w-full px-5 py-4 flex items-start gap-4 text-left hover:bg-[var(--surface-2)]/50 transition-colors"
          >
            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center text-sm font-semibold">
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <MathJax dynamic>
                <p className="text-[var(--foreground)] line-clamp-2">{q.question}</p>
              </MathJax>
            </div>
            <svg 
              className={`w-5 h-5 text-[var(--muted-foreground)] transition-transform ${expandedId === q.id ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <AnimatePresence>
            {expandedId === q.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 pt-2 space-y-3 border-t border-[var(--border)]">
                  {q.options?.map((opt, optIdx) => {
                    const isCorrect = optIdx === q.correct_index;
                    return (
                      <div
                        key={optIdx}
                        className={`flex items-start gap-3 p-3 rounded-lg ${
                          isCorrect 
                            ? "bg-emerald-500/10 border border-emerald-500/30" 
                            : "bg-[var(--surface-2)]"
                        }`}
                      >
                        <span className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-semibold ${
                          isCorrect ? "bg-emerald-500 text-white" : "bg-[var(--surface-muted)] text-[var(--muted-foreground)]"
                        }`}>
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <MathJax dynamic>
                          <span className={isCorrect ? "text-emerald-600 dark:text-emerald-400" : ""}>
                            {opt}
                          </span>
                        </MathJax>
                        {isCorrect && (
                          <svg className="w-5 h-5 text-emerald-500 ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                  
                  {q.explanation && (
                    <div className="mt-4 p-4 rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/10">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded flex items-center justify-center bg-[var(--primary)]/10 flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)] mb-1">Explanation</p>
                          <MathJax dynamic>
                            <p className="text-sm text-[var(--foreground)]">{q.explanation}</p>
                          </MathJax>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// Flashcard Lesson Selector Component
function FlashcardLessonSelector({ 
  lessons, 
  selectedLessons, 
  toggleLesson, 
  selectAll, 
  clearAll, 
  selectModule,
  deselectModule,
  onStart, 
  loading,
  fetchingFlashcards,
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full mb-4" />
        <p className="text-[var(--muted-foreground)]">Loading lessons...</p>
      </div>
    );
  }

  if (!lessons.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">No lessons found</h3>
        <p className="text-[var(--muted-foreground)] max-w-md">
          Complete some lessons in your course first to review flashcards.
        </p>
      </div>
    );
  }

  // Group lessons by module
  const lessonsByModule = lessons.reduce((acc, lesson) => {
    const moduleName = lesson.moduleName || "Other";
    if (!acc[moduleName]) acc[moduleName] = [];
    acc[moduleName].push(lesson);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Select lessons to study</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Choose which lessons' flashcards you want to review
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearAll}
            className="px-3 py-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            Clear
          </button>
          <button
            onClick={selectAll}
            className="px-3 py-1.5 text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
          >
            Select All
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(lessonsByModule).map(([moduleName, moduleLessons]) => {
          const allModuleLessonsSelected = moduleLessons.every(l => selectedLessons.includes(l.id));
          const someModuleLessonsSelected = moduleLessons.some(l => selectedLessons.includes(l.id));
          
          return (
          <div key={moduleName} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
            <div className="px-4 py-3 bg-[var(--surface-2)] border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="font-medium text-sm">{moduleName}</h3>
              <button
                onClick={() => allModuleLessonsSelected ? deselectModule(moduleName) : selectModule(moduleName)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  allModuleLessonsSelected
                    ? "text-[var(--primary)] hover:bg-[var(--primary)]/10"
                    : someModuleLessonsSelected
                      ? "text-[var(--primary)] hover:bg-[var(--primary)]/10"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-1)]"
                }`}
              >
                {allModuleLessonsSelected ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="p-2">
              {moduleLessons.map(lesson => (
                <button
                  key={lesson.id}
                  onClick={() => toggleLesson(lesson.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                    selectedLessons.includes(lesson.id)
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedLessons.includes(lesson.id)
                        ? "border-[var(--primary)] bg-[var(--primary)]"
                        : "border-[var(--border)]"
                    }`}>
                      {selectedLessons.includes(lesson.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm">{lesson.title}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )})}
      </div>

      <div className="sticky bottom-4 pt-4">
        <button
          onClick={onStart}
          disabled={selectedLessons.length === 0 || fetchingFlashcards}
          className="w-full btn btn-primary btn-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {fetchingFlashcards ? (
            <>
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              Loading...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start Studying ({selectedLessons.length} lesson{selectedLessons.length !== 1 ? "s" : ""} selected)
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Flashcard Study Component
function FlashcardStudy({ flashcard, index, total, isFlipped, onFlip, onRate, onExit, intervals }) {
  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!isFlipped) onFlip();
      }
      if (isFlipped) {
        if (e.key === "1") onRate("again");
        if (e.key === "2") onRate("hard");
        if (e.key === "3") onRate("good");
        if (e.key === "4") onRate("easy");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isFlipped, onFlip, onRate]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Exit
        </button>
        <span className="text-sm font-medium">
          {index + 1} / {total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[var(--surface-2)] rounded-full overflow-hidden mb-8">
        <div 
          className="h-full bg-[var(--primary)] rounded-full transition-all duration-300"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      {/* Card */}
      <div 
        onClick={!isFlipped ? onFlip : undefined}
        className={`relative min-h-[300px] rounded-2xl p-8 transition-all duration-300 ${
          !isFlipped ? "cursor-pointer" : ""
        }`}
        style={{ perspective: "1000px" }}
      >
        <motion.div
          className="relative w-full h-full"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {/* Front */}
          <div 
            className="absolute inset-0 min-h-[300px] rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-active)] p-8 flex flex-col items-center justify-center text-center shadow-lg"
            style={{ backfaceVisibility: "hidden" }}
          >
            <MathJax dynamic>
              <p className="text-xl font-semibold text-white leading-relaxed">{flashcard.front}</p>
            </MathJax>
            <p className="mt-6 text-white/60 text-sm">Click or press Space to flip</p>
          </div>

          {/* Back */}
          <div 
            className="absolute inset-0 min-h-[300px] rounded-2xl bg-[var(--surface-1)] border border-[var(--border)] p-8 flex flex-col items-center justify-center text-center shadow-lg"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div>
              <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4 inline-block">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Answer</span>
              </div>
              <MathJax dynamic>
                <p className="text-lg font-medium text-[var(--foreground)] leading-relaxed">{flashcard.back}</p>
              </MathJax>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Confidence Buttons */}
      <AnimatePresence>
        {isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-8"
          >
            <p className="text-center text-sm text-[var(--muted-foreground)] mb-4">
              How well did you know this?
            </p>
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(CONFIDENCE_LABELS).map(([key, { label, description, color }]) => (
                <button
                  key={key}
                  onClick={() => onRate(key)}
                  className={`flex flex-col items-center gap-1 p-4 rounded-xl border transition-all hover:scale-105 active:scale-95 ${
                    color === "rose" ? "border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                    color === "amber" ? "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                    color === "emerald" ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                    "border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10 text-sky-600 dark:text-sky-400"
                  }`}
                >
                  <span className="font-semibold">{label}</span>
                  <span className="text-xs opacity-75">{description}</span>
                  <span className="text-[10px] opacity-50 mt-1">
                    {formatInterval(intervals[key])}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-[var(--muted-foreground)] mt-4">
              Press 1-4 on keyboard for quick rating
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
