"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MathJax } from "better-react-mathjax";
import { supabase } from "@/lib/supabase/client";
import ReviewQuiz from "@/components/content/ReviewQuiz";
import { authFetch } from "@/lib/api";

// Calculate spaced repetition intervals based on time remaining
// Uses percentages of remaining time following spaced repetition best practices
function getConfidenceIntervals(secondsRemaining) {
  // Convert seconds to minutes for calculations
  const minutesRemaining = Math.max(secondsRemaining / 60, 60); // min 1 hour worth
  
  // Spaced repetition intervals as percentage of remaining time:
  // again: fixed 1 minute - review very soon
  // hard: fixed 10 minutes - short interval
  // good: ~10% - medium interval
  // easy: ~25% - long interval (confident, space it out)
  return {
    again: 1,                                                      // fixed 1 minute
    hard: 10,                                                      // fixed 10 minutes
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
  const [activeTab, setActiveTab] = useState(null); // null = mode selector view
  
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
  
  // Uploaded flashcards state
  const [uploadedDecks, setUploadedDecks] = useState([]);
  const [includeUploadedCards, setIncludeUploadedCards] = useState(false);
  const [studyOnlyUploaded, setStudyOnlyUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  
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
        const courseRes = await authFetch(`/api/courses?userId=${encodeURIComponent(userId)}`);
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
        const planRes = await authFetch(`/api/courses/${courseId}/plan?userId=${encodeURIComponent(userId)}`);
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

  // Fetch questions that need review
  useEffect(() => {
    if (!userId || !courseId) return;
    
    const fetchQuestions = async () => {
      setQuestionsLoading(true);
      try {
        const res = await authFetch(
          `/api/courses/${courseId}/questions?userId=${encodeURIComponent(userId)}&correctness=needs_review`
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
    // Reset study only uploaded when selecting lessons
    if (!selectedLessons.includes(lessonId)) {
      setStudyOnlyUploaded(false);
    }
  };

  // Handle Anki file upload
  const handleAnkiUpload = async (file) => {
    if (!file || !userId) return;
    
    setUploading(true);
    setUploadError(null);
    
    try {
      const formData = new FormData();
      formData.append("ankiFile", file);
      formData.append("userId", userId);
      
      const res = await authFetch(`/api/courses/${courseId}/flashcards/upload`, {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setUploadedDecks(prev => [...prev, {
          deckName: data.deckName,
          imported: data.imported,
          nodeId: data.nodeId,
          uploadedAt: new Date().toISOString(),
        }]);
        setIncludeUploadedCards(true);
      } else {
        setUploadError(data.error || "Failed to upload deck");
      }
    } catch (err) {
      console.error("Error uploading Anki deck:", err);
      setUploadError("An error occurred while uploading");
    } finally {
      setUploading(false);
    }
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
    if ((!selectedLessons.length && !includeUploadedCards) || !userId) return;
    
    setFlashcardsLoading(true);
    try {
      const now = new Date().toISOString();
      const queryParams = new URLSearchParams({
        userId,
        current_timestamp: now,
      });
      
      // Add lessons if not studying only uploaded cards
      if (!studyOnlyUploaded && selectedLessons.length > 0) {
        queryParams.set("lessons", selectedLessons.join(","));
      }
      
      // Include uploaded cards flag
      if (includeUploadedCards || studyOnlyUploaded) {
        queryParams.set("include_uploaded", "true");
      }
      
      // If studying only uploaded, don't pass lessons
      if (studyOnlyUploaded) {
        queryParams.delete("lessons");
        queryParams.set("uploaded_only", "true");
      }
      
      const res = await authFetch(
        `/api/courses/${courseId}/flashcards?${queryParams.toString()}`
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
      await authFetch(`/api/courses/${courseId}/flashcards`, {
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
            <div className="flex items-center gap-3">
              {activeTab && (
                <button
                  onClick={() => { setActiveTab(null); setFlashcardStudyMode(false); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Change Mode
                </button>
              )}
              <Link
                href={`/courses/${courseId}`}
                className="btn btn-outline btn-sm"
              >
                Back to Course
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {/* Mode Selector */}
          {!activeTab && (
            <motion.div
              key="mode-selector"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="py-8"
            >
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-bold mb-3">How would you like to review?</h2>
                <p className="text-[var(--muted-foreground)] max-w-lg mx-auto">
                  Choose a review method that works best for your learning style
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {/* Questions Card */}
                <motion.button
                  onClick={() => setActiveTab("questions")}
                  className="group relative p-8 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--primary)] hover:shadow-xl hover:shadow-[var(--primary)]/10 transition-all duration-300 text-center"
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Badge */}
                  {!questionsLoading && incorrectQuestions.length > 0 && (
                    <div className="absolute -top-3 -right-3 px-3 py-1 rounded-full bg-amber-500 text-white text-sm font-bold shadow-lg">
                      {incorrectQuestions.length} to review
                    </div>
                  )}
                  
                  {/* Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-bold mb-2 group-hover:text-[var(--primary)] transition-colors">
                    Question Review
                  </h3>
                  <p className="text-[var(--muted-foreground)] mb-6">
                    Practice questions you got wrong or flagged. Get instant feedback and track your improvement.
                  </p>
                  
                  {/* Arrow */}
                  <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto group-hover:bg-[var(--primary)] group-hover:text-white transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </motion.button>
                
                {/* Flashcards Card */}
                <motion.button
                  onClick={() => setActiveTab("flashcards")}
                  className="group relative p-8 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--primary)] hover:shadow-xl hover:shadow-[var(--primary)]/10 transition-all duration-300 text-center"
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)]/20 to-emerald-500/10 flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-bold mb-2 group-hover:text-[var(--primary)] transition-colors">
                    Flashcard Study
                  </h3>
                  <p className="text-[var(--muted-foreground)] mb-6">
                    Review key concepts with spaced repetition. Rate your confidence to optimize your study schedule.
                  </p>
                  
                  {/* Arrow */}
                  <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto group-hover:bg-[var(--primary)] group-hover:text-white transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </motion.button>
              </div>
              
              {/* Quick stats */}
              <div className="mt-12 flex justify-center gap-8 text-center">
                <div>
                  <p className="text-2xl font-bold text-[var(--foreground)]">
                    {questionsLoading ? "..." : incorrectQuestions.length}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)]">Questions to review</p>
                </div>
                <div className="w-px bg-[var(--border)]" />
                <div>
                  <p className="text-2xl font-bold text-[var(--foreground)]">
                    {studyPlanLoading ? "..." : allLessons.length}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)]">Lessons with flashcards</p>
                </div>
              </div>
            </motion.div>
          )}

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
                userId={userId}
                courseId={courseId}
                onQuestionsUpdated={() => {
                  // Refresh questions after completing review
                  const fetchQuestions = async () => {
                    try {
                      const res = await authFetch(
                        `/api/courses/${courseId}/questions?userId=${encodeURIComponent(userId)}&correctness=needs_review`
                      );
                      if (res.ok) {
                        const data = await res.json();
                        setIncorrectQuestions(data.questions || []);
                      }
                    } catch (err) {
                      console.error("Error fetching questions:", err);
                    }
                  };
                  fetchQuestions();
                }}
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
                uploadedDecks={uploadedDecks}
                includeUploadedCards={includeUploadedCards}
                setIncludeUploadedCards={setIncludeUploadedCards}
                studyOnlyUploaded={studyOnlyUploaded}
                setStudyOnlyUploaded={setStudyOnlyUploaded}
                onUpload={handleAnkiUpload}
                uploading={uploading}
                uploadError={uploadError}
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
function QuestionsReview({ questions, loading, userId, courseId, onQuestionsUpdated }) {
  const [reviewComplete, setReviewComplete] = useState(false);
  const [reviewStats, setReviewStats] = useState(null);

  // Reset review state when questions change
  useEffect(() => {
    setReviewComplete(false);
    setReviewStats(null);
  }, [questions]);

  const handleQuestionCompleted = useCallback((questionId, isCorrect, attemptCount) => {
    console.log(`Question ${questionId} completed: correct=${isCorrect}, attempts=${attemptCount}`);
  }, []);

  const handleAllCompleted = useCallback((stats) => {
    setReviewComplete(true);
    setReviewStats(stats);
    // Notify parent to refresh questions
    if (typeof onQuestionsUpdated === 'function') {
      onQuestionsUpdated();
    }
  }, [onQuestionsUpdated]);

  const handleStartNewReview = useCallback(() => {
    setReviewComplete(false);
    setReviewStats(null);
    if (typeof onQuestionsUpdated === 'function') {
      onQuestionsUpdated();
    }
  }, [onQuestionsUpdated]);

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
        <h3 className="text-lg font-semibold mb-2">All caught up! 🎉</h3>
        <p className="text-[var(--muted-foreground)] max-w-md">
          You have no questions to review. Continue learning in your course and check back later.
        </p>
      </div>
    );
  }

  // Show completion screen
  if (reviewComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30"
        >
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-2xl font-bold mb-2 text-[var(--foreground)]">Review Complete!</h3>
          <p className="text-[var(--muted-foreground)] max-w-md mb-6">
            Great job! You've reviewed all {reviewStats?.totalQuestions || 0} questions.
            {reviewStats?.flaggedCount > 0 && (
              <span className="block mt-1">
                {reviewStats.flaggedCount} question{reviewStats.flaggedCount !== 1 ? 's' : ''} flagged for future review.
              </span>
            )}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleStartNewReview}
              className="px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-semibold hover:opacity-90 transition-colors"
            >
              Check for More Questions
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {questions.length} question{questions.length !== 1 ? "s" : ""} to review
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Answer each question correctly to remove it from your review list
          </p>
        </div>
      </div>

      {/* Interactive Review Quiz */}
      <ReviewQuiz
        questions={questions}
        userId={userId}
        courseId={courseId}
        onQuestionCompleted={handleQuestionCompleted}
        onAllCompleted={handleAllCompleted}
      />
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
  uploadedDecks = [],
  includeUploadedCards,
  setIncludeUploadedCards,
  studyOnlyUploaded,
  setStudyOnlyUploaded,
  onUpload,
  uploading,
  uploadError,
}) {
  const fileInputRef = React.useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      e.target.value = "";
    }
  };

  const handleStudyOnlyUploaded = () => {
    setStudyOnlyUploaded(true);
    setIncludeUploadedCards(true);
    clearAll();
  };

  const handleIncludeWithLessons = () => {
    setStudyOnlyUploaded(false);
    setIncludeUploadedCards(true);
  };

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
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-1)] flex items-center justify-center mb-6 shadow-lg">
          <svg className="w-12 h-12 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold mb-2">No lessons found</h3>
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

  const totalLessons = lessons.length;
  const selectedCount = selectedLessons.length;

  return (
    <div className="space-y-6">
      {/* Uploaded Anki Decks Section */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-violet-500/10 to-purple-500/5 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[var(--foreground)]">Uploaded Anki Decks</h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                {uploadedDecks.length > 0 
                  ? `${uploadedDecks.length} deck${uploadedDecks.length !== 1 ? 's' : ''} uploaded` 
                  : "Import your Anki flashcards"}
              </p>
            </div>
          </div>
          
          {/* Upload button */}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".apkg"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Upload .apkg
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Upload error */}
        {uploadError && (
          <div className="px-4 py-3 bg-rose-500/10 border-b border-rose-500/20 flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{uploadError}</span>
          </div>
        )}
        
        {/* Uploaded decks list */}
        {uploadedDecks.length > 0 && (
          <div className="p-4 space-y-3">
            {uploadedDecks.map((deck, idx) => (
              <div 
                key={deck.nodeId || idx}
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)]/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{deck.deckName}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{deck.imported} cards imported</p>
                  </div>
                </div>
                <div className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                  Ready
                </div>
              </div>
            ))}
            
            {/* Study options for uploaded cards */}
            <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--surface-2)] cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={includeUploadedCards && !studyOnlyUploaded}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleIncludeWithLessons();
                    } else {
                      setIncludeUploadedCards(false);
                      setStudyOnlyUploaded(false);
                    }
                  }}
                  className="w-5 h-5 rounded border-2 border-[var(--border)] text-violet-500 focus:ring-violet-500"
                />
                <div>
                  <p className="text-sm font-medium">Include with lesson flashcards</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Study uploaded cards mixed with lesson content</p>
                </div>
              </label>
              
              <button
                onClick={handleStudyOnlyUploaded}
                className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl font-medium text-sm transition-all ${
                  studyOnlyUploaded
                    ? "bg-violet-500 text-white"
                    : "bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {studyOnlyUploaded ? "Studying uploaded cards only" : "Study only uploaded cards"}
              </button>
            </div>
          </div>
        )}
        
        {/* Empty state */}
        {uploadedDecks.length === 0 && (
          <div className="p-6 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              Upload an Anki deck (.apkg file) to study your own flashcards alongside course content.
            </p>
          </div>
        )}
      </div>

      {/* Divider with OR */}
      {uploadedDecks.length > 0 && lessons.length > 0 && !studyOnlyUploaded && (
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-sm text-[var(--muted-foreground)] font-medium">AND / OR</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>
      )}

      {/* Header with stats */}
      {!studyOnlyUploaded && (
        <>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">Select lessons to study</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Choose which lessons' flashcards you want to review
          </p>
        </div>
        
        {/* Selection stats and actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface-2)]">
            <div className={`w-2 h-2 rounded-full ${selectedCount > 0 ? 'bg-emerald-500' : 'bg-[var(--muted-foreground)]'}`} />
            <span className="text-sm font-medium">
              {selectedCount} / {totalLessons} selected
            </span>
          </div>
          <div className="flex items-center border border-[var(--border)] rounded-lg overflow-hidden">
            <button
              onClick={clearAll}
              disabled={selectedCount === 0}
              className="px-3 py-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear
            </button>
            <div className="w-px h-6 bg-[var(--border)]" />
            <button
              onClick={selectAll}
              disabled={selectedCount === totalLessons}
              className="px-3 py-1.5 text-sm text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Select All
            </button>
          </div>
        </div>
      </div>

      {/* Module list */}
      <div className="space-y-4">
        {Object.entries(lessonsByModule).map(([moduleName, moduleLessons], moduleIdx) => {
          const allModuleLessonsSelected = moduleLessons.every(l => selectedLessons.includes(l.id));
          const someModuleLessonsSelected = moduleLessons.some(l => selectedLessons.includes(l.id));
          const moduleSelectedCount = moduleLessons.filter(l => selectedLessons.includes(l.id)).length;
          
          return (
            <motion.div 
              key={moduleName} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: moduleIdx * 0.05 }}
              className={`rounded-2xl border overflow-hidden transition-colors ${
                someModuleLessonsSelected 
                  ? 'border-[var(--primary)]/30 bg-[var(--primary)]/5' 
                  : 'border-[var(--border)] bg-[var(--surface-1)]'
              }`}
            >
              {/* Module header */}
              <div className="px-4 py-3 bg-[var(--surface-2)]/50 border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    allModuleLessonsSelected 
                      ? 'bg-[var(--primary)] text-white' 
                      : someModuleLessonsSelected
                      ? 'bg-[var(--primary)]/20 text-[var(--primary)]'
                      : 'bg-[var(--surface-muted)] text-[var(--muted-foreground)]'
                  }`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--foreground)]">{moduleName}</h3>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {moduleSelectedCount} of {moduleLessons.length} lessons selected
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => allModuleLessonsSelected ? deselectModule(moduleName) : selectModule(moduleName)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    allModuleLessonsSelected
                      ? "bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-1)]"
                  }`}
                >
                  {allModuleLessonsSelected ? "Deselect All" : "Select All"}
                </button>
              </div>
              
              {/* Lessons */}
              <div className="p-2 grid gap-1">
                {moduleLessons.map((lesson, lessonIdx) => {
                  const isSelected = selectedLessons.includes(lesson.id);
                  return (
                    <motion.button
                      key={lesson.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: moduleIdx * 0.05 + lessonIdx * 0.02 }}
                      onClick={() => toggleLesson(lesson.id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                        isSelected
                          ? "bg-[var(--primary)]/10"
                          : "hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? "border-[var(--primary)] bg-[var(--primary)] scale-110"
                          : "border-[var(--border)] hover:border-[var(--primary)]/50"
                      }`}>
                        {isSelected && (
                          <motion.svg 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-3 h-3 text-white" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </motion.svg>
                        )}
                      </div>
                      
                      {/* Lesson info */}
                      <div className="flex-1 text-left">
                        <span className={`text-sm font-medium transition-colors ${
                          isSelected ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'
                        }`}>
                          {lesson.title}
                        </span>
                      </div>
                      
                      {/* Card icon */}
                      <div className={`flex items-center gap-1 ${
                        isSelected ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
                      }`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
      </>
      )}

      {/* Start button - sticky at bottom */}
      <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-[var(--background)] via-[var(--background)] to-transparent">
        <motion.button
          whileHover={{ scale: (selectedCount > 0 || studyOnlyUploaded) ? 1.01 : 1 }}
          whileTap={{ scale: (selectedCount > 0 || studyOnlyUploaded) ? 0.99 : 1 }}
          onClick={onStart}
          disabled={(selectedCount === 0 && !studyOnlyUploaded) || fetchingFlashcards}
          className={`
            w-full py-4 rounded-2xl font-semibold text-lg
            flex items-center justify-center gap-3
            transition-all duration-200 shadow-lg
            ${(selectedCount > 0 || studyOnlyUploaded)
              ? studyOnlyUploaded 
                ? 'bg-violet-500 text-white hover:shadow-xl hover:shadow-violet-500/20'
                : 'bg-[var(--primary)] text-white hover:shadow-xl hover:shadow-[var(--primary)]/20' 
              : 'bg-[var(--surface-2)] text-[var(--muted-foreground)] cursor-not-allowed'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {fetchingFlashcards ? (
            <>
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              Loading flashcards...
            </>
          ) : studyOnlyUploaded ? (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start Studying Uploaded Cards
            </>
          ) : selectedCount > 0 ? (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start Studying
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-sm">
                {selectedCount} lesson{selectedCount !== 1 ? 's' : ''}{includeUploadedCards ? ' + uploaded' : ''}
              </span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Select at least one lesson or upload a deck
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}

// Flashcard Study Component
function FlashcardStudy({ flashcard, index, total, isFlipped, onFlip, onRate, onExit, intervals }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showKeyboardHint, setShowKeyboardHint] = useState(true);

  // Hide keyboard hint after first interaction
  useEffect(() => {
    if (isFlipped && showKeyboardHint) {
      const timer = setTimeout(() => setShowKeyboardHint(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isFlipped, showKeyboardHint]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!isAnimating) {
          setIsAnimating(true);
          onFlip();
          setTimeout(() => setIsAnimating(false), 400);
        }
      }
      if (isFlipped && !isAnimating) {
        if (e.key === "1") onRate("again");
        if (e.key === "2") onRate("hard");
        if (e.key === "3") onRate("good");
        if (e.key === "4") onRate("easy");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isFlipped, onFlip, onRate, isAnimating]);

  const handleFlip = () => {
    if (!isAnimating) {
      setIsAnimating(true);
      onFlip();
      setTimeout(() => setIsAnimating(false), 400);
    }
  };

  const progressPercent = ((index + 1) / total) * 100;
  const cardsRemaining = total - index - 1;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onExit}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Exit Study
        </button>
        
        <div className="flex items-center gap-4">
          {/* Cards remaining indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface-2)]">
            <svg className="w-4 h-4 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-sm font-medium">{cardsRemaining} left</span>
          </div>
          
          {/* Current position */}
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[var(--foreground)]">{index + 1}</span>
            <span className="text-[var(--muted-foreground)]">/</span>
            <span className="text-lg text-[var(--muted-foreground)]">{total}</span>
          </div>
        </div>
      </div>

      {/* Enhanced Progress bar */}
      <div className="relative mb-8">
        <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-[var(--primary)] rounded-full"
            initial={{ width: `${((index) / total) * 100}%` }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        {/* Progress milestones */}
        <div className="absolute inset-0 flex justify-between items-center px-0.5">
          {[0, 25, 50, 75, 100].map((milestone) => (
            <div
              key={milestone}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                progressPercent >= milestone 
                  ? "bg-white shadow-sm" 
                  : "bg-[var(--surface-muted)]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Enhanced Card */}
      <div 
        onClick={handleFlip}
        className="relative cursor-pointer group"
        style={{ perspective: "1200px" }}
      >
        {/* Card glow effect */}
        <div className={`absolute -inset-4 rounded-3xl transition-opacity duration-500 ${
          !isFlipped 
            ? "bg-[var(--primary)]/20 opacity-50 blur-xl" 
            : "bg-emerald-500/10 opacity-30 blur-xl"
        }`} />
        
        <motion.div
          className="relative w-full"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Front of card */}
          <div 
            className="relative min-h-[320px] rounded-2xl overflow-hidden shadow-2xl"
            style={{ backfaceVisibility: "hidden" }}
          >
            {/* Gradient background with pattern */}
            <div className="absolute inset-0 bg-[var(--primary)]">
              <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>
            </div>
            
            {/* Card content */}
            <div className="relative h-full min-h-[320px] p-8 flex flex-col items-center justify-center">
              {/* Question label */}
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full bg-white/20 text-white/80 text-xs font-medium backdrop-blur-sm">
                  Question
                </span>
              </div>
              
              {/* Main content */}
              <div className="text-center max-w-lg">
                <MathJax dynamic>
                  <p className="text-xl sm:text-2xl font-semibold text-white leading-relaxed">
                    {flashcard.front}
                  </p>
                </MathJax>
              </div>
              
              {/* Flip hint */}
              <div className="absolute bottom-6 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm">
                  <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-sm text-white/80 font-medium">Tap to reveal</span>
                </div>
                <span className="text-xs text-white/50">or press Space</span>
              </div>
            </div>
          </div>

          {/* Back of card */}
          <div 
            className="absolute inset-0 min-h-[320px] rounded-2xl overflow-hidden shadow-2xl"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            {/* Light gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--surface-1)] to-[var(--surface-2)]" />
            
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-[var(--primary)]/10 rounded-full blur-2xl" />
            
            {/* Card content */}
            <div className="relative h-full min-h-[320px] p-8 flex flex-col items-center justify-center border border-[var(--border)] rounded-2xl">
              {/* Answer label */}
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Answer
                </span>
              </div>
              
              {/* Main content */}
              <div className="text-center max-w-lg">
                <MathJax dynamic>
                  <p className="text-xl sm:text-2xl font-medium text-[var(--foreground)] leading-relaxed">
                    {flashcard.back}
                  </p>
                </MathJax>
              </div>
              
              {/* Flip back hint */}
              <div className="absolute bottom-4 right-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFlip();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-xs font-medium"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  See question
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Enhanced Confidence Buttons */}
      <AnimatePresence>
        {isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="mt-10"
          >
            {/* Section header */}
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
                How well did you know this?
              </h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Your rating determines when you'll see this card again
              </p>
            </div>
            
            {/* Rating buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(CONFIDENCE_LABELS).map(([key, { label, description, color }], idx) => {
                const colorClasses = {
                  rose: {
                    bg: "bg-gradient-to-br from-rose-500/10 to-rose-600/5",
                    border: "border-rose-500/30 hover:border-rose-500/50",
                    text: "text-rose-600 dark:text-rose-400",
                    icon: "bg-rose-500",
                    hover: "hover:shadow-rose-500/20",
                  },
                  amber: {
                    bg: "bg-gradient-to-br from-amber-500/10 to-amber-600/5",
                    border: "border-amber-500/30 hover:border-amber-500/50",
                    text: "text-amber-600 dark:text-amber-400",
                    icon: "bg-amber-500",
                    hover: "hover:shadow-amber-500/20",
                  },
                  emerald: {
                    bg: "bg-gradient-to-br from-emerald-500/10 to-emerald-600/5",
                    border: "border-emerald-500/30 hover:border-emerald-500/50",
                    text: "text-emerald-600 dark:text-emerald-400",
                    icon: "bg-emerald-500",
                    hover: "hover:shadow-emerald-500/20",
                  },
                  sky: {
                    bg: "bg-gradient-to-br from-sky-500/10 to-sky-600/5",
                    border: "border-sky-500/30 hover:border-sky-500/50",
                    text: "text-sky-600 dark:text-sky-400",
                    icon: "bg-sky-500",
                    hover: "hover:shadow-sky-500/20",
                  },
                };
                
                const classes = colorClasses[color];
                
                return (
                  <motion.button
                    key={key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + idx * 0.05 }}
                    onClick={() => onRate(key)}
                    className={`
                      relative flex flex-col items-center gap-2 p-4 sm:p-5 rounded-2xl border-2
                      transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                      hover:shadow-lg ${classes.hover}
                      ${classes.bg} ${classes.border} ${classes.text}
                    `}
                  >
                    {/* Keyboard shortcut badge */}
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[var(--surface-1)] border border-[var(--border)] flex items-center justify-center shadow-sm">
                      <span className="text-xs font-bold text-[var(--muted-foreground)]">{idx + 1}</span>
                    </div>
                    
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl ${classes.icon} flex items-center justify-center shadow-lg`}>
                      {key === 'again' && (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                      {key === 'hard' && (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {key === 'good' && (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {key === 'easy' && (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      )}
                    </div>
                    
                    {/* Label and description */}
                    <div className="text-center">
                      <span className="font-bold text-base">{label}</span>
                      <p className="text-xs opacity-75 mt-0.5 hidden sm:block">{description}</p>
                    </div>
                    
                    {/* Time interval */}
                    <div className="px-2 py-1 rounded-full bg-[var(--surface-2)]/50 backdrop-blur-sm">
                      <span className="text-[10px] font-medium opacity-60">
                        {formatInterval(intervals[key])}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
            
            {/* Keyboard hint */}
            <AnimatePresence>
              {showKeyboardHint && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-xs text-[var(--muted-foreground)] mt-5 flex items-center justify-center gap-2"
                >
                  <kbd className="px-2 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] font-mono text-[10px]">1</kbd>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] font-mono text-[10px]">2</kbd>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] font-mono text-[10px]">3</kbd>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] font-mono text-[10px]">4</kbd>
                  <span className="ml-1">for quick rating</span>
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Study streak / motivation (appears when not flipped) */}
      {!isFlipped && index > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-[var(--muted-foreground)]">
            You've reviewed <span className="font-semibold text-[var(--foreground)]">{index}</span> card{index !== 1 ? 's' : ''} this session
          </p>
        </motion.div>
      )}
    </div>
  );
}
