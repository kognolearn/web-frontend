"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Simple hover tooltip for icons/buttons
 * Now with viewport-aware positioning to prevent going off-screen
 */
export default function Tooltip({ children, content, text, position = "top", className = "" }) {
  const [isVisible, setIsVisible] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);
  const tooltipText = content || text;

  // Check if tooltip would go off-screen and adjust position
  const checkBounds = useCallback(() => {
    if (!containerRef.current || !tooltipRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const padding = 8; // Minimum distance from viewport edge
    
    let newPosition = position;
    
    // Check each position and adjust if needed
    if (position === "top" && containerRect.top - tooltipRect.height < padding) {
      newPosition = "bottom";
    } else if (position === "bottom" && containerRect.bottom + tooltipRect.height > window.innerHeight - padding) {
      newPosition = "top";
    } else if (position === "left" && containerRect.left - tooltipRect.width < padding) {
      newPosition = "right";
    } else if (position === "right" && containerRect.right + tooltipRect.width > window.innerWidth - padding) {
      newPosition = "left";
    }
    
    // Additional check: if horizontal tooltip would go off top/bottom, center it
    if (newPosition !== adjustedPosition) {
      setAdjustedPosition(newPosition);
    }
  }, [position, adjustedPosition]);

  useEffect(() => {
    if (isVisible) {
      // Small delay to let the tooltip render before checking bounds
      const timer = setTimeout(checkBounds, 0);
      return () => clearTimeout(timer);
    } else {
      // Reset to original position when hidden
      setAdjustedPosition(position);
    }
  }, [isVisible, checkBounds, position]);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && tooltipText && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-[100] px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)] shadow-lg whitespace-nowrap pointer-events-none ${positionClasses[adjustedPosition]}`}
          >
            {tooltipText}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Small info icon with tooltip - for inline help
 * Now with viewport-aware positioning
 */
export function InfoTooltip({ content, position = "top", size = "sm" }) {
  const [isVisible, setIsVisible] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);

  const sizeClasses = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  // Check bounds and adjust position
  const checkBounds = useCallback(() => {
    if (!containerRef.current || !tooltipRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const padding = 8;
    
    let newPosition = position;
    
    if (position === "top" && containerRect.top - tooltipRect.height < padding) {
      newPosition = "bottom";
    } else if (position === "bottom" && containerRect.bottom + tooltipRect.height > window.innerHeight - padding) {
      newPosition = "top";
    } else if (position === "left" && containerRect.left - tooltipRect.width < padding) {
      newPosition = "right";
    } else if (position === "right" && containerRect.right + tooltipRect.width > window.innerWidth - padding) {
      newPosition = "left";
    }
    
    if (newPosition !== adjustedPosition) {
      setAdjustedPosition(newPosition);
    }
  }, [position, adjustedPosition]);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(checkBounds, 0);
      return () => clearTimeout(timer);
    } else {
      setAdjustedPosition(position);
    }
  }, [isVisible, checkBounds, position]);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex cursor-help"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <svg
        className={`${sizeClasses[size]} text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-[100] w-64 px-3 py-2 text-xs rounded-lg bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)] shadow-lg ${positionClasses[adjustedPosition]}`}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
