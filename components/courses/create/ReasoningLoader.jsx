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

export default function ReasoningLoader({ className = "", completed = false }) {
  const [currentThought, setCurrentThought] = useState("");
  const [shuffledQueue, setShuffledQueue] = useState([]);
  const queueIndexRef = useRef(0);

  // Initialize shuffled queue
  useEffect(() => {
    const shuffled = shuffleArray(REASONING_THOUGHTS);
    setShuffledQueue(shuffled);
    setCurrentThought(shuffled[0]);
  }, []);

  // Cycle through thoughts periodically (only when not completed)
  useEffect(() => {
    if (shuffledQueue.length === 0 || completed) return;

    const showNextThought = () => {
      queueIndexRef.current = (queueIndexRef.current + 1) % shuffledQueue.length;

      // Reshuffle when we've gone through all thoughts
      if (queueIndexRef.current === 0) {
        const newQueue = shuffleArray(REASONING_THOUGHTS);
        setShuffledQueue(newQueue);
        setCurrentThought(newQueue[0]);
      } else {
        setCurrentThought(shuffledQueue[queueIndexRef.current]);
      }
    };

    // Slower interval: 2500-4000ms
    const interval = setInterval(showNextThought, 2500 + Math.random() * 1500);

    return () => clearInterval(interval);
  }, [shuffledQueue, completed]);

  if (completed) {
    return (
      <div className={`rounded-xl border border-[var(--border)] bg-[var(--surface-2)] overflow-hidden ${className}`}>
        <div className="px-4 py-3 flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[var(--primary)] flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-sm font-medium text-[var(--foreground)]">Completed building your topic list</span>
        </div>
      </div>
    );
  }

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

      {/* Reasoning thought */}
      <div className="p-4 h-14 flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentThought}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="flex items-center gap-2"
          >
            <span className="text-xs text-[var(--primary)]">●</span>
            <span className="text-sm font-mono text-[var(--foreground)]">
              {currentThought}
            </span>
            <motion.span
              className="inline-block w-1.5 h-4 bg-[var(--primary)] ml-0.5"
              animate={{ opacity: [1, 0.3] }}
              transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
            />
          </motion.div>
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
