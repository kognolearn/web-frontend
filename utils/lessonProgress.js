/**
 * Lesson Progress Tracking Utility
 * 
 * Manages localStorage state for tracking completion of various content types:
 * - Reading: All "Check Your Understanding" questions answered
 * - Video: Page has been opened/viewed
 * - Flashcards: Last flashcard has been viewed
 * - Quiz: Quiz has been submitted (stores answers)
 */

const STORAGE_KEY_PREFIX = 'lesson_progress_';

/**
 * Get the storage key for a specific course and lesson
 */
function getStorageKey(courseId, lessonId) {
  return `${STORAGE_KEY_PREFIX}${courseId}_${lessonId}`;
}

/**
 * Get all progress data for a lesson
 */
export function getLessonProgress(courseId, lessonId) {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = getStorageKey(courseId, lessonId);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error reading lesson progress:', error);
    return null;
  }
}

/**
 * Save progress data for a lesson
 */
export function saveLessonProgress(courseId, lessonId, progressData) {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getStorageKey(courseId, lessonId);
    const existing = getLessonProgress(courseId, lessonId) || {};
    const updated = { ...existing, ...progressData, updatedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Error saving lesson progress:', error);
  }
}

// ============================================
// READING PROGRESS
// ============================================

/**
 * Get reading progress (check your understanding questions)
 */
export function getReadingProgress(courseId, lessonId) {
  const progress = getLessonProgress(courseId, lessonId);
  return progress?.reading || {
    questionsAnswered: {},
    totalQuestions: 0,
    completed: false
  };
}

/**
 * Mark a reading question as answered
 */
export function markReadingQuestionAnswered(courseId, lessonId, questionIndex, isCorrect) {
  const readingProgress = getReadingProgress(courseId, lessonId);
  const questionsAnswered = {
    ...readingProgress.questionsAnswered,
    [questionIndex]: { answered: true, isCorrect, answeredAt: Date.now() }
  };
  
  saveLessonProgress(courseId, lessonId, {
    reading: {
      ...readingProgress,
      questionsAnswered
    }
  });
  
  return questionsAnswered;
}

/**
 * Set total number of reading questions and check if completed
 */
export function setReadingTotalQuestions(courseId, lessonId, totalQuestions) {
  const readingProgress = getReadingProgress(courseId, lessonId);
  const answeredCount = Object.keys(readingProgress.questionsAnswered).length;
  const completed = totalQuestions > 0 ? answeredCount >= totalQuestions : false;
  
  saveLessonProgress(courseId, lessonId, {
    reading: {
      ...readingProgress,
      totalQuestions,
      completed,
      noQuestionsConfirmed: totalQuestions === 0 // Mark that we've confirmed zero questions
    }
  });
  
  return completed || totalQuestions === 0;
}

/**
 * Check if reading is completed (all questions answered)
 * Note: Returns false if we haven't determined the total questions yet
 */
export function isReadingCompleted(courseId, lessonId) {
  const readingProgress = getReadingProgress(courseId, lessonId);
  
  // If totalQuestions hasn't been set yet (null/undefined/0 from no data), 
  // we can't determine completion - return false
  if (!readingProgress.totalQuestions && readingProgress.totalQuestions !== 0) {
    return false;
  }
  
  // If we've explicitly confirmed there are 0 questions, mark as complete
  if (readingProgress.totalQuestions === 0 && readingProgress.noQuestionsConfirmed) {
    return true;
  }
  
  // Otherwise check if all questions are answered
  return readingProgress.completed;
}

// ============================================
// VIDEO PROGRESS
// ============================================

/**
 * Get video progress
 */
export function getVideoProgress(courseId, lessonId) {
  const progress = getLessonProgress(courseId, lessonId);
  return progress?.video || {
    viewed: false,
    viewedAt: null
  };
}

/**
 * Mark video as viewed
 */
export function markVideoViewed(courseId, lessonId) {
  saveLessonProgress(courseId, lessonId, {
    video: {
      viewed: true,
      viewedAt: Date.now()
    }
  });
}

/**
 * Check if video is completed (viewed)
 */
export function isVideoCompleted(courseId, lessonId) {
  const videoProgress = getVideoProgress(courseId, lessonId);
  return videoProgress.viewed;
}

// ============================================
// FLASHCARD PROGRESS
// ============================================

/**
 * Get flashcard progress
 */
export function getFlashcardProgress(courseId, lessonId) {
  const progress = getLessonProgress(courseId, lessonId);
  return progress?.flashcards || {
    lastViewedIndex: -1,
    totalCards: 0,
    completed: false
  };
}

/**
 * Update flashcard viewing progress
 */
export function updateFlashcardProgress(courseId, lessonId, currentIndex, totalCards) {
  const flashcardProgress = getFlashcardProgress(courseId, lessonId);
  const lastViewedIndex = Math.max(flashcardProgress.lastViewedIndex, currentIndex);
  const completed = totalCards > 0 && lastViewedIndex >= totalCards - 1;
  
  saveLessonProgress(courseId, lessonId, {
    flashcards: {
      lastViewedIndex,
      totalCards,
      completed,
      lastViewedAt: Date.now()
    }
  });
  
  return completed;
}

