const COURSE_CHAT_RETRY_FIRST =
  "Hmm, I couldn't quite catch that! Could you tell me again - what's the course name (like 'Physics 101' or 'Intro to Biology') and which college/university is it at?";
const COURSE_CHAT_RETRY_SECOND =
  "I'm still having trouble understanding. Please type the course name and college separately, like: 'Physics 101' and 'Stanford University'";

const TOPICS_LOADING_MESSAGE = 'Analyzing your materials and building your topic list...';
const TOPICS_GENERATED_MESSAGE =
  "Here's what I came up with! I found {topicCount} topics across {moduleCount} modules. Take a look and let me know what you think.";

export function getCourseChatGreeting(savedCollege) {
  if (typeof savedCollege === 'string' && savedCollege.trim()) {
    return `Hey! What course at ${savedCollege} do you wanna study?`;
  }
  return 'Hey! What course do you wanna study and which college is it at?';
}

export function getCourseChatCollegeFollowup(courseName) {
  return `Got it, ${courseName}! Which college or university is this course at?`;
}

export function getCourseChatRetryMessage(attempt) {
  if (attempt <= 1) {
    return COURSE_CHAT_RETRY_FIRST;
  }
  return COURSE_CHAT_RETRY_SECOND;
}

export function getTopicsLoadingMessage() {
  return TOPICS_LOADING_MESSAGE;
}

export function getTopicsGeneratedMessage() {
  return TOPICS_GENERATED_MESSAGE;
}
