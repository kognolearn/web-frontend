/**
 * Conversation Flow Configuration for Chat-Based Course Creation
 *
 * Each step defines what Kogno says and how the user responds.
 * The flow supports conditional steps, skipping, and dynamic content.
 */

export const CONVERSATION_FLOW = [
  // Step 1: Greeting & Course Name
  {
    id: 'greeting',
    kognoMessage: "Hey! I'm Kogno, and I'll help you set up your course. What's the name of your course?",
    inputType: 'text',
    field: 'courseTitle',
    placeholder: 'e.g., Introduction to Machine Learning',
    validation: (v) => v && v.trim().length > 0,
    validationMessage: 'Please enter a course name',
    skippable: false,
  },

  // Step 2: University/Institution
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

  // Step 5: Syllabus Intro
  {
    id: 'syllabus_intro',
    kognoMessage: "Now let's get your course materials. Do you have a syllabus or course outline you can share?",
    inputType: 'options',
    field: 'syllabusChoice',
    options: [
      { id: 'upload', label: 'Upload files', icon: 'upload', description: 'PDF, Word, PowerPoint, or images' },
      { id: 'paste', label: 'Paste text', icon: 'text', description: 'Copy and paste your syllabus' },
      { id: 'both', label: 'Both', icon: 'both', description: 'Upload files and paste text' },
      { id: 'skip', label: 'Skip for now', icon: 'skip', description: "I'll add materials later" },
    ],
    skippable: true,
  },

  // Step 5a: Syllabus Upload
  {
    id: 'syllabus_upload',
    kognoMessage: "Drop your syllabus files here or click to upload. I can read PDFs, Word docs, PowerPoints, and images.",
    inputType: 'file',
    field: 'syllabusFiles',
    condition: (state) => state.syllabusChoice === 'upload' || state.syllabusChoice === 'both',
    accept: '.pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp,.heic',
    skippable: true,
    skipLabel: 'Done uploading',
  },

  // Step 5b: Syllabus Text
  {
    id: 'syllabus_text',
    kognoMessage: "Paste any additional syllabus content or course objectives here:",
    inputType: 'textarea',
    field: 'syllabusText',
    condition: (state) => state.syllabusChoice === 'paste' || state.syllabusChoice === 'both',
    placeholder: 'Course objectives, weekly schedule, topics covered...',
    skippable: true,
    skipLabel: 'Skip',
  },

  // Step 6: Exam Intro
  {
    id: 'exam_intro',
    kognoMessage: "Here's where things get good. Do you have any practice exams, past tests, or info about what'll be on your exam?",
    inputType: 'options',
    field: 'examChoice',
    options: [
      { id: 'upload', label: 'Upload practice exams', icon: 'exam', description: 'Past tests or practice materials' },
      { id: 'describe', label: 'Describe exam format', icon: 'text', description: 'Tell me about the exam' },
      { id: 'both', label: 'Both', icon: 'both', description: 'Upload and describe' },
      { id: 'skip', label: "I don't have any", icon: 'skip', description: 'Skip exam materials' },
    ],
    skippable: true,
  },

  // Step 6a: Exam Upload
  {
    id: 'exam_upload',
    kognoMessage: "Upload your practice exams or past tests:",
    inputType: 'file',
    field: 'examFiles',
    condition: (state) => state.examChoice === 'upload' || state.examChoice === 'both',
    accept: '.pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp,.heic',
    skippable: true,
    skipLabel: 'Done uploading',
  },

  // Step 6b: Exam Notes
  {
    id: 'exam_notes',
    kognoMessage: "Tell me about the exam - topics covered, question types, chapters, anything that helps:",
    inputType: 'textarea',
    field: 'examNotes',
    condition: (state) => state.examChoice === 'describe' || state.examChoice === 'both',
    placeholder: 'e.g., Chapters 1-4, focus on probability, multiple choice and short answer...',
    skippable: true,
    skipLabel: 'Skip',
  },

  // Step 7: Generate Topics Prompt
  {
    id: 'generate_topics_prompt',
    kognoMessage: "Perfect! I've got everything I need. Ready for me to create your personalized topic list?",
    inputType: 'confirm',
    confirmLabel: 'Generate Topics',
    action: 'generateTopics',
    skippable: false,
  },

  // Step 8: Topics Loading (shown during generation)
  {
    id: 'topics_loading',
    kognoMessage: "Analyzing your materials and building your topic list...",
    inputType: 'loading',
    isTransient: true, // This step is auto-advanced when loading completes
  },

  // Step 9: Topics Generated with refinement options
  {
    id: 'topics_generated',
    kognoMessage: "Here's what I came up with! I found {topicCount} topics across {moduleCount} modules. Take a look and let me know what you think.",
    inputType: 'topics_with_refinement',
    showTopicEditor: true,
    field: 'topicModifyPrompt',
    placeholder: 'e.g., Add more calculus topics, remove the history section...',
    skippable: true,
    skipLabel: 'Topics look good!',
    action: 'modifyTopics',
    allowMultiple: true, // User can refine multiple times
  },

  // Step 11: Confidence Rating
  {
    id: 'confidence_intro',
    kognoMessage: "Almost there! Now tell me how familiar you are with each module. This helps me personalize your learning path.",
    inputType: 'confidence',
    showConfidenceEditor: true,
    skippable: false,
  },

  // Step 12: Final Confirmation
  {
    id: 'create_course',
    kognoMessage: "You're all set! Ready to create your personalized course for {courseTitle}?",
    inputType: 'confirm',
    confirmLabel: 'Create My Course',
    action: 'createCourse',
    skippable: false,
  },

  // Step 13: Creating (loading state)
  {
    id: 'creating',
    kognoMessage: "Creating your course now... This usually takes about 30 seconds.",
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
      return state.overviewTopics?.length || 0;
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
