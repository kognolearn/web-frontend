"use client";
import React, {
  useMemo, useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MathJax } from "better-react-mathjax";

/** data: { "1": [question, answer, explanation, _ignored], ... } */
export default function FlashcardDeck({ data = {}, onCardChange }) {
  const cards = useMemo(
    () =>
      Object.entries(data)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([num, arr]) => [num, [arr?.[0] || "", arr?.[1] || "", arr?.[2] || ""]]),
    [data]
  );

  const total = cards.length;
  const [i, setI] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for prev, 1 for next
  const cardApiRef = useRef(null);

  const next = useCallback(() => {
    setDirection(1);
    setI(p => (p + 1) % Math.max(total, 1));
  }, [total]);
  
  const prev = useCallback(() => {
    setDirection(-1);
    setI(p => (p - 1 + Math.max(total, 1)) % Math.max(total, 1));
  }, [total]);

  // Notify parent when card changes
  useEffect(() => {
    if (onCardChange && cards[i]) {
      const [num, tuple] = cards[i];
      onCardChange({
        index: i,
        number: num,
        question: tuple[0],
        answer: tuple[1],
        explanation: tuple[2],
        total: total
      });
    }
  }, [i, cards, total, onCardChange]);

  // global keys (no focus required)
  useEffect(() => {
    function onKey(e) {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable;
      if (typing) return;

      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        cardApiRef.current?.flip?.();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  if (!total) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p className="text-[var(--muted-foreground)]">No flashcards available.</p>
      </div>
    );
  }

  const [num, tuple] = cards[i];

  // Swipe animation variants
  const slideVariants = {
    enter: (dir) => ({
      x: dir > 0 ? 200 : -200,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir) => ({
      x: dir > 0 ? -200 : 200,
      opacity: 0,
      scale: 0.95,
    }),
  };

  return (
    <>
      <style jsx global>{`.mjx-container svg { max-width: 100%; height: auto; }`}</style>

      <div className="mx-auto w-full max-w-3xl flex flex-col items-center justify-center min-h-[50vh] py-8">
        {/* Progress indicator */}
        <div className="w-full mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Card {i + 1} of {total}
            </span>
            <span className="text-xs text-[var(--muted-foreground)]">
              Press Space to flip
            </span>
          </div>
          <div className="h-1 bg-[var(--surface-2)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--primary)] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${((i + 1) / total) * 100}%` }}
            />
          </div>
          {/* Card dots */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {cards.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setDirection(idx > i ? 1 : -1);
                  setI(idx);
                }}
                className={`w-2 h-2 rounded-full transition-all duration-200 cursor-pointer ${
                  idx === i 
                    ? "bg-[var(--primary)] ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--background)]" 
                    : "bg-[var(--surface-2)] hover:bg-[var(--primary)]/50"
                } hover:scale-125`}
                aria-label={`Go to card ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="w-full relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={i}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 400, damping: 30 },
                opacity: { duration: 0.15 },
                scale: { duration: 0.15 },
              }}
            >
              <FlipCard ref={cardApiRef} num={num} tuple={tuple} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between w-full max-w-md">
          <button
            type="button"
            tabIndex={-1}
            onPointerDown={(e) => e.preventDefault()}
            onMouseUp={(e) => e.currentTarget.blur()}
            onClick={prev}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors select-none cursor-pointer"
            aria-label="Previous"
            title="Previous (←)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>
          
          <button
            type="button"
            tabIndex={-1}
            onPointerDown={(e) => e.preventDefault()}
            onMouseUp={(e) => e.currentTarget.blur()}
            onClick={() => cardApiRef.current?.flip?.()}
            className="px-6 py-2.5 rounded-lg bg-[var(--primary)] text-sm font-semibold text-white hover:opacity-90 transition-colors shadow-sm select-none cursor-pointer"
            aria-label="Flip card"
            title="Flip (Space)"
          >
            Flip Card
          </button>
          
          <button
            type="button"
            tabIndex={-1}
            onPointerDown={(e) => e.preventDefault()}
            onMouseUp={(e) => e.currentTarget.blur()}
            onClick={next}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors select-none cursor-pointer"
            aria-label="Next"
            title="Next (→)"
          >
            Next
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

/* ------------ Horizontal flip with Framer Motion: smooth spring physics ------------ */
const FlipCard = forwardRef(function FlipCard({ num, tuple }, ref) {
  const [question, answer, explanation] = tuple ?? ["", "", ""];
  const [showBack, setShowBack] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // expose a safe flip() to the parent
  useImperativeHandle(ref, () => ({
    flip: () => {
      if (isAnimating) return false; // already flipping, ignore
      setIsAnimating(true);
      setShowBack((v) => !v);
      return true;
    },
    isAnimating: () => isAnimating,
  }));

  // when card index changes, snap to front + clear any anim state
  useEffect(() => {
    setShowBack(false);
    setIsAnimating(false);
  }, [num]);

  const handleClick = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setShowBack((v) => !v);
  };

  // Spring configuration for smooth, organic flip
  const springConfig = {
    type: "spring",
    stiffness: 300,
    damping: 25,
    mass: 0.8
  };

  return (
    <div
      role="button"
      aria-label={showBack ? "Show question" : "Reveal answer"}
      onClick={handleClick}
      className="relative w-full"
      style={{ perspective: "1200px" }}
    >
      <motion.div
        className="relative h-[20rem] sm:h-[22rem] w-full rounded-2xl overflow-hidden"
        style={{
          transformStyle: "preserve-3d",
          cursor: isAnimating ? "default" : "pointer",
        }}
        animate={{
          rotateY: showBack ? 180 : 0,
        }}
        transition={springConfig}
        onAnimationStart={() => setIsAnimating(true)}
        onAnimationComplete={() => setIsAnimating(false)}
      >
        {/* Front face - Question */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-[var(--primary)] via-[var(--primary)] to-[var(--primary)]/80 p-6 sm:p-8 flex flex-col border border-[var(--primary)]/20 rounded-2xl shadow-lg"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
          animate={{
            opacity: showBack ? 0 : 1,
            scale: showBack ? 0.95 : 1,
          }}
          transition={{
            opacity: { duration: 0.15, delay: showBack ? 0 : 0.1 },
            scale: springConfig,
          }}
        >
          <div className="w-full h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm">
                <span className="text-xs font-semibold text-white/90">Card {num}</span>
              </div>
              <div className="text-white/60">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            {/* Question content */}
            <div className="flex-1 flex items-center justify-center overflow-auto">
              <MathJax dynamic>
                <p className="text-xl sm:text-2xl font-semibold text-white leading-relaxed whitespace-pre-wrap text-center">
                  {question}
                </p>
              </MathJax>
            </div>

            {/* Footer hint */}
            <div className="flex items-center justify-center gap-2 text-white/50 text-xs pt-4">
              <span>Click to reveal answer</span>
            </div>
          </div>
        </motion.div>

        {/* Back face - Answer (counter-rotated to fix mirroring) */}
        <motion.div
          className="absolute inset-0 bg-[var(--surface-1)] p-6 sm:p-8 flex flex-col border border-[var(--border)] rounded-2xl shadow-lg"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
          animate={{
            opacity: showBack ? 1 : 0,
            scale: showBack ? 1 : 0.95,
          }}
          transition={{
            opacity: { duration: 0.15, delay: showBack ? 0.1 : 0 },
            scale: springConfig,
          }}
        >
          {/* Counter-rotate content to fix mirroring */}
          <div className="w-full h-full flex flex-col" style={{ transform: "rotateY(180deg)" }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Answer</span>
              </div>
              <div className="text-emerald-500">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            {/* Answer content */}
            <div className="flex-1 flex flex-col justify-center items-center overflow-auto">
              <MathJax dynamic>
                <p className="text-lg sm:text-xl font-medium text-[var(--foreground)] leading-relaxed whitespace-pre-wrap text-center">
                  {answer}
                </p>
              </MathJax>
            </div>

            {/* Explanation callout */}
            {explanation && (
              <div className="mt-4 p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-md bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <MathJax dynamic>
                      <p className="text-sm text-[var(--muted-foreground)] leading-relaxed whitespace-pre-wrap">
                        {explanation}
                      </p>
                    </MathJax>
                  </div>
                </div>
              </div>
            )}

            {/* Footer hint */}
            <div className="flex items-center justify-center gap-2 text-[var(--muted-foreground)] text-xs pt-4">
              <span>Click to see question</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
});
