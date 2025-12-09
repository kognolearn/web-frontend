"use client";

import ChatBot from "@/components/chat/ChatBot";

export default function ChatTabContent({
  courseId,
  courseName,
  studyPlan,
  onClose,
  isActive = true,
  sharedChatState,
  onSharedChatStateChange,
  initialChatId,
  onActiveChatIdChange,
}) {
  return (
    <div className="w-full h-full">
      <ChatBot
        mode="full"
        isActive={isActive}
        pageContext={{
          courseId,
          courseName,
          studyPlan,
        }}
        initialChats={sharedChatState?.chats}
        initialChatId={initialChatId || sharedChatState?.currentChatId}
        syncedState={sharedChatState}
        onStateChange={onSharedChatStateChange}
        onActiveChatChange={onActiveChatIdChange}
        onClose={onClose}
      />
    </div>
  );
}
