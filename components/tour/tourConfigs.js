/**
 * Tour Step Configuration
 *
 * @typedef {Object} TourStep
 * @property {string} target - CSS selector or data-tour attribute value to highlight
 * @property {string} title - Optional title for the step
 * @property {string} content - Main content/description for the step
 * @property {boolean} interactive - Whether user must interact with target to proceed
 * @property {boolean} modal - Whether to show as a centered modal (no target highlight)
 * @property {'top'|'bottom'|'left'|'right'} position - Preferred tooltip position
 * @property {boolean} skippable - Whether this step can be skipped (default: true for tour)
 * @property {boolean} autoAdvance - Auto-advance after interaction completes (default: true for interactive steps)
 * @property {boolean} skipIfMissing - Skip this step if its target is not present (useful for conditional UI)
 * @property {"cram"} showIfStudyMode - Only show when the stored study mode matches
 */

/**
 * Phase 1: Course Creation Tour
 * Guides new users through creating their first course
 */
export const courseCreationTour = [
  {
    modal: true,
    title: "Welcome to Kogno!",
    content: "Let's create your first course together. I'll guide you through each step to set up a personalized study plan.",
    interactive: false,
    skippable: false,
  },
  {
    target: "chat-input",
    title: "Tell me about your course",
    content: "Type the course name and your college. For example: 'Physics 101 at Stanford' or 'Intro to Biology, Harvard'",
    interactive: true,
    position: "top",
    skippable: false,
  },
  {
    target: "study-mode",
    title: "Choose your study style",
    content: "Deep Study builds full understanding with detailed explanations and breadth. Cram Mode focuses on high-yield, exam-critical topics and tighter summaries. You can change this later.",
    interactive: true,
    position: "top",
    skippable: false,
  },
  {
    target: "cram-duration",
    title: "Set your cram timeline",
    content: "Tell us how much time you have so we can prioritize what matters most.",
    interactive: true,
    position: "top",
    skippable: false,
    skipIfMissing: true,
    showIfStudyMode: "cram",
  },
  {
    target: "syllabus-choice",
    title: "Add your syllabus",
    content: "Add syllabus info as text, URLs, or files (or skip). We use it to extract topics, dates, and learning objectives.",
    interactive: true,
    position: "right",
    skippable: false,
  },
  {
    target: "syllabus-done",
    title: "Upload your syllabus",
    content: "Paste text, add URLs, and/or attach files, then click Done to continue.",
    interactive: true,
    position: "top",
    skippable: false,
    skipIfMissing: true,
  },
  {
    target: "exam-choice",
    title: "Exam materials",
    content: "Add exam info as text, URLs, or files (or skip). We use it to focus on what's most likely to be tested.",
    interactive: true,
    position: "right",
    skippable: false,
  },
  {
    target: "exam-done",
    title: "Upload exam materials",
    content: "Paste text, add URLs, and/or attach files, then click Done to continue.",
    interactive: true,
    position: "top",
    skippable: false,
    skipIfMissing: true,
  },
  {
    target: "generate-topics",
    title: "Generate your topic list",
    content: "Click here and I'll build your personalized topic list from your materials.",
    interactive: true,
    position: "top",
    skippable: false,
  },
  {
    target: "topics-review",
    title: "Review your topics",
    content: "Skim the topics and click “Topics look good!” when you're ready to move on.",
    interactive: true,
    position: "top",
    skippable: false,
  },
  {
    target: "confidence-continue",
    title: "Set your familiarity",
    content: "Mark how confident you are in each module, then continue.",
    interactive: true,
    position: "top",
    skippable: false,
  },
  {
    target: "create-button",
    title: "Generate your course!",
    content: "Click here to start generating your personalized study materials. This may take a minute or two.",
    interactive: true,
    position: "top",
    skippable: false,
  },
];

/**
 * Phase 2: Course Features Tour
 * Shows users the key features of their generated course
 */
export const courseFeaturesTour = [
  {
    modal: true,
    title: "Your first module is ready!",
    content: "Great news! Your study materials are being generated. Let me show you around while the rest loads.",
    interactive: false,
    skippable: false,
  },
  {
    target: "first-lesson",
    title: "Start your first lesson",
    content: "You can begin learning immediately while the rest of the course generates. Click the first lesson to dive in.",
    interactive: true,
    position: "right",
    skippable: false,
  },
  {
    target: "cheatsheet-tab",
    title: "Quick Reference Cheatsheet",
    content: "Access a condensed summary of key concepts, formulas, and definitions. Perfect for quick review before exams.",
    interactive: true,
    position: "bottom",
    skippable: false,
  },
  {
    target: "practice-exam",
    title: "Practice Exams",
    content: "Test yourself with AI-generated practice exams that simulate real test conditions. Track your progress over time.",
    interactive: true,
    position: "bottom",
    skippable: false,
  },
  {
    target: "community-tab",
    title: "Study Community",
    content: "Connect with other students studying the same material. Ask questions, share notes, and help each other succeed.",
    interactive: true,
    position: "bottom",
    skippable: false,
  },
  {
    target: "messages-tab",
    title: "Direct Messages",
    content: "Chat privately with study partners you meet in the community. Form study groups and collaborate.",
    interactive: true,
    position: "bottom",
    skippable: false,
  },
  {
    target: "chat-fab",
    title: "AI Tutor",
    content: "Your personal AI tutor is always here to help. Ask questions about the material, get explanations, or work through problems together.",
    interactive: true,
    position: "left",
    skippable: false,
  },
  {
    modal: true,
    title: "You're all set!",
    content: "You now know the essentials. Start with your first lesson and don't hesitate to explore. Happy studying!",
    interactive: false,
    skippable: false,
  },
];

/**
 * All tour configurations
 */
export const tourConfigs = {
  "course-creation": courseCreationTour,
  "course-features": courseFeaturesTour,
};

export default tourConfigs;
