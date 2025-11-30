"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnboarding } from "./OnboardingProvider";

/**
 * OnboardingTooltip - A pastel blue closable tooltip that shows for new users
 * 
 * Features:
 * - Soft pastel blue bubble design with speech-bubble pointer
 * - Closable with X button
 * - Persists dismissed state
 * - Only shows for new users who haven't dismissed it
 * - Supports different positions and pointer directions
 * - Queue-based: only one tooltip shows at a time across the entire app
 * - Priority-based: lower priority numbers show first
 * - Auto-dismiss: tooltips automatically dismiss after a timeout to show the next one
 * - Viewport-aware: automatically adjusts position to stay on screen
 */
export default function OnboardingTooltip({
  id,
  children,
  content,
  position = "bottom",
  pointerPosition = "center", // "left", "center", "right" for horizontal, "top", "center", "bottom" for vertical
  delay = 500, // Delay before requesting to show (ms)
  priority = 10, // Lower = higher priority (shows first)
  showCondition = true, // Additional condition to control visibility
  className = "",
  maxWidth, // Optional - will auto-size if not provided
  autoDismissAfter = 16000, // Auto-dismiss after this many ms (null to disable)
}) {
  const { 
    hasSeenTooltip, 
    dismissTooltip, 
    isLoaded, 
    isNewUser,
    activeTooltip,
    requestTooltip,
    releaseTooltip,
  } = useOnboarding();
  
  const [hasRequested, setHasRequested] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const [adjustedPointerPosition, setAdjustedPointerPosition] = useState(pointerPosition);
  const timeoutRef = useRef(null);
  const autoDismissRef = useRef(null);
  const mountedRef = useRef(true);
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);

  // Check viewport bounds and adjust position if needed
  const checkBounds = useCallback(() => {
    if (!containerRef.current || !tooltipRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const padding = 12; // Minimum distance from viewport edge
    
    let newPosition = position;
    let newPointerPosition = pointerPosition;
    
    // Check if tooltip goes off screen and adjust
    if (position === "top" && tooltipRect.top < padding) {
      newPosition = "bottom";
    } else if (position === "bottom" && tooltipRect.bottom > window.innerHeight - padding) {
      newPosition = "top";
    } else if (position === "left" && tooltipRect.left < padding) {
      newPosition = "right";
    } else if (position === "right" && tooltipRect.right > window.innerWidth - padding) {
      newPosition = "left";
    }
    
    // For top/bottom positions, also check horizontal overflow
    if (newPosition === "top" || newPosition === "bottom") {
      if (tooltipRect.left < padding) {
        newPointerPosition = "left";
      } else if (tooltipRect.right > window.innerWidth - padding) {
        newPointerPosition = "right";
      }
    }
    
    // For left/right positions, check vertical overflow
    if (newPosition === "left" || newPosition === "right") {
      if (tooltipRect.top < padding) {
        newPointerPosition = "top";
      } else if (tooltipRect.bottom > window.innerHeight - padding) {
        newPointerPosition = "bottom";
      }
    }
    
    if (newPosition !== adjustedPosition) {
      setAdjustedPosition(newPosition);
    }
    if (newPointerPosition !== adjustedPointerPosition) {
      setAdjustedPointerPosition(newPointerPosition);
    }
  }, [position, pointerPosition, adjustedPosition, adjustedPointerPosition]);

  // Request to show tooltip after delay if conditions are met
  useEffect(() => {
    mountedRef.current = true;
    
    if (!isLoaded || !isNewUser) return;
    if (hasSeenTooltip(id) || !showCondition) return;

    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        requestTooltip(id, priority);
        setHasRequested(true);
      }
    }, delay);

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // Release tooltip if component unmounts
      releaseTooltip(id);
    };
  }, [isLoaded, isNewUser, hasSeenTooltip, id, showCondition, delay, priority, requestTooltip, releaseTooltip]);

  // Auto-dismiss tooltip after timeout when it becomes visible
  useEffect(() => {
    if (activeTooltip === id && autoDismissAfter && autoDismissAfter > 0) {
      autoDismissRef.current = setTimeout(() => {
        if (mountedRef.current) {
          dismissTooltip(id);
        }
      }, autoDismissAfter);
    }

    return () => {
      if (autoDismissRef.current) {
        clearTimeout(autoDismissRef.current);
        autoDismissRef.current = null;
      }
    };
  }, [activeTooltip, id, autoDismissAfter, dismissTooltip]);

  // Only show if this tooltip is the active one
  const isVisible = activeTooltip === id;

  // Check bounds when tooltip becomes visible
  useEffect(() => {
    if (isVisible) {
      // Reset to original positions first
      setAdjustedPosition(position);
      setAdjustedPointerPosition(pointerPosition);
      // Then check bounds after a short delay to let the tooltip render
      const timer = setTimeout(checkBounds, 50);
      return () => clearTimeout(timer);
    }
  }, [isVisible, position, pointerPosition, checkBounds]);

  const handleDismiss = (e) => {
    e?.stopPropagation();
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    dismissTooltip(id);
  };

  // Position and pointer styles - use adjusted values
  const getPositionStyles = () => {
    const basePositions = {
      top: "bottom-full mb-3",
      bottom: "top-full mt-3",
      left: "right-full mr-3",
      right: "left-full ml-3",
    };

    // Alignment adjustments based on pointer position
    const alignments = {
      top: {
        left: "left-0",
        center: "left-1/2 -translate-x-1/2",
        right: "right-0",
      },
      bottom: {
        left: "left-0",
        center: "left-1/2 -translate-x-1/2",
        right: "right-0",
      },
      left: {
        top: "top-0",
        center: "top-1/2 -translate-y-1/2",
        bottom: "bottom-0",
      },
      right: {
        top: "top-0",
        center: "top-1/2 -translate-y-1/2",
        bottom: "bottom-0",
      },
    };

    return `${basePositions[adjustedPosition]} ${alignments[adjustedPosition]?.[adjustedPointerPosition] || ""}`;
  };

  const getPointerStyles = () => {
    // Pointer (triangle) positioning - use adjusted values
    const pointerBase = "absolute w-0 h-0";
    
    // Border colors for the pastel blue theme
    const borderColor = "border-[#b8d4e8]"; // Light pastel blue
    const bgColor = "border-[#e8f4fc]"; // Lighter pastel blue background
    
    const pointerPositions = {
      top: {
        left: `${pointerBase} top-full left-4 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent ${bgColor.replace('border-', 'border-t-')}`,
        center: `${pointerBase} top-full left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent ${bgColor.replace('border-', 'border-t-')}`,
        right: `${pointerBase} top-full right-4 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent ${bgColor.replace('border-', 'border-t-')}`,
      },
      bottom: {
        left: `${pointerBase} bottom-full left-4 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent ${bgColor.replace('border-', 'border-b-')}`,
        center: `${pointerBase} bottom-full left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent ${bgColor.replace('border-', 'border-b-')}`,
        right: `${pointerBase} bottom-full right-4 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent ${bgColor.replace('border-', 'border-b-')}`,
      },
      left: {
        top: `${pointerBase} left-full top-3 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent ${bgColor.replace('border-', 'border-l-')}`,
        center: `${pointerBase} left-full top-1/2 -translate-y-1/2 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent ${bgColor.replace('border-', 'border-l-')}`,
        bottom: `${pointerBase} left-full bottom-3 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent ${bgColor.replace('border-', 'border-l-')}`,
      },
      right: {
        top: `${pointerBase} right-full top-3 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent ${bgColor.replace('border-', 'border-r-')}`,
        center: `${pointerBase} right-full top-1/2 -translate-y-1/2 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent ${bgColor.replace('border-', 'border-r-')}`,
        bottom: `${pointerBase} right-full bottom-3 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent ${bgColor.replace('border-', 'border-r-')}`,
      },
    };

    return pointerPositions[adjustedPosition]?.[adjustedPointerPosition] || "";
  };

  const getAnimationVariants = () => {
    const directions = {
      top: { y: 10 },
      bottom: { y: -10 },
      left: { x: 10 },
      right: { x: -10 },
    };

    return {
      initial: { opacity: 0, scale: 0.95, ...directions[adjustedPosition] },
      animate: { opacity: 1, scale: 1, x: 0, y: 0 },
      exit: { opacity: 0, scale: 0.95, ...directions[adjustedPosition] },
    };
  };

  // Check if wrapper should be fixed positioned (for fixed children like FABs)
  const isFixedPosition = className?.includes('fixed');
  
  return (
    <div ref={containerRef} className={`${isFixedPosition ? '' : 'relative'} inline-flex ${className}`}>
      {children}
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            {...getAnimationVariants()}
            transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
            className={`absolute z-[100] ${getPositionStyles()}`}
            style={{ 
              maxWidth: maxWidth || "min(320px, 90vw)",
              width: maxWidth ? undefined : "max-content",
            }}
          >
            {/* Tooltip bubble */}
            <div className="relative bg-[#e8f4fc] border-2 border-[#b8d4e8] rounded-2xl shadow-lg shadow-[#b8d4e8]/30">
              {/* Close button */}
              <button
                type="button"
                onClick={handleDismiss}
                className="absolute -top-2 -right-2 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-[#b8d4e8] text-[#4a7c9b] hover:bg-[#9fc5de] hover:text-[#3a6a87] transition-colors shadow-sm"
                aria-label="Dismiss tooltip"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Content */}
              <div className="px-4 py-3 text-sm text-[#3a6a87] leading-relaxed">
                {content}
              </div>

              {/* Pointer/Arrow */}
              <div className={getPointerStyles()} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Standalone onboarding tooltip that can be positioned absolutely
 * Useful for tooltips that need to point to elements without wrapping them
 */