/**
 * Check if flashcards are completed (last card viewed)
 */
export function isFlashcardsCompleted(courseId, lessonId) {
  const flashcardProgress = getFlashcardProgress(courseId, lessonId);
  return flashcardProgress.completed;
}

// ============================================
// QUIZ PROGRESS
// ============================================

/**
 * Get quiz progress
 */
export function getQuizProgress(courseId, lessonId) {
  const progress = getLessonProgress(courseId, lessonId);
  return progress?.quiz || {
    submitted: false,
    submittedAt: null,
    answers: {},
    score: null,
    totalQuestions: 0
  };
}

/**
 * Save quiz submission with answers and score
 */
export function saveQuizSubmission(courseId, lessonId, answers, score, totalQuestions) {
  const correctCount = Object.values(answers).filter(a => a.isCorrect).length;
  
  saveLessonProgress(courseId, lessonId, {
    quiz: {
      submitted: true,
      submittedAt: Date.now(),
      answers,
      score: score ?? (totalQuestions > 0 ? correctCount / totalQuestions : 0),
      totalQuestions,
      correctCount
    }
  });
}

/**
 * Check if quiz is completed (submitted)
 */
export function isQuizCompleted(courseId, lessonId) {
  const quizProgress = getQuizProgress(courseId, lessonId);
  return quizProgress.submitted;
}

/**
 * Get quiz score (0-1)
 */
export function getQuizScore(courseId, lessonId) {
  const quizProgress = getQuizProgress(courseId, lessonId);
  return quizProgress.score;
}

/**
 * Get flagged questions for a quiz
 */
export function getFlaggedQuestions(courseId, lessonId) {
  const progress = getLessonProgress(courseId, lessonId);
  return progress?.flaggedQuestions || {};
}

/**
 * Save flagged questions for a quiz
 */
export function saveFlaggedQuestions(courseId, lessonId, flaggedQuestions) {
  saveLessonProgress(courseId, lessonId, {
    flaggedQuestions
  });
}

// ============================================
// OVERALL LESSON COMPLETION
// ============================================

/**
 * Content type identifiers
 */
export const CONTENT_TYPES = {
  READING: 'reading',
  VIDEO: 'video',
  FLASHCARDS: 'flashcards',
  QUIZ: 'mini_quiz'
};

/**
 * Check if a specific content type is completed
 */
export function isContentTypeCompleted(courseId, lessonId, contentType) {
  switch (contentType) {
    case CONTENT_TYPES.READING:
    case 'reading':
      return isReadingCompleted(courseId, lessonId);
    case CONTENT_TYPES.VIDEO:
    case 'video':
      return isVideoCompleted(courseId, lessonId);
    case CONTENT_TYPES.FLASHCARDS:
    case 'flashcards':
      return isFlashcardsCompleted(courseId, lessonId);
    case CONTENT_TYPES.QUIZ:
    case 'mini_quiz':
      return isQuizCompleted(courseId, lessonId);
    default:
      return false;
  }
}

/**
 * Get completion status for all content types of a lesson
 */
export function getLessonCompletionStatus(courseId, lessonId, availableContentTypes) {
  const status = {};
  let allCompleted = true;
  
  availableContentTypes.forEach(type => {
    const typeValue = typeof type === 'string' ? type : type.value;
    const completed = isContentTypeCompleted(courseId, lessonId, typeValue);
    status[typeValue] = completed;
    if (!completed) allCompleted = false;
  });
  
  return {
    byType: status,
    allCompleted,
    quizScore: getQuizScore(courseId, lessonId)
  };
}

/**
 * Determine mastery status based on quiz score
 * Returns 'mastered' if score >= 70%, otherwise 'needs_review'
 */
export function determineMasteryStatus(quizScore) {
  if (quizScore === null || quizScore === undefined) {
    return 'mastered'; // Default to mastered if no quiz
  }
  return quizScore >= 0.7 ? 'mastered' : 'needs_review';
}

/**
 * Clear all progress for a lesson
 */
export function clearLessonProgress(courseId, lessonId) {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getStorageKey(courseId, lessonId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing lesson progress:', error);
  }
}

/**
 * Get all progress for a course
 */
export function getCourseProgress(courseId) {
  if (typeof window === 'undefined') return {};
  
  try {
    const progress = {};
    const prefix = `${STORAGE_KEY_PREFIX}${courseId}_`;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const lessonId = key.replace(prefix, '');
        const data = localStorage.getItem(key);
        if (data) {
          progress[lessonId] = JSON.parse(data);
        }
      }
    }
    
    return progress;
  } catch (error) {
    console.error('Error reading course progress:', error);
    return {};
  }
}
