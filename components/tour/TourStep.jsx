"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useGuidedTour } from "./GuidedTourProvider";

/**
 * Calculate optimal position for the tooltip
 */
function calculatePosition(targetRect, tooltipRect, preferredPosition = "bottom") {
  const padding = 12;
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  const positions = {
    bottom: {
      top: targetRect.bottom + padding,
      left: targetRect.left + (targetRect.width - tooltipRect.width) / 2,
    },
    top: {
      top: targetRect.top - tooltipRect.height - padding,
      left: targetRect.left + (targetRect.width - tooltipRect.width) / 2,
    },
    left: {
      top: targetRect.top + (targetRect.height - tooltipRect.height) / 2,
      left: targetRect.left - tooltipRect.width - padding,
    },
    right: {
      top: targetRect.top + (targetRect.height - tooltipRect.height) / 2,
      left: targetRect.right + padding,
    },
  };

  // Try preferred position first, then fall back to others
  const order = [preferredPosition, "bottom", "top", "right", "left"];

  for (const pos of order) {
    const { top, left } = positions[pos];
    const fits =
      top >= 0 &&
      left >= 0 &&
      top + tooltipRect.height <= viewport.height &&
      left + tooltipRect.width <= viewport.width;

    if (fits) {
      return {
        ...positions[pos],
        position: pos,
      };
    }
  }

  // Default to bottom if nothing fits
  return {
    ...positions.bottom,
    position: "bottom",
  };
}

/**
 * Tour tooltip component
 */
