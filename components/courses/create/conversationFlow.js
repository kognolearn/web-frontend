import {
  getCourseChatGreeting,
  getTopicsGeneratedMessage,
  getTopicsLoadingMessage,
} from './courseChatMessages';

/**
 * Conversation Flow Configuration for Chat-Based Course Creation
 *
 * Each step defines what Kogno says and how the user responds.
 * The flow supports conditional steps, skipping, and dynamic content.
 */

export const CONVERSATION_FLOW = [
  // Step 1: Chat-based Course & College Input (Onboarding Tour)
  // Uses LLM to parse free-form user input to extract course name and college
  {
    id: 'course_chat',
    // Dynamic greeting based on saved college
    kognoMessage: (state) => getCourseChatGreeting(state.savedCollege),
    inputType: 'course_chat',
    field: 'courseChatInput',
    placeholder: "e.g., Physics 101 at Stanford",
    validation: (v, state) => {
      // Validation happens via LLM parsing
      return state.courseTitle && state.courseTitle.trim().length > 0;
    },
    validationMessage: 'Please tell me the course name and college',
    skippable: false,
    // Custom handler for this step - uses LLM to parse input
    parseHandler: 'courseChatParser',
    tourTarget: 'chat-input', // data-tour attribute for tour highlighting
  },

  // Step 1 (Legacy): Greeting & Course Name
  // Only shown if not using chat flow (fallback)
  {
    id: 'greeting',
    kognoMessage: "Hey! I'm Kogno, and I'll help you set up your course. What's the name of your course?",
    inputType: 'text',
    field: 'courseTitle',
    placeholder: 'e.g., Introduction to Machine Learning',
    validation: (v) => v && v.trim().length > 0,
    validationMessage: 'Please enter a course name',
    skippable: false,
    condition: (state) => state.useLegacyFlow === true,
  },

  // Step 2 (Legacy): University/Institution
  // Only shown if not using chat flow (fallback)
  {
    id: 'university',
    // Dynamic message based on whether user has a saved school
    kognoMessage: (state) => {
      if (state.collegeName && state.collegeName.trim()) {
        return `At ${state.collegeName}, right?`;
      }
      return "Great! And where are you taking {courseTitle}?";
    },
    inputType: 'text_confirm',
    field: 'collegeName',
    placeholder: 'e.g., MIT, Stanford, UCLA',
    confirmPlaceholder: 'Type to change or press Enter to confirm',
    validation: (v) => v && v.trim().length > 0,
    validationMessage: 'Please enter your institution name',
    skippable: false,
    // Use collegeName from state as default value
    getDefaultValue: (state) => state.collegeName || '',
    condition: (state) => state.useLegacyFlow === true,
  },

  // Step 3: Study Mode
  {
    id: 'study_mode',
    kognoMessage: "How do you want to study this course?",
    inputType: 'options',
    field: 'studyMode',
    options: [
      {
        id: 'deep',
        label: 'Deep Study',
        icon: 'book',
        description: 'Thorough coverage with detailed explanations and more practice',
      },
      {
        id: 'cram',
        label: 'Cram Mode',
        icon: 'lightning',
        description: 'High-yield, exam-focused content for limited time',
      },
    ],
    skippable: false,
    tourTarget: 'study-mode',
  },

  // Step 4: Duration (Cram only)
  {
    id: 'duration',
    kognoMessage: "How much time do you have before your exam?",
    inputType: 'duration',
    field: 'studyDuration',
    condition: (state) => state.studyMode === 'cram',
    skippable: false,
  },

  // ============================================
  // DEEP STUDY MODE STEPS
  // ============================================

  // Syllabus content - DEEP STUDY ONLY
  {
    id: 'syllabus_content',
    kognoMessage: "Share any course materials you have - things like course calendars, syllabi, outlines, or topic lists work best. You can upload PDFs, paste URLs, or just type in raw text.",
    inputType: 'content_with_attachments',
    field: 'syllabusContent',
    textField: 'syllabusText',
    filesField: 'syllabusFiles',
    condition: (state) => state.studyMode === 'deep',
    accept: '.pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp,.heic',
    placeholder: 'Paste your syllabus, course outline, topic list, or any relevant details...',
    skippable: true,
    skipLabel: 'Skip for now',
    tourTarget: 'syllabus-content',
  },

  // Exam content - DEEP STUDY ONLY
  {
    id: 'exam_content',
    kognoMessage: "Got any practice exams, past tests, or info about what you'll be tested on? Upload them here and I'll make sure to focus on what matters most.",
    inputType: 'content_with_attachments',
    field: 'examContent',
    textField: 'examNotes',
    filesField: 'examFiles',
    condition: (state) => state.studyMode === 'deep',
    accept: '.pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp,.heic',
    placeholder: 'Paste exam info, topics covered, question types, or upload past exams...',
    skippable: true,
    skipLabel: 'Skip for now',
    tourTarget: 'exam-content',
  },

  // ============================================
  // CRAM MODE STEPS
  // ============================================

  // Practice exams - CRAM MODE ONLY
  {
    id: 'cram_practice_exams',
    kognoMessage: "Let's maximize your exam score. Upload any practice exams, sample questions, problem sets, or past tests you have. These are gold for cram mode - I'll focus on exactly what you need to know.",
    inputType: 'content_with_attachments',
    field: 'cramPracticeExams',
    textField: 'examNotes',
    filesField: 'examFiles',
    condition: (state) => state.studyMode === 'cram',
    accept: '.pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp,.heic',
    placeholder: 'Upload practice exams, sample questions, problem sets, or paste exam content...',
    skippable: true,
    skipLabel: 'Skip for now',
    tourTarget: 'cram-exams',
  },

  // Exam info - CRAM MODE ONLY
  {
    id: 'cram_exam_info',
    kognoMessage: "Any other exam details? Topics your professor said will be on the test, learning objectives, or a course calendar showing what's covered? This helps me laser-focus on what matters for your exam.",
    inputType: 'content_with_attachments',
    field: 'cramExamInfo',
    textField: 'syllabusText',
    filesField: 'syllabusFiles',
    condition: (state) => state.studyMode === 'cram',
    accept: '.pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp,.heic',
    placeholder: 'Topics for the exam, professor objectives, course calendar up to exam date...',
    skippable: true,
    skipLabel: 'Skip for now',
    tourTarget: 'cram-info',
  },

  // ============================================
  // LEGACY TOPIC FLOW (when useUnifiedPlanner is false)
  // ============================================

  // Step 7: Generate Topics Prompt (Legacy)
  {
    id: 'generate_topics_prompt',
    kognoMessage: "Perfect! I've got everything I need. Ready for me to create your personalized topic list?",
    inputType: 'confirm',
    confirmLabel: 'Generate Topics',
    action: 'generateTopics',
    skippable: false,
    tourTarget: 'generate-topics',
    condition: (state) => !state.useUnifiedPlanner,
  },

  // Step 8: Topics Loading (Legacy)
  {
    id: 'topics_loading',
    kognoMessage: getTopicsLoadingMessage(),
    inputType: 'loading',
    isTransient: true,
    condition: (state) => !state.useUnifiedPlanner,
  },

  // Step 9: Topics Generated with refinement options (Legacy)
  {
    id: 'topics_generated',
    kognoMessage: getTopicsGeneratedMessage(),
    inputType: 'topics_with_refinement',
    showTopicEditor: true,
    field: 'topicModifyPrompt',
    placeholder: 'e.g., Add more calculus topics, remove the history section...',
    skippable: true,
    skipLabel: 'Topics look good!',
    action: 'modifyTopics',
    allowMultiple: true,
    condition: (state) => !state.useUnifiedPlanner,
  },

  // Step 11: Confidence Rating (Legacy)
  {
    id: 'confidence_intro',
    kognoMessage: "Almost there! Now tell me how familiar you are with each module. This helps me personalize your learning path.",
    inputType: 'confidence',
    showConfidenceEditor: true,
    skippable: false,
    condition: (state) => !state.useUnifiedPlanner,
  },

  // ============================================
  // UNIFIED PLAN FLOW (when useUnifiedPlanner is true)
  // ============================================

  // Generate Unified Plan Prompt
  {
    id: 'generate_plan_prompt',
    kognoMessage: "Perfect! I've got everything I need. Ready for me to create your personalized course plan?",
    inputType: 'confirm',
    confirmLabel: 'Generate Course Plan',
    action: 'generateUnifiedPlan',
    skippable: false,
    tourTarget: 'generate-plan',
    condition: (state) => state.useUnifiedPlanner === true,
  },

  // Plan Loading
  {
    id: 'plan_loading',
    kognoMessage: "Creating your course plan... This combines topic analysis and lesson structure in one step.",
    inputType: 'loading',
    isTransient: true,
    condition: (state) => state.useUnifiedPlanner === true,
  },

  // Plan Generated - Shows plan summary with lessons AND confidence editor together
  {
    id: 'plan_generated',
    kognoMessage: (state) => {
      const moduleCount = state.planSummary?.module_count || 0;
      const lessonCount = state.planSummary?.lesson_count || 0;
      const totalMinutes = state.planSummary?.total_minutes || 0;
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      return `Here's your course plan! ${moduleCount} modules, ${lessonCount} lessons, ~${timeStr} total. Review the plan and rate your confidence for each module.`;
    },
    inputType: 'plan_with_confidence',
    showPlanSummary: true,
    showConfidenceEditor: true,
    field: 'planModifyPrompt',
    placeholder: 'e.g., Add more practice problems, focus more on Chapter 3...',
    skippable: true,
    skipLabel: 'Plan looks good!',
    action: 'adjustConfidence',
    condition: (state) => state.useUnifiedPlanner === true,
  },

  // Step 12: Final Confirmation
  {
    id: 'create_course',
    kognoMessage: "You're all set! Ready to create your personalized course for {courseTitle}?",
    inputType: 'confirm',
    confirmLabel: 'Create My Course',
    action: 'createCourse',
    skippable: false,
    tourTarget: 'create-button', // data-tour attribute for tour highlighting
  },

  // Step 13: Creating (loading state)
  {
    id: 'creating',
    kognoMessage: "Creating your course now... You can start studying in a couple minutes.",
    inputType: 'loading',
    showProgress: true,
  },

  // Step 14: Complete
  {
    id: 'complete',
    kognoMessage: "Your course is ready! Redirecting you to the dashboard...",
    inputType: 'complete',
    action: 'redirect',
  },
];

