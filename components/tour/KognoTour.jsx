"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useGuidedTour } from "./GuidedTourProvider";
import KognoCharacter from "@/components/kogno/KognoCharacter";
import SpeechBubble from "@/components/kogno/SpeechBubble";

const DEFAULT_KOGNO_SIZE = 200;
const DEFAULT_KOGNO_OFFSET = 20;
const DEFAULT_VIEWPORT_PADDING = 16;
const DEFAULT_SPOTLIGHT_PADDING = 10;
const DEFAULT_SPOTLIGHT_RADIUS = 16;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getTargetElement(target) {
  if (!target || typeof document === "undefined") return null;
  return (
    document.querySelector(`[data-tour="${target}"]`) ||
    document.querySelector(target)
  );
}

function getRectFromElement(targetEl) {
  if (!targetEl) return null;
  const rect = targetEl.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    bottom: rect.bottom,
    right: rect.right,
  };
}

function parseSize(size) {
  if (typeof size === "number") return size;
  if (typeof size === "string") {
    const parsed = Number.parseFloat(size);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return DEFAULT_KOGNO_SIZE;
}

function choosePlacement({ targetRect, kognoWidth, kognoHeight, offset, viewportPadding }) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const space = {
    left: targetRect.left - viewportPadding,
    right: viewportWidth - targetRect.right - viewportPadding,
    top: targetRect.top - viewportPadding,
    bottom: viewportHeight - targetRect.bottom - viewportPadding,
  };

  if (space.right >= kognoWidth + offset) return "right";
  if (space.left >= kognoWidth + offset) return "left";
  if (space.bottom >= kognoHeight + offset) return "bottom";
  if (space.top >= kognoHeight + offset) return "top";

  const sorted = Object.entries(space).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || "bottom";
}

