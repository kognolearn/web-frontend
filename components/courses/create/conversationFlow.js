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
    kognoMessage: (state) => {
      if (state.savedCollege && state.savedCollege.trim()) {
        return `Hey! What course at ${state.savedCollege} do you wanna study?`;
      }
      return "Hey! What course do you wanna study and which college is it at?";
    },
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
    kognoMessage: "Now let's get your course materials. The more detail you share - like course calendars, order of topics, or exam info - the better I can tailor this course to your current quarter's class.",
    inputType: 'options',
    field: 'syllabusChoice',
    options: [
      { id: 'upload', label: 'Upload content', icon: 'upload', description: 'Paste text and/or upload files (PDFs, docs, images)', recommended: true },
      { id: 'skip', label: 'Skip', icon: 'skip', description: "I'll add materials later" },
    ],
    skippable: true,
    tourTarget: 'syllabus-upload', // data-tour attribute for tour highlighting
  },

  // Step 5a: Syllabus Content (combined text + files)
  {
    id: 'syllabus_content',
    kognoMessage: "Share your syllabus content below. You can paste text and/or attach files.",
    inputType: 'content_with_attachments',
    field: 'syllabusContent',
    textField: 'syllabusText',
    filesField: 'syllabusFiles',
    condition: (state) => state.syllabusChoice === 'upload',
    accept: '.pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp,.heic',
    placeholder: 'Paste your syllabus, course outline, or any relevant text here...',
    skippable: true,
    skipLabel: 'Done',
  },

  // Step 6: Exam Intro
  {
    id: 'exam_intro',
    kognoMessage: "Here's where things get good. Do you have any practice exams, past tests, or info about what'll be on your exam?",
    inputType: 'options',
    field: 'examChoice',
    options: [
      { id: 'upload', label: 'Upload content', icon: 'exam', description: 'Paste text and/or upload files (past tests, study guides)', recommended: true },
      { id: 'skip', label: 'Skip', icon: 'skip', description: "I don't have any exam materials" },
    ],
    skippable: true,
    tourTarget: 'exam-input', // data-tour attribute for tour highlighting
  },

  // Step 6a: Exam Content (combined text + files)
  {
    id: 'exam_content',
    kognoMessage: "Share your exam materials below. You can paste text and/or attach files.",
    inputType: 'content_with_attachments',
    field: 'examContent',
    textField: 'examNotes',
    filesField: 'examFiles',
    condition: (state) => state.examChoice === 'upload',
    accept: '.pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp,.heic',
    placeholder: 'Paste exam info, topics covered, question types, or any relevant details...',
    skippable: true,
    skipLabel: 'Done',
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
