"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const REASONING_THOUGHTS = [
  // Analyzing course materials
  "Parsing syllabus structure...",
  "Extracting key concepts from materials...",
  "Identifying core learning objectives...",
  "Analyzing prerequisite relationships...",
  "Mapping concept dependencies...",
  "Detecting topic hierarchies...",

  // Understanding the course
  "Understanding course scope and depth...",
  "Evaluating topic complexity levels...",
  "Identifying foundational concepts...",
  "Recognizing advanced topics...",
  "Analyzing breadth vs depth tradeoffs...",
  "Determining essential vs supplementary content...",

  // Bloom's taxonomy analysis
  "Classifying topics by Bloom's taxonomy...",
  "Identifying remember-level concepts...",
  "Detecting application-level skills...",
  "Finding analysis-level objectives...",
  "Mapping evaluation-level competencies...",
  "Locating synthesis opportunities...",

  // Exam relevance
  "Predicting exam-relevant topics...",
  "Weighing topic importance for assessments...",
  "Identifying high-yield concepts...",
  "Analyzing historical exam patterns...",
  "Detecting commonly tested material...",
  "Prioritizing by exam likelihood...",

  // Building the structure
  "Grouping related concepts into modules...",
  "Organizing topics by logical progression...",
  "Sequencing for optimal learning flow...",
  "Building prerequisite chains...",
  "Creating coherent learning paths...",
  "Structuring module boundaries...",

  // Refining and optimizing
  "Eliminating redundant topics...",
  "Consolidating overlapping concepts...",
  "Balancing module sizes...",
  "Optimizing topic granularity...",
  "Ensuring comprehensive coverage...",
  "Validating topic completeness...",

  // Time estimation
  "Estimating study time per topic...",
  "Calculating cognitive load distribution...",
  "Balancing difficulty across modules...",
  "Optimizing for retention intervals...",
  "Factoring in practice problem time...",

  // Cross-referencing
  "Cross-referencing with course standards...",
  "Validating against learning outcomes...",
  "Checking alignment with objectives...",
  "Verifying curriculum coverage...",
  "Matching to competency frameworks...",

  // Final processing
  "Ranking topics by importance...",
  "Finalizing module organization...",
  "Generating topic descriptions...",
  "Preparing study recommendations...",
  "Compiling final topic list...",
  "Assembling your personalized curriculum...",
];

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function ReasoningLoader({ className = "" }) {
  const [thoughts, setThoughts] = useState([]);
  const [shuffledQueue, setShuffledQueue] = useState([]);
  const queueIndexRef = useRef(0);
  const containerRef = useRef(null);

  // Initialize shuffled queue
  useEffect(() => {
    setShuffledQueue(shuffleArray(REASONING_THOUGHTS));
  }, []);

  // Add new thoughts periodically
  useEffect(() => {
    if (shuffledQueue.length === 0) return;

    // Add first thought immediately
    if (thoughts.length === 0) {
      setThoughts([shuffledQueue[0]]);
      queueIndexRef.current = 1;
    }

    const addNextThought = () => {
      const nextIndex = queueIndexRef.current;

      if (nextIndex >= shuffledQueue.length) {
        // Reshuffle and start over
        const newQueue = shuffleArray(REASONING_THOUGHTS);
        setShuffledQueue(newQueue);
        queueIndexRef.current = 0;
        return;
      }

      setThoughts((prev) => {
        // Keep last 6 thoughts visible
        const newThoughts = [...prev, shuffledQueue[nextIndex]].slice(-6);
        return newThoughts;
      });
      queueIndexRef.current = nextIndex + 1;
    };

    // Random interval between 800ms and 2000ms
    const getRandomInterval = () => 800 + Math.random() * 1200;

    let timeoutId;
    const scheduleNext = () => {
      timeoutId = setTimeout(() => {
        addNextThought();
        scheduleNext();
      }, getRandomInterval());
    };

    scheduleNext();

    return () => clearTimeout(timeoutId);
  }, [shuffledQueue, thoughts.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [thoughts]);

  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--surface-2)] overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-1)] flex items-center gap-2">
        <div className="relative w-4 h-4">
          <div className="absolute inset-0 border-2 border-[var(--primary)]/30 rounded-full" />
          <div className="absolute inset-0 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
        <span className="text-sm font-medium text-[var(--foreground)]">Building your topic list</span>
      </div>

      {/* Reasoning thoughts */}
      <div
        ref={containerRef}
        className="p-4 space-y-2 max-h-[280px] overflow-y-auto scrollbar-thin"
      >
        <AnimatePresence mode="popLayout">
          {thoughts.map((thought, index) => {
            const isLatest = index === thoughts.length - 1;
            const opacity = isLatest ? 1 : 0.4 + (index / thoughts.length) * 0.4;

            return (
              <motion.div
                key={`${thought}-${index}`}
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex items-start gap-2"
              >
                <span
                  className={`text-xs mt-0.5 ${
                    isLatest ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
                  }`}
                >
                  {isLatest ? "●" : "○"}
                </span>
                <span
                  className={`text-sm font-mono ${
                    isLatest
                      ? "text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)]"
                  }`}
                >
                  {thought}
                </span>
                {isLatest && (
                  <motion.span
                    className="inline-block w-1.5 h-4 bg-[var(--primary)] ml-0.5"
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--surface-muted)]">
        <p className="text-xs text-[var(--muted-foreground)] text-center">
          This usually takes 15-30 seconds
        </p>
      </div>
    </div>
  );
}