export function FloatingOnboardingTooltip({
  id,
  content,
  position = "bottom",
  pointerPosition = "center",
  delay = 500,
  priority = 10,
  showCondition = true,
  className = "",
  maxWidth, // Optional - will auto-size if not provided
  style = {},
}) {
  const { 
    hasSeenTooltip, 
    dismissTooltip, 
    isLoaded, 
    isNewUser,
    activeTooltip,
    requestTooltip,
    releaseTooltip,
  } = useOnboarding();
  
  const [hasRequested, setHasRequested] = useState(false);
  const timeoutRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    if (!isLoaded || !isNewUser) return;
    if (hasSeenTooltip(id) || !showCondition) return;

    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        requestTooltip(id, priority);
        setHasRequested(true);
      }
    }, delay);

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      releaseTooltip(id);
    };
  }, [isLoaded, isNewUser, hasSeenTooltip, id, showCondition, delay, priority, requestTooltip, releaseTooltip]);

  const handleDismiss = (e) => {
    e?.stopPropagation();
    dismissTooltip(id);
  };

  // Only show if this tooltip is the active one
  const isVisible = activeTooltip === id;

  const getPointerStyles = () => {
    const pointerBase = "absolute w-0 h-0";
    const bgColor = "border-[#e8f4fc]";
    
    const pointerPositions = {
      top: {
        left: `${pointerBase} top-full left-4 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent ${bgColor.replace('border-', 'border-t-')}`,
        center: `${pointerBase} top-full left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent ${bgColor.replace('border-', 'border-t-')}`,
        right: `${pointerBase} top-full right-4 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent ${bgColor.replace('border-', 'border-t-')}`,
      },
      bottom: {
        left: `${pointerBase} bottom-full left-4 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent ${bgColor.replace('border-', 'border-b-')}`,
        center: `${pointerBase} bottom-full left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent ${bgColor.replace('border-', 'border-b-')}`,
        right: `${pointerBase} bottom-full right-4 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent ${bgColor.replace('border-', 'border-b-')}`,
      },
      left: {
        top: `${pointerBase} left-full top-3 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent ${bgColor.replace('border-', 'border-l-')}`,
        center: `${pointerBase} left-full top-1/2 -translate-y-1/2 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent ${bgColor.replace('border-', 'border-l-')}`,
        bottom: `${pointerBase} left-full bottom-3 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent ${bgColor.replace('border-', 'border-l-')}`,
      },
      right: {
        top: `${pointerBase} right-full top-3 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent ${bgColor.replace('border-', 'border-r-')}`,
        center: `${pointerBase} right-full top-1/2 -translate-y-1/2 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent ${bgColor.replace('border-', 'border-r-')}`,
        bottom: `${pointerBase} right-full bottom-3 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent ${bgColor.replace('border-', 'border-r-')}`,
      },
    };

    return pointerPositions[position]?.[pointerPosition] || "";
  };

  const getAnimationVariants = () => {
    const directions = {
      top: { y: 10 },
      bottom: { y: -10 },
      left: { x: 10 },
      right: { x: -10 },
    };

    return {
      initial: { opacity: 0, scale: 0.95, ...directions[position] },
      animate: { opacity: 1, scale: 1, x: 0, y: 0 },
      exit: { opacity: 0, scale: 0.95, ...directions[position] },
    };
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          {...getAnimationVariants()}
          transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
          className={`fixed z-[100] ${className}`}
          style={{ 
            maxWidth: maxWidth || "min(320px, 90vw)",
            width: maxWidth ? undefined : "max-content",
            ...style 
          }}
        >
          <div className="relative bg-[#e8f4fc] border-2 border-[#b8d4e8] rounded-2xl shadow-lg shadow-[#b8d4e8]/30">
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute -top-2 -right-2 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-[#b8d4e8] text-[#4a7c9b] hover:bg-[#9fc5de] hover:text-[#3a6a87] transition-colors shadow-sm"
              aria-label="Dismiss tooltip"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="px-4 py-3 text-sm text-[#3a6a87] leading-relaxed">
              {content}
            </div>

            <div className={getPointerStyles()} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