/**
 * Get the next applicable step based on current state
 * @param {number} currentIndex - Current step index
 * @param {object} state - Current conversation state
 * @returns {object|null} - Next step config or null if done
 */
export function getNextStep(currentIndex, state) {
  for (let i = currentIndex + 1; i < CONVERSATION_FLOW.length; i++) {
    const step = CONVERSATION_FLOW[i];
    if (!step.condition || step.condition(state)) {
      return { ...step, index: i };
    }
  }
  return null;
}

/**
 * Get step by ID
 * @param {string} stepId - Step ID
 * @returns {object|null} - Step config or null
 */
export function getStepById(stepId) {
  const index = CONVERSATION_FLOW.findIndex((s) => s.id === stepId);
  if (index === -1) return null;
  return { ...CONVERSATION_FLOW[index], index };
}

/**
 * Interpolate template strings in message
 * @param {string|Function} message - Message with {variable} placeholders or a function that returns message
 * @param {object} state - State object with values
 * @returns {string} - Interpolated message
 */
export function interpolateMessage(message, state) {
  if (!message) return '';

  // Support function-based messages for dynamic content
  const messageStr = typeof message === 'function' ? message(state) : message;
  if (!messageStr) return '';

  return messageStr.replace(/\{(\w+)\}/g, (match, key) => {
    if (key === 'topicCount') {
      return state.overviewTopics?.reduce((sum, m) => sum + (m.subtopics?.length || 0), 0) || 0;
    }
    if (key === 'moduleCount') {
      // Support both legacy topics and unified plan
      if (state.planSummary?.module_count) {
        return state.planSummary.module_count;
      }
      return state.overviewTopics?.length || 0;
    }
    if (key === 'lessonCount') {
      return state.planSummary?.lesson_count || 0;
    }
    if (key === 'totalTime') {
      const mins = state.planSummary?.total_minutes || 0;
      const hours = Math.floor(mins / 60);
      const minutes = mins % 60;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    }
    return state[key] || match;
  });
}

/**
 * Calculate progress percentage
 * @param {number} currentIndex - Current step index
 * @returns {number} - Progress percentage (0-100)
 */
export function calculateProgress(currentIndex) {
  // Exclude loading and transient steps from progress calculation
  const substantiveSteps = CONVERSATION_FLOW.filter(
    (s) => !s.isTransient && s.inputType !== 'loading' && s.inputType !== 'complete'
  );
  const currentSubstantive = CONVERSATION_FLOW.slice(0, currentIndex + 1).filter(
    (s) => !s.isTransient && s.inputType !== 'loading' && s.inputType !== 'complete'
  ).length;
  return Math.round((currentSubstantive / substantiveSteps.length) * 100);
}