export default function KognoTour() {
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
  const kognoRef = useRef(null);
  const autoAdvanceRef = useRef(false);
  const [isMounted, setIsMounted] = useState(false);
  const [targetRect, setTargetRect] = useState(null);
  const [isStepCompleted, setIsStepCompleted] = useState(false);
  const [kognoPosition, setKognoPosition] = useState({ top: 0, left: 0, placement: "bottom" });

  const isModalStep = Boolean(!currentStepConfig?.target || currentStepConfig?.modal);
  const canProceed = !requiresInteraction || isStepCompleted;
  const canSkip = currentStepConfig?.skippable !== false;
  const isLastStep = currentStep + 1 >= totalSteps;

  const expression = currentStepConfig?.kogno?.expression || "neutral";
  const bubblePlacement = currentStepConfig?.bubble?.placement || currentStepConfig?.position || "top";
  const bubbleMaxWidth = currentStepConfig?.bubble?.maxWidth || 320;
  const bubbleTypewriter = currentStepConfig?.bubble?.typewriter !== false;
  const kognoSize = currentStepConfig?.kogno?.size || DEFAULT_KOGNO_SIZE;
  const kognoOffset = currentStepConfig?.kogno?.offset ?? DEFAULT_KOGNO_OFFSET;
  const viewportPadding = currentStepConfig?.kogno?.viewportPadding ?? DEFAULT_VIEWPORT_PADDING;

  // Reset step completion when step changes
  useEffect(() => {
    setIsStepCompleted(false);
    autoAdvanceRef.current = false;
  }, [currentStep]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
      const targetEl = getTargetElement(currentStepConfig.target);
      if (targetEl) {
        const rect = getRectFromElement(targetEl);
        setTargetRect(rect);

        if (rect) {
          if (
            rect.top < 0 ||
            rect.bottom > window.innerHeight ||
            rect.left < 0 ||
            rect.right > window.innerWidth
          ) {
            targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      } else {
        setTargetRect(null);
      }
    };

    updateTargetRect();

    window.addEventListener("scroll", updateTargetRect, true);
    window.addEventListener("resize", updateTargetRect);

    return () => {
      window.removeEventListener("scroll", updateTargetRect, true);
      window.removeEventListener("resize", updateTargetRect);
    };
  }, [isTourActive, currentStepConfig]);

  // Listen for interactive steps
  useEffect(() => {
    if (!requiresInteraction || !currentStepConfig?.target) return;

    const handleClick = (event) => {
      const targetEl = getTargetElement(currentStepConfig.target);
      if (!targetEl || !(targetEl === event.target || targetEl.contains(event.target))) {
        return;
      }

      const clickable = event.target.closest(
        "button, [role='button'], a, [data-tour-complete='true']"
      );

      if (!clickable) return;

      setIsStepCompleted(true);
      completeStep();
    };

    const handleKeyDown = (event) => {
      if (event.key !== "Enter") return;

      const targetEl = getTargetElement(currentStepConfig.target);
      if (!targetEl || !(targetEl === event.target || targetEl.contains(event.target))) {
        return;
      }

      const tagName = event.target?.tagName?.toLowerCase();
      if (tagName === "input" || tagName === "textarea") {
        setIsStepCompleted(true);
        completeStep();
      }
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [requiresInteraction, currentStepConfig, completeStep]);

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
      const targetEl = getTargetElement(currentStepConfig.target);
      if (!targetEl) {
        setIsStepCompleted(true);
        completeStep();
        nextStep();
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [currentStepConfig, targetRect, completeStep, nextStep]);

  const computeKognoPosition = useCallback(() => {
    if (!isTourActive) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const measuredRect = kognoRef.current?.getBoundingClientRect();
    const defaultSize = parseSize(kognoSize);
    const width = measuredRect?.width || defaultSize;
    const height = measuredRect?.height || defaultSize;

    let placement = currentStepConfig?.kogno?.placement || null;
    let top = 0;
    let left = 0;

    if (currentStepConfig?.kogno?.position) {
      const { top: forcedTop, left: forcedLeft } = currentStepConfig.kogno.position;
      top = forcedTop ?? 0;
      left = forcedLeft ?? 0;
      placement = placement || "manual";
    } else if (isModalStep || !targetRect) {
      const dock = currentStepConfig?.kogno?.dock || "center";
      top = viewportHeight - height - kognoOffset * 2;
      if (dock === "left") {
        left = viewportPadding;
      } else if (dock === "right") {
        left = viewportWidth - width - viewportPadding;
      } else {
        left = (viewportWidth - width) / 2;
      }
      placement = placement || "bottom";
    } else {
      placement = placement || choosePlacement({
        targetRect,
        kognoWidth: width,
        kognoHeight: height,
        offset: kognoOffset,
        viewportPadding,
      });

      if (placement === "right") {
        left = targetRect.right + kognoOffset;
        top = targetRect.top + targetRect.height / 2 - height / 2;
      } else if (placement === "left") {
        left = targetRect.left - width - kognoOffset;
        top = targetRect.top + targetRect.height / 2 - height / 2;
      } else if (placement === "top") {
        left = targetRect.left + targetRect.width / 2 - width / 2;
        top = targetRect.top - height - kognoOffset;
      } else {
        left = targetRect.left + targetRect.width / 2 - width / 2;
        top = targetRect.bottom + kognoOffset;
      }
    }

    const clampedLeft = clamp(left, viewportPadding, viewportWidth - width - viewportPadding);
    const clampedTop = clamp(top, viewportPadding, viewportHeight - height - viewportPadding);

    setKognoPosition({ top: clampedTop, left: clampedLeft, placement: placement || "bottom" });
  }, [isTourActive, currentStepConfig, isModalStep, targetRect, kognoSize, kognoOffset, viewportPadding]);

  useLayoutEffect(() => {
    if (!isTourActive) return;
    const raf = requestAnimationFrame(() => {
      computeKognoPosition();
    });
    return () => cancelAnimationFrame(raf);
  }, [isTourActive, currentStepConfig, targetRect, computeKognoPosition]);

  useEffect(() => {
    if (!isTourActive) return undefined;
    const handleResize = () => computeKognoPosition();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isTourActive, computeKognoPosition]);

  if (!isTourActive || !currentStepConfig) return null;
  if (!isMounted || typeof document === "undefined") return null;

  const spotlightPadding = currentStepConfig?.spotlight?.padding ?? DEFAULT_SPOTLIGHT_PADDING;
  const spotlightRadius = currentStepConfig?.spotlight?.radius ?? DEFAULT_SPOTLIGHT_RADIUS;
  const showSpotlight = currentStepConfig?.spotlight?.enabled !== false && targetRect;

  const progressDots = (
    <div className="flex items-center justify-end gap-1">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <span
          key={index}
          className={`h-2 w-2 rounded-full transition-colors ${
            index <= currentStep ? "bg-[var(--primary)]" : "bg-[var(--surface-muted)]"
          }`}
        />
      ))}
    </div>
  );

  const bubbleHeader = (
    <div className="flex items-start justify-between gap-3">
      <div>
        {currentStepConfig.title ? (
          <h4 className="text-base font-semibold text-[var(--foreground)]">
            {currentStepConfig.title}
          </h4>
        ) : null}
      </div>
      <div>{progressDots}</div>
    </div>
  );

  const bubbleFooter = (
    <div className="flex flex-col gap-3">
      {requiresInteraction && !isStepCompleted ? (
        <div className="flex items-center gap-2 text-xs font-medium text-amber-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Complete this action to continue</span>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        {canSkip ? (
          <button
            type="button"
            onClick={skipTour}
            className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            Skip tour
          </button>
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={nextStep}
          disabled={!canProceed}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            canProceed
              ? "bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90"
              : "bg-[var(--surface-muted)] text-[var(--muted-foreground)] cursor-not-allowed"
          }`}
        >
          {isLastStep ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );

  return createPortal(
    <AnimatePresence>
      <motion.div
        key={`${currentTour}-${currentStep}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[9997] pointer-events-none"
      >
        {showSpotlight && targetRect ? (
          <div
            className="absolute pointer-events-none"
            style={{
              top: targetRect.top - spotlightPadding,
              left: targetRect.left - spotlightPadding,
              width: targetRect.width + spotlightPadding * 2,
              height: targetRect.height + spotlightPadding * 2,
              borderRadius: spotlightRadius,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
              border: "2px solid rgba(255,255,255,0.4)",
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-black/40" />
        )}
      </motion.div>
      <motion.div
        key={`kogno-${currentTour}-${currentStep}`}
        className="fixed z-[9999]"
        style={{
          top: kognoPosition.top,
          left: kognoPosition.left,
        }}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div ref={kognoRef} className="pointer-events-auto">
          <KognoCharacter expression={expression} size={kognoSize} />
        </div>
      </motion.div>
      <SpeechBubble
        anchorRef={kognoRef}
        show={isTourActive}
        placement={bubblePlacement}
        maxWidth={bubbleMaxWidth}
        typewriter={bubbleTypewriter}
        text={currentStepConfig.content || ""}
        header={bubbleHeader}
        footer={bubbleFooter}
        portal={false}
      />
    </AnimatePresence>,
    document.body
  );
}
