import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  CONVERSATION_FLOW,
  getNextStep,
  getStepById,
  interpolateMessage,
  calculateProgress,
} from "@/components/courses/create/conversationFlow";

/**
 * Generate a unique ID for messages
 */
function generateId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Custom hook that manages the conversation state for chat-based course creation.
 * Works in conjunction with useCourseCreationFlow to provide a conversational interface.
 *
 * @param {object} flowState - The state object from useCourseCreationFlow
 * @param {object} options - Additional options
 * @param {Function} options.onStepChange - Callback when step changes
 */
export function useCourseConversation(flowState, { onStepChange } = {}) {
  const [messages, setMessages] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isKognoTyping, setIsKognoTyping] = useState(false);
  const [previousResponses, setPreviousResponses] = useState({});
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const messagesEndRef = useRef(null);
  const hasInitialized = useRef(false);

  // Get all state values we need from flowState
  const state = useMemo(
    () => ({
      courseTitle: flowState.courseTitle,
      collegeName: flowState.collegeName,
      studyMode: flowState.studyMode,
      studyHours: flowState.studyHours,
      studyMinutes: flowState.studyMinutes,
      syllabusText: flowState.syllabusText,
      syllabusFiles: flowState.syllabusFiles,
      examNotes: flowState.examNotes,
      examFiles: flowState.examFiles,
      overviewTopics: flowState.overviewTopics,
      moduleConfidenceState: flowState.moduleConfidenceState,
      isTopicsLoading: flowState.isTopicsLoading,
      courseGenerating: flowState.courseGenerating,
      ...previousResponses,
    }),
    [flowState, previousResponses]
  );

  // Calculate the current step based on conditions
  const currentStep = useMemo(() => {
    for (let i = currentStepIndex; i < CONVERSATION_FLOW.length; i++) {
      const step = CONVERSATION_FLOW[i];
      if (!step.condition || step.condition(state)) {
        return { ...step, index: i };
      }
    }
    return null;
  }, [currentStepIndex, state]);

  // Calculate progress
  const progress = useMemo(() => calculateProgress(currentStepIndex), [currentStepIndex]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize conversation with first message
  useEffect(() => {
    if (hasInitialized.current) return;
    if (flowState.authStatus !== "ready") return;

    hasInitialized.current = true;

    // Add initial Kogno message after a short delay
    const timer = setTimeout(() => {
      const firstStep = CONVERSATION_FLOW[0];
      if (firstStep) {
        addKognoMessage(firstStep.kognoMessage, firstStep);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [flowState.authStatus]);

  // Watch for loading state changes to auto-advance transient steps
  useEffect(() => {
    if (!currentStep) return;

    // When topics finish loading, advance from topics_loading to topics_generated
    if (currentStep.id === "topics_loading" && !flowState.isTopicsLoading && flowState.overviewTopics.length > 0) {
      advanceToNextStep();
    }

    // When course finishes generating (if we're still on creating step)
    if (currentStep.id === "creating" && !flowState.courseGenerating) {
      advanceToNextStep();
    }
  }, [currentStep, flowState.isTopicsLoading, flowState.overviewTopics, flowState.courseGenerating]);

  // Add a Kogno (assistant) message
  const addKognoMessage = useCallback(
    async (content, stepConfig = {}, options = {}) => {
      const { immediate = false, showTyping = true } = options;

      if (showTyping && !immediate) {
        setIsKognoTyping(true);
        // Simulate typing delay (300-800ms) for natural feel
        await new Promise((r) => setTimeout(r, 300 + Math.random() * 500));
      }

      const interpolatedContent = interpolateMessage(content, state);

      const message = {
        id: generateId(),
        role: "assistant",
        content: interpolatedContent,
        timestamp: new Date(),
        stepId: stepConfig.id,
        inputType: stepConfig.inputType,
        options: stepConfig.options,
        skippable: stepConfig.skippable,
        skipLabel: stepConfig.skipLabel,
        confirmLabel: stepConfig.confirmLabel,
        placeholder: stepConfig.placeholder,
        field: stepConfig.field,
        showTopicEditor: stepConfig.showTopicEditor,
        showConfidenceEditor: stepConfig.showConfidenceEditor,
        showProgress: stepConfig.showProgress,
        action: stepConfig.action,
        accept: stepConfig.accept,
      };

      setMessages((prev) => [...prev, message]);
      setIsKognoTyping(false);

      return message;
    },
    [state]
  );

  // Add a user response message
  const addUserResponse = useCallback(
    (response, displayText, options = {}) => {
      const { files = [], stepId } = options;

      const message = {
        id: generateId(),
        role: "user",
        content: displayText || response,
        response, // The actual value (may differ from displayText)
        timestamp: new Date(),
        files,
        stepId,
        superseded: false,
      };

      setMessages((prev) => [...prev, message]);

      // Store the response
      if (stepId) {
        setPreviousResponses((prev) => ({
          ...prev,
          [stepId]: response,
        }));
      }

      return message;
    },
    []
  );

  // Handle user submitting a response for the current step
  const handleSubmitResponse = useCallback(
    async (value, displayText, options = {}) => {
      if (!currentStep) return;

      const { files = [] } = options;

      // Add user response message
      addUserResponse(value, displayText, {
        files,
        stepId: currentStep.id,
      });

      // Update the flow state based on the step's field
      if (currentStep.field) {
        switch (currentStep.field) {
          case "courseTitle":
            flowState.setCourseTitle(value);
            break;
          case "collegeName":
            flowState.setCollegeName(value);
            break;
          case "studyMode":
            flowState.setStudyMode(value);
            break;
          case "studyDuration":
            if (typeof value === "object") {
              flowState.setStudyHours(value.hours || 0);
              flowState.setStudyMinutes(value.minutes || 0);
            }
            break;
          case "syllabusChoice":
          case "examChoice":
            // These are stored in previousResponses
            break;
          case "syllabusFiles":
            // Files are handled separately
            break;
          case "syllabusText":
            flowState.setSyllabusText(value);
            break;
          case "examFiles":
            // Files are handled separately
            break;
          case "examNotes":
            flowState.setExamNotes(value);
            break;
          case "topicModifyPrompt":
            // Handled via action
            break;
        }
      }

      // Handle actions
      if (currentStep.action) {
        await executeStepAction(currentStep.action, value);
      } else {
        // Advance to next step
        advanceToNextStep();
      }
    },
    [currentStep, flowState, addUserResponse]
  );

  // Handle skip button
  const handleSkip = useCallback(() => {
    if (!currentStep) return;

    // Add a "skipped" user message
    addUserResponse("(skipped)", currentStep.skipLabel || "Skipped", {
      stepId: currentStep.id,
    });

    // Advance to next step
    advanceToNextStep();
  }, [currentStep, addUserResponse]);

  // Handle option selection
  const handleOptionSelect = useCallback(
    (optionId) => {
      if (!currentStep) return;

      const option = currentStep.options?.find((opt) => opt.id === optionId);
      if (!option) return;

      // If this is a skip option, treat it as skip
      if (optionId === "skip") {
        handleSkip();
        return;
      }

      handleSubmitResponse(optionId, option.label);
    },
    [currentStep, handleSubmitResponse, handleSkip]
  );

  // Handle confirm button (e.g., "Generate Topics")
  const handleConfirm = useCallback(() => {
    if (!currentStep) return;

    // Add confirmation message
    addUserResponse("confirmed", currentStep.confirmLabel || "Continue", {
      stepId: currentStep.id,
    });

    // Execute action if any
    if (currentStep.action) {
      executeStepAction(currentStep.action);
    } else {
      advanceToNextStep();
    }
  }, [currentStep, addUserResponse]);

  // Execute step action
  const executeStepAction = useCallback(
    async (action, value) => {
      setPendingAction(action);

      try {
        switch (action) {
          case "generateTopics":
            // Show loading step message
            const loadingStep = getStepById("topics_loading");
            if (loadingStep) {
              await addKognoMessage(loadingStep.kognoMessage, loadingStep, { immediate: true });
            }
            // Trigger topic generation
            await flowState.handleGenerateTopics();
            break;

          case "modifyTopics":
            if (value) {
              await flowState.handleModifyTopics(value);
              // Stay on same step for multiple modifications
              if (currentStep.allowMultiple) {
                // Add Kogno response after modification
                await addKognoMessage(
                  "Done! Here are your updated topics. Want to make any other changes?",
                  currentStep
                );
                return;
              }
            }
            advanceToNextStep();
            break;

          case "createCourse":
            // Show creating step message
            const creatingStep = getStepById("creating");
            if (creatingStep) {
              await addKognoMessage(creatingStep.kognoMessage, creatingStep, { immediate: true });
            }
            // Trigger course creation
            await flowState.handleGenerateCourse();
            break;

          case "redirect":
            // Redirect is handled by handleGenerateCourse
            break;

          default:
            advanceToNextStep();
        }
      } catch (error) {
        console.error("Step action failed:", error);
        // Add error message
        await addKognoMessage(
          `Oops, something went wrong: ${error.message}. Would you like to try again?`,
          { inputType: "confirm", confirmLabel: "Try Again", action }
        );
      } finally {
        setPendingAction(null);
      }
    },
    [flowState, currentStep, addKognoMessage]
  );

  // Advance to the next step
  const advanceToNextStep = useCallback(async () => {
    const nextStep = getNextStep(currentStepIndex, state);

    if (!nextStep) {
      // Conversation complete
      return;
    }

    setCurrentStepIndex(nextStep.index);

    if (onStepChange) {
      onStepChange(nextStep);
    }

    // Add Kogno message for the next step
    await addKognoMessage(nextStep.kognoMessage, nextStep);
  }, [currentStepIndex, state, addKognoMessage, onStepChange]);

  // Go back to a previous step (for editing)
  const goBack = useCallback(
    async (targetStepId) => {
      const targetStep = getStepById(targetStepId);
      if (!targetStep) return;

      // Mark all messages after this point as superseded
      setMessages((prev) => {
        const targetIndex = prev.findIndex(
          (msg) => msg.stepId === targetStepId && msg.role === "assistant"
        );
        if (targetIndex === -1) return prev;

        return prev.map((msg, i) => {
          if (i > targetIndex) {
            return { ...msg, superseded: true };
          }
          return msg;
        });
      });

      // Reset to target step
      setCurrentStepIndex(targetStep.index);

      // Clear responses after this step
      setPreviousResponses((prev) => {
        const newResponses = {};
        for (const [stepId, value] of Object.entries(prev)) {
          const stepConfig = getStepById(stepId);
          if (stepConfig && stepConfig.index < targetStep.index) {
            newResponses[stepId] = value;
          }
        }
        return newResponses;
      });

      setEditingMessageId(null);

      // Re-add the Kogno message for the target step
      await addKognoMessage(targetStep.kognoMessage, targetStep);
    },
    [addKognoMessage]
  );

  // Start editing a previous response
  const startEditing = useCallback((messageId) => {
    setEditingMessageId(messageId);
  }, []);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditingMessageId(null);
  }, []);

  // Handle file upload for current step
  const handleFileUpload = useCallback(
    (files) => {
      if (!currentStep) return;

      if (currentStep.field === "syllabusFiles") {
        flowState.handleSyllabusFileChange(files);
      } else if (currentStep.field === "examFiles") {
        flowState.handleExamFileChange(files);
      }

      // Don't auto-advance - user clicks "Done uploading"
    },
    [currentStep, flowState]
  );

  // Remove a file
  const handleFileRemove = useCallback(
    (fileName) => {
      if (!currentStep) return;

      if (currentStep.field === "syllabusFiles") {
        flowState.handleRemoveSyllabusFile(fileName);
      } else if (currentStep.field === "examFiles") {
        flowState.handleRemoveExamFile(fileName);
      }
    },
    [currentStep, flowState]
  );

  // Get files for current step
  const currentFiles = useMemo(() => {
    if (!currentStep) return [];

    if (currentStep.field === "syllabusFiles") {
      return flowState.syllabusFiles;
    } else if (currentStep.field === "examFiles") {
      return flowState.examFiles;
    }

    return [];
  }, [currentStep, flowState.syllabusFiles, flowState.examFiles]);

  return {
    // Messages
    messages,
    messagesEndRef,

    // Current state
    currentStep,
    currentStepIndex,
    isKognoTyping,
    progress,
    pendingAction,

    // Editing
    editingMessageId,
    startEditing,
    cancelEditing,

    // Handlers
    handleSubmitResponse,
    handleSkip,
    handleOptionSelect,
    handleConfirm,
    handleFileUpload,
    handleFileRemove,
    goBack,

    // Files
    currentFiles,

    // State
    state,
    previousResponses,
  };
}

export default useCourseConversation;
