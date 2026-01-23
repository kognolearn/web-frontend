import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  CONVERSATION_FLOW,
  getNextStep,
  getStepById,
  interpolateMessage,
  calculateProgress,
} from "@/components/courses/create/conversationFlow";
import {
  getCourseChatCollegeFollowup,
  getCourseChatRetryMessage,
} from "@/components/courses/create/courseChatMessages";
import { authFetch } from "@/lib/api";

/**
 * Generate a unique ID for messages
 */
function generateId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Generate a unique ID for branches
 */
function generateBranchId() {
  return `branch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Input types that are editable via the edit modal
 */
const EDITABLE_INPUT_TYPES = new Set([
  'text',
  'textarea',
  'course_chat',
  'text_confirm',
  'options',
]);

/**
 * Check if a message's input type is editable
 */
function isEditableInputType(inputType) {
  return EDITABLE_INPUT_TYPES.has(inputType);
}

/**
 * Custom hook that manages the conversation state for chat-based course creation.
 * Works in conjunction with useCourseCreationFlow to provide a conversational interface.
 *
 * Supports branching: editing a past message creates a new branch rather than overwriting.
 *
 * @param {object} flowState - The state object from useCourseCreationFlow
 * @param {object} options - Additional options
 * @param {Function} options.onStepChange - Callback when step changes
 */
export function useCourseConversation(flowState, { onStepChange } = {}) {
  // Branch tree state management
  const [branchTree, setBranchTree] = useState({
    root: {
      id: 'root',
      parentId: null,
      branchPointIndex: 0,
      messages: [],
      flowStateSnapshot: null,
      children: [],
      createdAt: Date.now(),
    }
  });
  const [currentBranchId, setCurrentBranchId] = useState('root');

  // Edit modal state
  const [editingMessage, setEditingMessage] = useState(null);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isKognoTyping, setIsKognoTyping] = useState(false);
  const [previousResponses, setPreviousResponses] = useState({});
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [contentText, setContentText] = useState(""); // Text content for combined input
  const [parseChatAttempts, setParseChatAttempts] = useState(0); // Track retry attempts for course chat parsing
  const [isParsing, setIsParsing] = useState(false); // Track parsing state
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
      useUnifiedPlanner: flowState.useUnifiedPlanner,
      planSummary: flowState.planSummary,
      isPlanLoading: flowState.isPlanLoading,
      planError: flowState.planError,
      courseGenerating: flowState.courseGenerating,
      ...previousResponses,
    }),
    [flowState, previousResponses]
  );

  // Compute display messages by walking the branch tree from root to current branch
  const displayMessages = useMemo(() => {
    const result = [];
    const branchChain = [];

    // Walk up to root to get branch chain
    let branchId = currentBranchId;
    while (branchId) {
      branchChain.unshift(branchId);
      branchId = branchTree[branchId]?.parentId;
    }

    // Collect messages from each branch in the chain
    for (let i = 0; i < branchChain.length; i++) {
      const bid = branchChain[i];
      const branch = branchTree[bid];
      if (branch) {
        if (i === 0) {
          // Root branch: include all messages
          result.push(...branch.messages);
        } else {
          // Child branch: include messages from branchPointIndex onwards
          // (messages before branchPointIndex come from parent)
          const parentBranch = branchTree[branch.parentId];
          if (parentBranch) {
            // Remove messages after branch point from result (they're from parent)
            while (result.length > branch.branchPointIndex) {
              result.pop();
            }
          }
          result.push(...branch.messages);
        }
      }
    }

    return result;
  }, [branchTree, currentBranchId]);

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
  }, [displayMessages]);

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

  // Add a message to the current branch
  const addMessageToBranch = useCallback((message) => {
    setBranchTree(prev => {
      const currentBranch = prev[currentBranchId];
      if (!currentBranch) return prev;

      return {
        ...prev,
        [currentBranchId]: {
          ...currentBranch,
          messages: [...currentBranch.messages, message],
        }
      };
    });
  }, [currentBranchId]);

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
        showPlanSummary: stepConfig.showPlanSummary,
        showProgress: stepConfig.showProgress,
        action: stepConfig.action,
        accept: stepConfig.accept,
        tourTarget: stepConfig.tourTarget,
      };

      addMessageToBranch(message);
      setIsKognoTyping(false);

      return message;
    },
    [state, addMessageToBranch]
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

      addMessageToBranch(message);

      // Store the response
      if (stepId) {
        setPreviousResponses((prev) => ({
          ...prev,
          [stepId]: response,
        }));
      }

      return message;
    },
    [addMessageToBranch]
  );

  // Advance to the next step
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
          case "generateUnifiedPlan":
            // Show loading step message and advance to loading step
            const planLoadingStep = getStepById("plan_loading");
            if (planLoadingStep) {
              setCurrentStepIndex(planLoadingStep.index);
              await addKognoMessage(planLoadingStep.kognoMessage, planLoadingStep, { immediate: true });
            }
            await flowState.handleGenerateUnifiedPlan();
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
          case "adjustConfidence":
            await flowState.handleAdjustConfidence();
            advanceToNextStep();
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

      // Handle follow-up college input after course was extracted
      if (previousResponses.needsCollege && flowState.courseTitle && !flowState.collegeName) {
        // Add user response message
        addUserResponse(value, displayText, {
          files,
          stepId: currentStep.id,
        });

        // Set the college name and advance
        flowState.setCollegeName(value);
        const stateOverrides = {
          courseTitle: flowState.courseTitle,
          collegeName: value,
        };

        // Clear the needsCollege flag
        setPreviousResponses(prev => {
          const { needsCollege, ...rest } = prev;
          return rest;
        });

        advanceToNextStep(stateOverrides);
        return;
      }

      // Handle course_chat input type with LLM parsing
      if (currentStep.inputType === 'course_chat' || currentStep.parseHandler === 'courseChatParser') {
        // Add user response message
        addUserResponse(value, displayText, {
          files,
          stepId: currentStep.id,
        });

        setIsParsing(true);

        try {
          // Call the parse API to extract course name and college name
          const response = await authFetch('/api/courses/parse-chat-input', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: value,
              savedCollege: state.savedCollege || null,
            }),
          });

          const result = await response.json();

          if (result.success && result.courseName) {
            // Successfully extracted course name (and optionally college)
            flowState.setCourseTitle(result.courseName);
            const stateOverrides = { courseTitle: result.courseName };

            if (result.collegeName) {
              flowState.setCollegeName(result.collegeName);
              stateOverrides.collegeName = result.collegeName;
            }

            // Reset attempts on success
            setParseChatAttempts(0);
            setIsParsing(false);

            // If we have both, advance to next step
            if (result.courseName && result.collegeName) {
              advanceToNextStep(stateOverrides);
            } else if (result.courseName && !result.collegeName) {
              // Got course but not college - ask for college specifically
              await addKognoMessage(
                getCourseChatCollegeFollowup(result.courseName),
                {
                  id: 'ask_college',
                  inputType: 'text',
                  field: 'collegeName',
                  placeholder: 'e.g., Stanford, MIT, UCLA',
                }
              );
              // Update step to handle college input
              setPreviousResponses(prev => ({
                ...prev,
                needsCollege: true,
              }));
            }
          } else {
            // Parsing failed - show retry message
            const newAttempts = parseChatAttempts + 1;
            setParseChatAttempts(newAttempts);
            setIsParsing(false);

            await addKognoMessage(getCourseChatRetryMessage(newAttempts), currentStep);
          }
        } catch (error) {
          console.error('[useCourseConversation] Parse chat input error:', error);
          setIsParsing(false);
          await addKognoMessage(
            "Something went wrong on my end. Could you try again?",
            currentStep
          );
        }

        return; // Exit early - we've handled this case
      }

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
            // These need to be persisted in previousResponses for condition checks
            setPreviousResponses((prev) => ({
              ...prev,
              [currentStep.field]: value,
            }));
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
    [currentStep, flowState, addUserResponse, advanceToNextStep, addKognoMessage, state, parseChatAttempts, previousResponses]
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
  }, [currentStep, addUserResponse, advanceToNextStep]);

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

    // When plan finishes loading, advance from plan_loading to plan_generated
    if (currentStep.id === "plan_loading" && !flowState.isPlanLoading && flowState.planSummary) {
      advanceToNextStep();
    }

    // When course finishes generating (if we're still on creating step)
    if (currentStep.id === "creating" && !flowState.courseGenerating) {
      advanceToNextStep();
    }
  }, [
    currentStep,
    flowState.isTopicsLoading,
    flowState.overviewTopics,
    flowState.isPlanLoading,
    flowState.planSummary,
    flowState.courseGenerating,
    advanceToNextStep,
  ]);

  // Open the edit modal for a message
  const openEditModal = useCallback((message) => {
    // Find the step config for this message
    const stepConfig = message.stepId ? getStepById(message.stepId) : null;
    setEditingMessage({
      ...message,
      stepConfig,
    });
  }, []);

  // Close the edit modal
  const closeEditModal = useCallback(() => {
    setEditingMessage(null);
  }, []);

  // Create a new branch at the given message index with a new response
  const createBranch = useCallback((atMessageIndex, newResponse, displayText) => {
    const newBranchId = generateBranchId();
    const snapshot = flowState.getStateSnapshot();

    // Find the message at this index to get its step info
    const targetMessage = displayMessages[atMessageIndex];
    if (!targetMessage) return;

    const stepConfig = targetMessage.stepId ? getStepById(targetMessage.stepId) : null;

    setBranchTree(prev => {
      const currentBranch = prev[currentBranchId];
      if (!currentBranch) return prev;

      // Create the new branch
      const newTree = {
        ...prev,
        [newBranchId]: {
          id: newBranchId,
          parentId: currentBranchId,
          branchPointIndex: atMessageIndex,
          messages: [],
          flowStateSnapshot: snapshot,
          children: [],
          createdAt: Date.now(),
        },
        [currentBranchId]: {
          ...currentBranch,
          children: [...currentBranch.children, newBranchId],
        }
      };

      return newTree;
    });

    // Switch to the new branch
    setCurrentBranchId(newBranchId);

    // Reset to the step of the edited message
    if (stepConfig) {
      setCurrentStepIndex(stepConfig.index);

      // Restore state to the snapshot point
      if (snapshot) {
        flowState.restoreStateSnapshot(snapshot);
      }

      // Clear previous responses for steps after this point
      setPreviousResponses(prev => {
        const newResponses = {};
        for (const [stepId, value] of Object.entries(prev)) {
          const otherStep = getStepById(stepId);
          if (otherStep && otherStep.index < stepConfig.index) {
            newResponses[stepId] = value;
          }
        }
        return newResponses;
      });

      // Re-add the assistant message for this step
      const kognoMessage = {
        id: generateId(),
        role: "assistant",
        content: interpolateMessage(stepConfig.kognoMessage, state),
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
        showPlanSummary: stepConfig.showPlanSummary,
        showProgress: stepConfig.showProgress,
        action: stepConfig.action,
        accept: stepConfig.accept,
      };

      // Add the new user response
      const userMessage = {
        id: generateId(),
        role: "user",
        content: displayText || newResponse,
        response: newResponse,
        timestamp: new Date(),
        files: [],
        stepId: stepConfig.id,
        superseded: false,
      };

      // Add messages to the new branch
      setBranchTree(prev => ({
        ...prev,
        [newBranchId]: {
          ...prev[newBranchId],
          messages: [kognoMessage, userMessage],
        }
      }));

      // Store the response
      if (stepConfig.id) {
        setPreviousResponses(prev => ({
          ...prev,
          [stepConfig.id]: newResponse,
        }));
      }

      // Update flow state based on field
      if (stepConfig.field) {
        switch (stepConfig.field) {
          case "courseTitle":
            flowState.setCourseTitle(newResponse);
            break;
          case "collegeName":
            flowState.setCollegeName(newResponse);
            break;
          case "studyMode":
            flowState.setStudyMode(newResponse);
            break;
        }
      }

      // Advance to the next step
      setTimeout(() => {
        advanceToNextStep({ [stepConfig.field]: newResponse });
      }, 100);
    }

    // Close the modal
    closeEditModal();
  }, [currentBranchId, displayMessages, flowState, state, advanceToNextStep, closeEditModal]);

  // Switch to a different branch
  const switchBranch = useCallback((targetBranchId) => {
    const targetBranch = branchTree[targetBranchId];
    if (!targetBranch) return;

    // Restore flow state from snapshot
    if (targetBranch.flowStateSnapshot) {
      flowState.restoreStateSnapshot(targetBranch.flowStateSnapshot);
    }

    setCurrentBranchId(targetBranchId);

    // Rebuild previousResponses from messages in this branch chain
    const newResponses = {};
    const branchChain = [];
    let bid = targetBranchId;
    while (bid) {
      branchChain.unshift(bid);
      bid = branchTree[bid]?.parentId;
    }

    for (const chainBid of branchChain) {
      const branch = branchTree[chainBid];
      if (branch) {
        for (const msg of branch.messages) {
          if (msg.role === 'user' && msg.stepId && msg.response !== undefined) {
            newResponses[msg.stepId] = msg.response;
          }
        }
      }
    }
    setPreviousResponses(newResponses);

    // Recalculate currentStepIndex based on the last message in the branch
    const branchMessages = targetBranch.messages;
    const lastMessage = branchMessages[branchMessages.length - 1];
    if (lastMessage?.stepId) {
      const step = getStepById(lastMessage.stepId);
      if (step) {
        // If the last message was from assistant, we're at that step
        // If it was from user, we need to advance to next step
        if (lastMessage.role === 'user') {
          const nextStep = getNextStep(step.index, { ...state, ...newResponses });
          if (nextStep) {
            setCurrentStepIndex(nextStep.index);
          } else {
            setCurrentStepIndex(step.index);
          }
        } else {
          setCurrentStepIndex(step.index);
        }
      }
    }
  }, [branchTree, flowState, state]);

  // Get branch info for a specific message index (for navigation UI)
  const getBranchInfo = useCallback((messageIndex) => {
    // Find the message at this index
    const message = displayMessages[messageIndex];
    if (!message || message.role !== 'user') return null;

    // Find all branches that fork at this message index from the current branch's parent
    const currentBranch = branchTree[currentBranchId];
    if (!currentBranch) return null;

    // Get sibling branches (branches that share the same parent and branch point)
    let siblingBranches = [];

    if (currentBranch.parentId) {
      const parentBranch = branchTree[currentBranch.parentId];
      if (parentBranch) {
        // Find all children of parent that branch at the same point
        siblingBranches = parentBranch.children
          .map(childId => branchTree[childId])
          .filter(branch => branch && branch.branchPointIndex === messageIndex);

        // Also include the "original" path (staying on parent) if this is where we branched
        if (currentBranch.branchPointIndex === messageIndex) {
          // We need to include parent as a "sibling" for navigation
          siblingBranches = [
            { ...parentBranch, isParentPath: true },
            ...siblingBranches
          ];
        }
      }
    } else {
      // Current branch is root - find children that branch at this point
      siblingBranches = currentBranch.children
        .map(childId => branchTree[childId])
        .filter(branch => branch && branch.branchPointIndex === messageIndex);

      if (siblingBranches.length > 0) {
        // Include root as first option
        siblingBranches = [
          { ...currentBranch, isParentPath: true },
          ...siblingBranches
        ];
      }
    }

    if (siblingBranches.length <= 1) return null;

    // Sort by creation time
    siblingBranches.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    // Find current position in siblings
    const currentIndex = siblingBranches.findIndex(b =>
      b.id === currentBranchId || (b.isParentPath && currentBranch.parentId === null)
    );

    return {
      siblingCount: siblingBranches.length,
      currentIndex: Math.max(0, currentIndex),
      prevBranchId: currentIndex > 0 ? siblingBranches[currentIndex - 1].id : null,
      nextBranchId: currentIndex < siblingBranches.length - 1 ? siblingBranches[currentIndex + 1].id : null,
      siblingBranches: siblingBranches.map(b => b.id),
    };
  }, [branchTree, currentBranchId, displayMessages]);

  // Go back to a previous step (legacy - for non-branching edit)
  const goBack = useCallback(
    async (targetStepId) => {
      const targetStep = getStepById(targetStepId);
      if (!targetStep) return;

      // Find the message for this step
      const messageIndex = displayMessages.findIndex(
        msg => msg.stepId === targetStepId && msg.role === 'user'
      );

      if (messageIndex !== -1) {
        // Open the edit modal instead of directly going back
        openEditModal(displayMessages[messageIndex]);
      }
    },
    [displayMessages, openEditModal]
  );

  // Start editing a previous response (legacy compatibility)
  const startEditing = useCallback((messageId) => {
    setEditingMessageId(messageId);
  }, []);

  // Cancel editing (legacy compatibility)
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

  // Check if a message is editable
  const isMessageEditable = useCallback((message) => {
    if (!message || message.role !== 'user') return false;
    if (message.superseded) return false;

    // Don't allow editing the current step's response
    if (message.stepId === currentStep?.id) return false;

    // Check if we're in a loading/generating state
    if (flowState.isTopicsLoading || flowState.courseGenerating || isParsing) return false;

    // Check if the input type is editable
    const stepConfig = message.stepId ? getStepById(message.stepId) : null;
    if (!stepConfig) return false;

    return isEditableInputType(stepConfig.inputType);
  }, [currentStep, flowState.isTopicsLoading, flowState.courseGenerating, isParsing]);

  return {
    // Messages (use displayMessages instead of messages for rendering)
    messages: displayMessages,
    messagesEndRef,

    // Current state
    currentStep,
    currentStepIndex,
    isKognoTyping,
    isParsing,
    progress,
    pendingAction,

    // Editing (legacy)
    editingMessageId,
    startEditing,
    cancelEditing,

    // Edit modal (branching)
    editingMessage,
    openEditModal,
    closeEditModal,
    createBranch,

    // Branch navigation
    currentBranchId,
    branchTree,
    switchBranch,
    getBranchInfo,

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

    // Utilities
    isMessageEditable,
  };
}

export default useCourseConversation;
