"use client";
import React, {
  useMemo, useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle
} from "react";
import { motion } from "framer-motion";
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
  const cardApiRef = useRef(null);

  const next = useCallback(() => setI(p => (p + 1) % Math.max(total, 1)), [total]);
  const prev = useCallback(() => setI(p => (p - 1 + Math.max(total, 1)) % Math.max(total, 1)), [total]);

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
      <div className="text-center text-sm text-[var(--muted-foreground)]">
        No flashcards available.
      </div>
    );
  }

  const [num, tuple] = cards[i];

  return (
    <>
      <style jsx global>{`.mjx-container svg { max-width: 100%; height: auto; }`}</style>

      <div className="mx-auto w-full max-w-5xl">
        <FlipCard ref={cardApiRef} num={num} tuple={tuple} />

        {/* Prev / Next — never keep focus */}
        <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          tabIndex={-1}
          onPointerDown={(e) => e.preventDefault()}
          onMouseUp={(e) => e.currentTarget.blur()}
          onClick={prev}
          className="rounded-full bg-[var(--primary)] px-6 py-2 text-sm font-semibold text-[var(--primary-contrast)] hover:opacity-90 transition shadow-sm select-none cursor-pointer"
          aria-label="Previous"
          title="Previous (←)"
        >
          ← Previous
        </button>
        
        <span className="text-sm text-[var(--muted-foreground)]">
          {i + 1} / {total}
        </span>
        
        <button
          type="button"
          tabIndex={-1}
          onPointerDown={(e) => e.preventDefault()}
          onMouseUp={(e) => e.currentTarget.blur()}
          onClick={next}
          className="rounded-full bg-[var(--primary)] px-6 py-2 text-sm font-semibold text-[var(--primary-contrast)] hover:opacity-90 transition shadow-sm select-none cursor-pointer"
          aria-label="Next"
          title="Next (→)"
        >
          Next →
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
    stiffness: 260,
    damping: 20,
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
        className="relative h-[24rem] sm:h-[26rem] w-full rounded-2xl shadow-lg overflow-hidden"
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
          className="absolute inset-0 bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/80 p-8 flex flex-col justify-center items-center"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
          animate={{
            opacity: showBack ? 0 : 1,
            scale: showBack ? 0.9 : 1,
          }}
          transition={{
            opacity: { duration: 0.2, delay: showBack ? 0 : 0.15 },
            scale: springConfig,
          }}
        >
          <div className="w-full max-w-2xl text-center">
            <div className="mb-6 inline-block px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm">
              <span className="text-sm font-semibold text-white/90">Question {num}</span>
            </div>

            <div className="flex-1 flex items-center justify-center mb-8">
              <MathJax dynamic>
                <p className="text-2xl sm:text-3xl font-bold text-white leading-relaxed whitespace-pre-wrap">
                  {question}
                </p>
              </MathJax>
            </div>

            <div className="flex items-center justify-center gap-2 text-white/70 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <span>Click or press Space to reveal answer</span>
            </div>
          </div>
        </motion.div>

        {/* Back face - Answer (counter-rotated to fix mirroring) */}
        <motion.div
          className="absolute inset-0 bg-[var(--surface-2)] p-8 flex flex-col"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
          animate={{
            opacity: showBack ? 1 : 0,
            scale: showBack ? 1 : 0.9,
          }}
          transition={{
            opacity: { duration: 0.2, delay: showBack ? 0.15 : 0 },
            scale: springConfig,
          }}
        >
          {/* Counter-rotate content to fix mirroring */}
          <div className="w-full h-full flex flex-col" style={{ transform: "rotateY(180deg)" }}>
            <div className="mb-4 inline-block self-start px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="text-sm font-semibold text-green-600 dark:text-green-400">Answer</span>
            </div>

            {/* ANSWER: centered and prominent */}
            <div className="flex-1 flex flex-col justify-center items-center text-center mb-6 overflow-y-auto">
              <MathJax dynamic>
                <p className="text-xl sm:text-2xl font-semibold text-[var(--foreground)] leading-relaxed whitespace-pre-wrap max-w-2xl">
                  {answer}
                </p>
              </MathJax>
            </div>

            {/* EXPLANATION: styled as a callout */}
            {explanation && (
              <div className="mt-auto p-4 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-[var(--primary)] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <div className="text-xs font-semibold text-[var(--primary)] mb-1">Explanation</div>
                    <MathJax dynamic>
                      <p className="text-sm text-[var(--muted-foreground)] leading-relaxed whitespace-pre-wrap">
                        {explanation}
                      </p>
                    </MathJax>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center justify-center gap-2 text-[var(--muted-foreground)] text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <span>Click or press Space to flip back</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
});
