"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useCourseCreationFlow } from "@/hooks/useCourseCreationFlow";
import { useCourseConversation } from "@/hooks/useCourseConversation";
import KognoMessage from "./KognoMessage";
import UserResponseBubble from "./UserResponseBubble";
import CourseInputRenderer from "./CourseInputRenderer";
import TopicEditorChat from "./TopicEditorChat";
import ConfidenceEditorChat from "./ConfidenceEditorChat";
import { calculateProgress } from "./conversationFlow";

/**
 * Progress bar component
 */
function ProgressBar({ progress }) {
  return (
    <div className="h-1 bg-[var(--surface-muted)] overflow-hidden">
      <motion.div
        className="h-full bg-[var(--primary)]"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
}

/**
 * Header with back button and progress
 */
function ChatHeader({ progress, onBack }) {
  return (
    <div className="sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)]">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--muted-foreground)]">{progress}% complete</span>
        </div>
      </div>
      <ProgressBar progress={progress} />
    </div>
  );
}

/**
 * Main conversational course creation UI
 */
export default function ConversationalCourseUI({ onComplete, onBack, onSwitchToWizard }) {
  const flowState = useCourseCreationFlow({ onComplete });
  const conversation = useCourseConversation(flowState);
  const chatContainerRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation.messages, conversation.isKognoTyping]);

  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };

  // Render topic editor for current step
  const renderTopicEditor = () => {
    if (!conversation.currentStep?.showTopicEditor) return null;

    return (
      <TopicEditorChat
        overviewTopics={flowState.overviewTopics}
        deletedSubtopics={flowState.deletedSubtopics}
        onDeleteSubtopic={flowState.handleDeleteSubtopic}
        onDeleteAllSubtopics={flowState.handleDeleteAllSubtopics}
        onRestoreSubtopic={flowState.handleRestoreSubtopic}
        onRestoreAll={flowState.handleRestoreAll}
        onAddTopic={flowState.handleAddTopic}
        onRegenerate={flowState.handleGenerateTopics}
        isLoading={flowState.isTopicsLoading}
      />
    );
  };

  // Render confidence editor for current step
  const renderConfidenceEditor = () => {
    if (!conversation.currentStep?.showConfidenceEditor) return null;

    return (
      <ConfidenceEditorChat
        overviewTopics={flowState.overviewTopics}
        moduleConfidenceState={flowState.moduleConfidenceState}
        onModuleModeChange={flowState.handleModuleModeChange}
      />
    );
  };

  // Render the input area based on current step
  const renderInputArea = () => {
    if (!conversation.currentStep) return null;
    if (conversation.isKognoTyping) return null;
    if (conversation.pendingAction) return null;

    const { inputType, placeholder, confirmPlaceholder, accept, skippable, skipLabel, confirmLabel, getDefaultValue } = conversation.currentStep;

    // Options are rendered in KognoMessage
    if (inputType === "options") {
      return null;
    }

    // Confirm is rendered in KognoMessage
    if (inputType === "confirm") {
      return null;
    }

    // Loading states don't have input
    if (inputType === "loading" || inputType === "complete") {
      return null;
    }

    // Topics with refinement: show text input + "Topics look good!" + regenerate
    if (inputType === "topics_with_refinement") {
      return (
        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-1)] space-y-3">
          {/* Modification prompt input */}
          <CourseInputRenderer
            inputType="text"
            placeholder={placeholder || "Tell me what to change..."}
            onSubmit={(value) => conversation.handleSubmitResponse(value, value)}
            disabled={flowState.isTopicsLoading || flowState.courseGenerating}
          />

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={conversation.handleSkip}
              disabled={flowState.isTopicsLoading}
              className="flex-1 py-3 bg-[var(--primary)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {skipLabel || "Topics look good!"}
            </button>
            <button
              type="button"
              onClick={flowState.handleGenerateTopics}
              disabled={flowState.isTopicsLoading}
              className="py-3 px-4 border border-[var(--border)] rounded-xl text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] disabled:opacity-40 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Regenerate
            </button>
          </div>
        </div>
      );
    }

    // Confidence has its own editor
    if (inputType === "confidence") {
      return (
        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-1)]">
          <button
            type="button"
            onClick={conversation.handleConfirm}
            className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Continue
          </button>
        </div>
      );
    }

    // Combined content with attachments (text + files)
    if (inputType === "content_with_attachments") {
      return (
        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-1)]">
          <CourseInputRenderer
            inputType="content_with_attachments"
            placeholder={placeholder}
            disabled={flowState.isTopicsLoading || flowState.courseGenerating}
            contentText={conversation.contentText}
            onContentTextChange={conversation.handleContentTextChange}
            files={conversation.currentFiles}
            onFileChange={conversation.handleFileUpload}
            onFileRemove={conversation.handleFileRemove}
            onContentSubmit={() => {
              conversation.handleContentSubmit(conversation.contentText, conversation.currentFiles);
            }}
            accept={accept}
          />
          {/* Skip button */}
          {skippable && (
            <button
              type="button"
              onClick={conversation.handleSkip}
              className="w-full mt-2 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              {skipLabel || "Skip"}
            </button>
          )}
        </div>
      );
    }

    // Format display text based on input type
    const handleInputSubmit = (value) => {
      let displayText = value;
      if (inputType === "duration" && typeof value === "object") {
        const parts = [];
        if (value.hours > 0) parts.push(`${value.hours} hour${value.hours !== 1 ? "s" : ""}`);
        if (value.minutes > 0) parts.push(`${value.minutes} minute${value.minutes !== 1 ? "s" : ""}`);
        displayText = parts.join(" ") || "0 minutes";
      }
      conversation.handleSubmitResponse(value, displayText);
    };

    // Compute default value from step config if available
    const defaultValue = getDefaultValue ? getDefaultValue(conversation.state) : "";

    return (
      <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-1)]">
        <CourseInputRenderer
          inputType={inputType}
          placeholder={placeholder}
          confirmPlaceholder={confirmPlaceholder}
          defaultValue={defaultValue}
          onSubmit={handleInputSubmit}
          disabled={flowState.isTopicsLoading || flowState.courseGenerating}
          files={conversation.currentFiles}
          onFileChange={conversation.handleFileUpload}
          onFileRemove={conversation.handleFileRemove}
          accept={accept}
          hours={flowState.studyHours}
          minutes={flowState.studyMinutes}
          onHoursChange={flowState.setStudyHours}
          onMinutesChange={flowState.setStudyMinutes}
        />

        {/* Skip button for file uploads */}
        {inputType === "file" && skippable && (
          <button
            type="button"
            onClick={conversation.handleSkip}
            className="w-full mt-2 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            {skipLabel || "Skip"}
          </button>
        )}

        {/* Skip button for text inputs */}
        {(inputType === "text" || inputType === "textarea") && skippable && (
          <button
            type="button"
            onClick={conversation.handleSkip}
            className="w-full mt-2 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            {skipLabel || "Skip"}
          </button>
        )}
      </div>
    );
  };

  // Auth loading state
  if (flowState.authStatus === "checking") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 border-2 border-[var(--border)] rounded-full" />
            <div className="absolute inset-0 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-sm text-[var(--muted-foreground)]">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--background)]">
      {/* Header */}
      <ChatHeader progress={conversation.progress} onBack={handleBack} />

      {/* Switch to wizard option */}
      {onSwitchToWizard && (
        <div className="px-4 py-2 bg-[var(--surface-1)] border-b border-[var(--border)]">
          <button
            type="button"
            onClick={onSwitchToWizard}
            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            Prefer the classic form? Switch to wizard mode
          </button>
        </div>
      )}

      {/* Messages area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        {conversation.messages.map((message) => {
          if (message.role === "assistant") {
            const isCurrentlyLoading =
              message.inputType === "loading" ||
              (message.stepId === conversation.currentStep?.id && conversation.pendingAction);
            // Show animated reasoning only while topics are being generated
            const showReasoning =
              message.stepId === "topics_loading" && !flowState.overviewTopics?.length;
            // Show completed reasoning once topics exist
            const reasoningCompleted =
              message.stepId === "topics_loading" && flowState.overviewTopics?.length > 0;

            return (
              <KognoMessage
                key={message.id}
                content={message.content}
                isTyping={false}
                isLoading={isCurrentlyLoading}
                showReasoning={showReasoning}
                reasoningCompleted={reasoningCompleted}
                options={message.options}
                onOptionSelect={conversation.handleOptionSelect}
                selectedOption={conversation.previousResponses[message.stepId]}
                skippable={message.skippable}
                skipLabel={message.skipLabel}
                onSkip={conversation.handleSkip}
                confirmLabel={message.confirmLabel}
                onConfirm={conversation.handleConfirm}
                showTopicEditor={message.showTopicEditor}
                showConfidenceEditor={message.showConfidenceEditor}
                showProgress={message.showProgress}
                topicEditor={message.showTopicEditor ? renderTopicEditor() : null}
                confidenceEditor={message.showConfidenceEditor ? renderConfidenceEditor() : null}
                superseded={message.superseded}
              />
            );
          }

          return (
            <UserResponseBubble
              key={message.id}
              content={message.content}
              files={message.files}
              timestamp={message.timestamp}
              onEdit={() => conversation.goBack(message.stepId)}
              canEdit={!message.superseded && message.stepId !== conversation.currentStep?.id}
              superseded={message.superseded}
            />
          );
        })}

        {/* Typing indicator */}
        {conversation.isKognoTyping && (
          <KognoMessage content="" isTyping={true} />
        )}

        {/* Error display */}
        {flowState.topicsError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-sm text-red-600">{flowState.topicsError}</p>
            <button
              type="button"
              onClick={flowState.handleGenerateTopics}
              className="mt-2 text-sm text-red-600 underline"
            >
              Try again
            </button>
          </div>
        )}

        {flowState.courseGenerationError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-sm text-red-600">{flowState.courseGenerationError}</p>
            <button
              type="button"
              onClick={flowState.handleGenerateCourse}
              className="mt-2 text-sm text-red-600 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={conversation.messagesEndRef} />
      </div>

      {/* Input area */}
      {renderInputArea()}
    </div>
  );
}