function TourTooltip({
  content,
  title,
  position,
  currentStep,
  totalSteps,
  onNext,
  onSkip,
  isInteractive,
  isStepCompleted,
  canSkip,
  targetRect,
  preferredPosition,
}) {
  const tooltipRef = useRef(null);
  const [tooltipRect, setTooltipRect] = useState({ width: 320, height: 200 });
  const [actualPosition, setActualPosition] = useState(preferredPosition || "bottom");

  useEffect(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      setTooltipRect({ width: rect.width, height: rect.height });
    }
  }, [content]);

  const calculatedPos = targetRect
    ? calculatePosition(targetRect, tooltipRect, preferredPosition)
    : { top: "50%", left: "50%", position: "center" };

  const canProceed = !isInteractive || isStepCompleted;

  return (
    <motion.div
      ref={tooltipRef}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="fixed z-[10000] w-80 max-w-[90vw] bg-[var(--surface-1)] rounded-2xl shadow-2xl border border-[var(--border)] pointer-events-auto"
      style={{
        top: calculatedPos.top,
        left: calculatedPos.left,
        transform: calculatedPos.position === "center" ? "translate(-50%, -50%)" : undefined,
      }}
    >
      {/* Progress indicator */}
      <div className="px-4 pt-3 pb-2 border-b border-[var(--border)]">
        <div className="flex items-center justify-end">
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i <= currentStep ? "bg-[var(--primary)]" : "bg-[var(--surface-muted)]"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {title && (
          <h3 className="text-base font-semibold text-[var(--foreground)] mb-2">
            {title}
          </h3>
        )}
        <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
          {content}
        </p>

        {isInteractive && !isStepCompleted && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Complete this action to continue</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex items-center justify-between gap-3">
        {canSkip ? (
          <button
            onClick={onSkip}
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            Skip tour
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            canProceed
              ? "bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90"
              : "bg-[var(--surface-muted)] text-[var(--muted-foreground)] cursor-not-allowed"
          }`}
        >
          {currentStep + 1 === totalSteps ? "Finish" : "Next"}
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Modal-style tour step (no target element)
 */
function ModalTourStep({
  content,
  title,
  currentStep,
  totalSteps,
  onNext,
  onSkip,
  canSkip,
}) {
  const dragConstraintsRef = useRef(null);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm" />

      {/* Drag boundary */}
      <div ref={dragConstraintsRef} className="fixed inset-0 z-[10000] flex items-center justify-center">
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          drag
          dragMomentum={false}
          dragConstraints={dragConstraintsRef}
          whileTap={{ cursor: "grabbing" }}
          className="w-96 max-w-[90vw] bg-[var(--surface-1)] rounded-2xl shadow-2xl border border-[var(--border)] cursor-grab"
        >
          {/* Progress */}
          <div className="px-5 pt-4 pb-3">
            <div className="flex gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1 rounded-full transition-colors ${
                    i <= currentStep ? "bg-[var(--primary)]" : "bg-[var(--surface-muted)]"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-5 pb-4">
            {title && (
              <h2 className="text-xl font-bold text-[var(--foreground)] mb-3">
                {title}
              </h2>
            )}
            <p className="text-[var(--muted-foreground)] leading-relaxed">
              {content}
            </p>
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 flex items-center justify-between gap-3">
            {canSkip ? (
              <button
                onClick={onSkip}
                className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Skip tour
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={onNext}
              className="px-5 py-2.5 text-sm font-semibold bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary)]/90 transition-colors"
            >
              {currentStep + 1 === totalSteps ? "Get Started" : "Continue"}
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}

/**
 * TourStep - Renders the current tour step with spotlight and tooltip
 */
export default function TourStep() {
  const {
    isTourActive,
    currentStep,
    currentStepConfig,
    currentTour,
    totalSteps,
    nextStep,
    skipTour,
    requiresInteraction,
    completeStep,
    endTour,
  } = useGuidedTour();
  const pathname = usePathname();

  const [targetRect, setTargetRect] = useState(null);
  const [isStepCompleted, setIsStepCompleted] = useState(false);
  const autoAdvanceRef = useRef(false);

  // Reset step completion when step changes
  useEffect(() => {
    setIsStepCompleted(false);
    autoAdvanceRef.current = false;
  }, [currentStep]);

  // Stop tour if user navigates away from the relevant page
  useEffect(() => {
    if (!currentTour) return;
    if (currentTour === "course-creation" && pathname !== "/courses/create") {
      endTour(false);
      return;
    }
    if (currentTour === "course-features") {
      const isCourseRoot = pathname?.startsWith("/courses/") && !pathname.slice("/courses/".length).includes("/");
      if (!isCourseRoot) {
        endTour(false);
      }
    }
  }, [currentTour, pathname, endTour]);

  // Find and track target element
  useEffect(() => {
    if (!isTourActive || !currentStepConfig?.target) {
      setTargetRect(null);
      return;
    }

    const updateTargetRect = () => {
      const target =
        document.querySelector(`[data-tour="${currentStepConfig.target}"]`) ||
        document.querySelector(currentStepConfig.target);

      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
          right: rect.right,
        });

        // Scroll target into view if needed
        if (
          rect.top < 0 ||
          rect.bottom > window.innerHeight ||
          rect.left < 0 ||
          rect.right > window.innerWidth
        ) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else {
        setTargetRect(null);
      }
    };

    updateTargetRect();

    // Update on scroll/resize
    window.addEventListener("scroll", updateTargetRect, true);
    window.addEventListener("resize", updateTargetRect);

    // Set up click listener for interactive steps
    if (requiresInteraction && currentStepConfig.target) {
      const handleClick = (e) => {
        const target =
          document.querySelector(`[data-tour="${currentStepConfig.target}"]`) ||
          document.querySelector(currentStepConfig.target);

        if (!target || !(target === e.target || target.contains(e.target))) {
          return;
        }

        const clickable = e.target.closest(
          "button, [role='button'], a, [data-tour-complete='true']"
        );

        if (!clickable) return;

        setIsStepCompleted(true);
        completeStep();
      };

      const handleKeyDown = (e) => {
        if (e.key !== "Enter") return;

        const target =
          document.querySelector(`[data-tour="${currentStepConfig.target}"]`) ||
          document.querySelector(currentStepConfig.target);

        if (!target || !(target === e.target || target.contains(e.target))) {
          return;
        }

        const tagName = e.target?.tagName?.toLowerCase();
        if (tagName === "input" || tagName === "textarea") {
          setIsStepCompleted(true);
          completeStep();
        }
      };

      document.addEventListener("click", handleClick, true);
      document.addEventListener("keydown", handleKeyDown, true);
      return () => {
        window.removeEventListener("scroll", updateTargetRect, true);
        window.removeEventListener("resize", updateTargetRect);
        document.removeEventListener("click", handleClick, true);
        document.removeEventListener("keydown", handleKeyDown, true);
      };
    }

    return () => {
      window.removeEventListener("scroll", updateTargetRect, true);
      window.removeEventListener("resize", updateTargetRect);
    };
  }, [isTourActive, currentStepConfig, requiresInteraction, completeStep]);

  useEffect(() => {
    if (!currentStepConfig?.showIfStudyMode) return;
    if (typeof window === "undefined") return;

    let shouldShow = true;
    try {
      const storedMode = localStorage.getItem("kogno_study_mode");
      shouldShow = storedMode === currentStepConfig.showIfStudyMode;
    } catch (error) {
      console.warn("[Tour] showIfStudyMode check failed:", error);
    }

    if (shouldShow) return;

    setIsStepCompleted(true);
    completeStep();
    nextStep();
  }, [currentStepConfig, completeStep, nextStep]);

  useEffect(() => {
    if (!requiresInteraction || !isStepCompleted) return;
    if (currentStepConfig?.autoAdvance === false) return;
    if (autoAdvanceRef.current) return;

    autoAdvanceRef.current = true;
    const timer = setTimeout(() => {
      nextStep();
    }, 250);

    return () => clearTimeout(timer);
  }, [requiresInteraction, isStepCompleted, currentStepConfig, nextStep]);

  useEffect(() => {
    if (!currentStepConfig?.skipIfMissing) return;
    if (!currentStepConfig?.target) return;
    if (targetRect) return;

    const timer = setTimeout(() => {
      const target =
        document.querySelector(`[data-tour="${currentStepConfig.target}"]`) ||
        document.querySelector(currentStepConfig.target);

      if (!target) {
        setIsStepCompleted(true);
        completeStep();
        nextStep();
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [currentStepConfig, targetRect, completeStep, nextStep]);

  // Don't render if no active tour or mounting
  if (!isTourActive || !currentStepConfig) return null;

  // Render modal-style step if no target
  if (!currentStepConfig.target || currentStepConfig.modal) {
    return createPortal(
      <AnimatePresence>
        <ModalTourStep
          title={currentStepConfig.title}
          content={currentStepConfig.content}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onNext={nextStep}
          onSkip={skipTour}
          canSkip={currentStepConfig.skippable !== false}
        />
      </AnimatePresence>,
      document.body
    );
  }

  // Render tooltip for targeted steps
  return createPortal(
    <AnimatePresence>
      <TourTooltip
        title={currentStepConfig.title}
        content={currentStepConfig.content}
        currentStep={currentStep}
        totalSteps={totalSteps}
        onNext={nextStep}
        onSkip={skipTour}
        isInteractive={requiresInteraction}
        isStepCompleted={isStepCompleted}
        canSkip={currentStepConfig.skippable !== false}
        targetRect={targetRect}
        preferredPosition={currentStepConfig.position}
      />
    </AnimatePresence>,
    document.body
  );
}
