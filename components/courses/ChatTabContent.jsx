"use client";

import ChatBot from "@/components/chat/ChatBot";

export default function ChatTabContent({
  courseId,
  courseName,
  studyPlan,
  onClose,
  isActive = true
}) {
  return (
    <div className="w-full h-full">
      <ChatBot 
        isActive={isActive}
        pageContext={{
          courseId,
          courseName,
          studyPlan,
        }}
        mode="full"
        onClose={onClose}
      />
    </div>
  );
}
