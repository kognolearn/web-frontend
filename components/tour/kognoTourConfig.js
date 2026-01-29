/**
 * Kogno Tour Step Configuration
 *
 * @typedef {Object} KognoTourStep
 * @property {string} [id] - Optional stable step id
 * @property {string} [target] - CSS selector or data-tour attribute value to highlight
 * @property {string} [title] - Optional title for the step
 * @property {string} [content] - Main content/description for the step
 * @property {boolean} [interactive] - Whether user must interact with target to proceed
 * @property {boolean} [modal] - Whether to show as a centered modal-style step (no target highlight)
 * @property {boolean} [skippable] - Whether this step can be skipped (default: true for tour)
 * @property {boolean} [autoAdvance] - Auto-advance after interaction completes (default: true)
 * @property {boolean} [skipIfMissing] - Skip this step if its target is not present
 * @property {"cram"} [showIfStudyMode] - Only show when stored study mode matches
 * @property {Object} [kogno] - Kogno character options
 * @property {"neutral"|"happy"|"pointing"|"excited"|"thinking"|"waving"} [kogno.expression]
 * @property {"left"|"right"|"top"|"bottom"|"center"} [kogno.dock]
 * @property {number|string} [kogno.size]
 * @property {number} [kogno.offset]
 * @property {Object} [bubble] - Speech bubble options
 * @property {"top"|"bottom"|"left"|"right"} [bubble.placement]
 * @property {number} [bubble.maxWidth]
 */

export const courseCreationTour = [
  {
    id: "cc-welcome",
    modal: true,
    title: "Welcome to Kogno!",
    content: "Let's create your first course together. I'll guide you through each step to set up a personalized study plan.",
    interactive: false,
    skippable: false,
    kogno: { expression: "waving", dock: "center" },
  },
  {
    id: "cc-course-input",
    target: "chat-input",
    title: "Tell me about your course",
    content: "Type the course name and your college. For example: 'Physics 101 at Stanford' or 'Intro to Biology, Harvard'",
    interactive: true,
    skippable: false,
    kogno: { expression: "thinking" },
  },
  {
    id: "cc-study-mode",
    target: "study-mode",
    title: "Choose your study style",
    content: "Deep Study builds full understanding with detailed explanations and breadth. Cram Mode focuses on high-yield, exam-critical topics and tighter summaries. You can change this later.",
    interactive: true,
    skippable: false,
    kogno: { expression: "neutral" },
  },
  {
    id: "cc-cram-duration",
    target: "cram-duration",
    title: "Set your cram timeline",
    content: "Tell us how much time you have so we can prioritize what matters most.",
    interactive: true,
    skippable: false,
    skipIfMissing: true,
    showIfStudyMode: "cram",
    kogno: { expression: "pointing" },
  },
  {
    id: "cc-syllabus-choice",
    target: "syllabus-choice",
    title: "Add your syllabus",
    content: "Add syllabus info as text, URLs, or files (or skip). We use it to extract topics, dates, and learning objectives.",
    interactive: true,
    skippable: false,
    kogno: { expression: "neutral" },
  },
  {
    id: "cc-syllabus-done",
    target: "syllabus-done",
    title: "Upload your syllabus",
    content: "Paste text, add URLs, and/or attach files, then click Done to continue.",
    interactive: true,
    skippable: false,
    skipIfMissing: true,
    kogno: { expression: "pointing" },
  },
  {
    id: "cc-exam-choice",
    target: "exam-choice",
    title: "Exam materials",
    content: "Add exam info as text, URLs, or files (or skip). We use it to focus on what's most likely to be tested.",
    interactive: true,
    skippable: false,
    kogno: { expression: "neutral" },
  },
  {
    id: "cc-exam-done",
    target: "exam-done",
    title: "Upload exam materials",
    content: "Paste text, add URLs, and/or attach files, then click Done to continue.",
    interactive: true,
    skippable: false,
    skipIfMissing: true,
    kogno: { expression: "pointing" },
  },
  {
    id: "cc-generate-topics",
    target: "generate-topics",
    title: "Generate your topic list",
    content: "Click here and I'll build your personalized topic list from your materials.",
    interactive: true,
    skippable: false,
    kogno: { expression: "excited" },
  },
  {
    id: "cc-topics-review",
    target: "topics-review",
    title: "Review your topics",
    content: "Skim the topics and click \"Topics look good!\" when you're ready to move on.",
    interactive: true,
    skippable: false,
    kogno: { expression: "neutral" },
  },
  {
    id: "cc-confidence",
    target: "confidence-continue",
    title: "Set your familiarity",
    content: "Mark how confident you are in each module, then continue.",
    interactive: true,
    skippable: false,
    kogno: { expression: "thinking" },
  },
  {
    id: "cc-create",
    target: "create-button",
    title: "Generate your course!",
    content: "Click here to start generating your personalized study materials. This may take a minute or two.",
    interactive: true,
    skippable: false,
    kogno: { expression: "excited" },
  },
];

export const courseFeaturesTour = [
  {
    id: "cf-intro",
    modal: true,
    title: "Your first module is ready!",
    content: "Great news! Your study materials are being generated. Let me show you around while the rest loads.",
    interactive: false,
    skippable: false,
    kogno: { expression: "happy", dock: "center" },
  },
  {
    id: "cf-first-lesson",
    target: "first-lesson",
    title: "Start your first lesson",
    content: "You can begin learning immediately while the rest of the course generates. Click the first lesson to dive in.",
    interactive: true,
    skippable: false,
    kogno: { expression: "pointing" },
  },
  {
    id: "cf-cheatsheet",
    target: "cheatsheet-tab",
    title: "Quick Reference Cheatsheet",
    content: "Access a condensed summary of key concepts, formulas, and definitions. Perfect for quick review before exams.",
    interactive: true,
    skippable: false,
    kogno: { expression: "neutral" },
  },
  {
    id: "cf-practice-exam",
    target: "practice-exam",
    title: "Practice Exams",
    content: "Test yourself with AI-generated practice exams that simulate real test conditions. Track your progress over time.",
    interactive: true,
    skippable: false,
    kogno: { expression: "thinking" },
  },
  {
    id: "cf-community",
    target: "community-tab",
    title: "Study Community",
    content: "Connect with other students studying the same material. Ask questions, share notes, and help each other succeed.",
    interactive: true,
    skippable: false,
    kogno: { expression: "happy" },
  },
  {
    id: "cf-messages",
    target: "messages-tab",
    title: "Direct Messages",
    content: "Chat privately with study partners you meet in the community. Form study groups and collaborate.",
    interactive: true,
    skippable: false,
    kogno: { expression: "neutral" },
  },
  {
    id: "cf-chatbot",
    target: "chat-fab",
    title: "AI Tutor",
    content: "Your personal AI tutor is always here to help. Ask questions about the material, get explanations, or work through problems together.",
    interactive: true,
    skippable: false,
    kogno: { expression: "pointing" },
  },
  {
    id: "cf-complete",
    modal: true,
    title: "You're all set!",
    content: "You now know the essentials. Start with your first lesson and don't hesitate to explore. Happy studying!",
    interactive: false,
    skippable: false,
    kogno: { expression: "waving", dock: "center" },
  },
];

export const kognoTourConfigs = {
  "course-creation": courseCreationTour,
  "course-features": courseFeaturesTour,
};

export const tourConfigs = kognoTourConfigs;

export default kognoTourConfigs;
