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
  const [contentText, setContentText] = useState(""); // Text content for combined input
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

  // Advance to the next step
  // Must be defined before handlers that depend on it
  const advanceToNextStep = useCallback(async (stateOverrides = {}) => {
    // Merge current state with any overrides (for values that were just set but not yet reflected in state)
    const mergedState = { ...state, ...stateOverrides };
    const nextStep = getNextStep(currentStepIndex, mergedState);

    if (!nextStep) {
      // Conversation complete
      return;
    }

    setCurrentStepIndex(nextStep.index);

    if (onStepChange) {
      onStepChange(nextStep);
    }

    // Interpolate message with merged state to include just-set values
    const interpolatedMessage = interpolateMessage(nextStep.kognoMessage, mergedState);

    // Add Kogno message for the next step (pass already-interpolated message)
    await addKognoMessage(interpolatedMessage, nextStep);
  }, [currentStepIndex, state, addKognoMessage, onStepChange]);

  // Execute step action
  const executeStepAction = useCallback(
    async (action, value) => {
      setPendingAction(action);

      try {
        switch (action) {
          case "generateTopics":
            // Show loading step message and advance to loading step
            const loadingStep = getStepById("topics_loading");
            if (loadingStep) {
              setCurrentStepIndex(loadingStep.index);
              await addKognoMessage(loadingStep.kognoMessage, loadingStep, { immediate: true });
            }
            // Trigger topic generation (useEffect will advance to topics_generated when done)
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
            // Show creating step message and advance to creating step
            const creatingStep = getStepById("creating");
            if (creatingStep) {
              setCurrentStepIndex(creatingStep.index);
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
    [flowState, currentStep, addKognoMessage, advanceToNextStep]
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

      // Track state overrides for immediate use in advanceToNextStep
      const stateOverrides = {};

      // Update the flow state based on the step's field
      if (currentStep.field) {
        switch (currentStep.field) {
          case "courseTitle":
            flowState.setCourseTitle(value);
            stateOverrides.courseTitle = value;
            break;
          case "collegeName":
            flowState.setCollegeName(value);
            stateOverrides.collegeName = value;
            break;
          case "studyMode":
            flowState.setStudyMode(value);
            stateOverrides.studyMode = value;
            break;
          case "studyDuration":
            if (typeof value === "object") {
              flowState.setStudyHours(value.hours || 0);
              flowState.setStudyMinutes(value.minutes || 0);
              stateOverrides.studyHours = value.hours || 0;
              stateOverrides.studyMinutes = value.minutes || 0;
            }
            break;
          case "syllabusChoice":
          case "examChoice":
            // These are stored in previousResponses
            stateOverrides[currentStep.field] = value;
            break;
          case "syllabusFiles":
            // Files are handled separately
            break;
          case "syllabusText":
            flowState.setSyllabusText(value);
            stateOverrides.syllabusText = value;
            break;
          case "syllabusContent":
            // Combined text + files - handled by handleContentSubmit
            break;
          case "examFiles":
            // Files are handled separately
            break;
          case "examNotes":
            flowState.setExamNotes(value);
            stateOverrides.examNotes = value;
            break;
          case "examContent":
            // Combined text + files - handled by handleContentSubmit
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
        // Advance to next step with state overrides
        advanceToNextStep(stateOverrides);
      }
    },
    [currentStep, flowState, addUserResponse, advanceToNextStep]
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
  }, [currentStep, addUserResponse, executeStepAction, advanceToNextStep]);

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
  }, [currentStep, flowState.isTopicsLoading, flowState.overviewTopics, flowState.courseGenerating, advanceToNextStep]);

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

      // Check filesField for combined input, or field for legacy file-only input
      const filesField = currentStep.filesField || currentStep.field;

      if (filesField === "syllabusFiles") {
        flowState.handleSyllabusFileChange(files);
      } else if (filesField === "examFiles") {
        flowState.handleExamFileChange(files);
      }

      // Don't auto-advance - user clicks "Done uploading" or submits content
    },
    [currentStep, flowState]
  );

  // Remove a file
  const handleFileRemove = useCallback(
    (fileName) => {
      if (!currentStep) return;

      // Check filesField for combined input, or field for legacy file-only input
      const filesField = currentStep.filesField || currentStep.field;

      if (filesField === "syllabusFiles") {
        flowState.handleRemoveSyllabusFile(fileName);
      } else if (filesField === "examFiles") {
        flowState.handleRemoveExamFile(fileName);
      }
    },
    [currentStep, flowState]
  );

  // Get files for current step
  const currentFiles = useMemo(() => {
    if (!currentStep) return [];

    // Check filesField for combined input, or field for legacy file-only input
    const filesField = currentStep.filesField || currentStep.field;

    if (filesField === "syllabusFiles") {
      return flowState.syllabusFiles;
    } else if (filesField === "examFiles") {
      return flowState.examFiles;
    }

    return [];
  }, [currentStep, flowState.syllabusFiles, flowState.examFiles]);

  // Handle content text change for combined input
  const handleContentTextChange = useCallback((text) => {
    setContentText(text);
  }, []);

  // Handle combined content submission (text + files)
  const handleContentSubmit = useCallback(
    async (text, files) => {
      if (!currentStep) return;

      // Build display text for the user message
      const hasText = text && text.trim().length > 0;
      const hasFiles = files && files.length > 0;

      let displayText = "";
      if (hasText && hasFiles) {
        displayText = `${text.trim().substring(0, 100)}${text.length > 100 ? "..." : ""} (+ ${files.length} file${files.length > 1 ? "s" : ""})`;
      } else if (hasText) {
        displayText = text.trim().substring(0, 150) + (text.length > 150 ? "..." : "");
      } else if (hasFiles) {
        displayText = `${files.length} file${files.length > 1 ? "s" : ""} uploaded`;
      } else {
        displayText = "(No content added)";
      }

      // Add user response message
      addUserResponse(
        { text: text || "", fileCount: files?.length || 0 },
        displayText,
        { files, stepId: currentStep.id }
      );

      // Update the flow state
      const textField = currentStep.textField;
      const filesField = currentStep.filesField;

      if (textField === "syllabusText") {
        flowState.setSyllabusText(text || "");
      } else if (textField === "examNotes") {
        flowState.setExamNotes(text || "");
      }

      // Files should already be in state from handleFileUpload calls
      // But let's make sure they're set (in case of direct submission)
      if (files && files.length > 0) {
        if (filesField === "syllabusFiles") {
          // Files already tracked via handleFileUpload
        } else if (filesField === "examFiles") {
          // Files already tracked via handleFileUpload
        }
      }

      // Reset content text for next input
      setContentText("");

      // Advance to next step
      advanceToNextStep();
    },
    [currentStep, flowState, addUserResponse, advanceToNextStep]
  );

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

    // Combined content handlers
    contentText,
    handleContentTextChange,
    handleContentSubmit,

    // Files
    currentFiles,

    // State
    state,
    previousResponses,
  };
}

export default useCourseConversation;
