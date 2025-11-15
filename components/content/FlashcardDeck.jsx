"use client";
import React, {
  useMemo, useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle
} from "react";

/** data: { "1": [question, answer, explanation, _ignored], ... } */
export default function FlashcardDeck({ data = {} }) {
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
      <div className="rounded-2xl bg-[var(--surface-2)] p-6 text-center text-sm text-[var(--muted-foreground)] shadow">
        No flashcards available.
      </div>
    );
  }

  const [num, tuple] = cards[i];

  return (
    <div className="mx-auto w-full max-w-3xl">
      <FlipCard ref={cardApiRef} num={num} tuple={tuple} />

      {/* Prev / Next — never keep focus */}
      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          tabIndex={-1}
          onPointerDown={(e) => e.preventDefault()}
          onMouseUp={(e) => e.currentTarget.blur()}
          onClick={prev}
          className="btn btn-primary select-none"
          aria-label="Previous"
          title="Previous"
        >
          ←
        </button>
        <button
          type="button"
          tabIndex={-1}
          onPointerDown={(e) => e.preventDefault()}
          onMouseUp={(e) => e.currentTarget.blur()}
          onClick={next}
          className="btn btn-primary select-none"
          aria-label="Next"
          title="Next"
        >
          →
        </button>
      </div>
    </div>
  );
}

/* ------------ Horizontal flip: container rotates, content counter-rotates ------------ */
/* No backface-visibility. We toggle content with showBack ? BACK : FRONT. */
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

  const angle = showBack ? 180 : 0;

  const handleClick = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setShowBack((v) => !v);
  };

  const handleTransitionEnd = (e) => {
    // Only end when the rotateY finishes (not padding/margin etc)
    if (e.propertyName === "transform") {
      setIsAnimating(false);
    }
  };

  return (
    <div
      role="button"
      aria-label={showBack ? "Show question" : "Reveal answer"}
      onClick={handleClick}
      className="relative w-full"
      style={{ perspective: "1000px" }}
    >
      <div
        className="relative h-[18rem] sm:h-[20rem] w-full rounded-2xl bg-[var(--surface-2)] shadow-md overflow-hidden"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateY(${angle}deg)`,
          transition: "transform 400ms cubic-bezier(.2,.6,.2,1)",
          cursor: isAnimating ? "default" : "pointer",
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        <div
          className="absolute inset-0 p-6 flex flex-col"
          style={{ transform: `rotateY(${angle}deg)` }}
        >
          {showBack ? (
            <>
              <div className="mb-2 text-sm font-semibold text-[var(--foreground)]">Answer</div>
              <div className="text-base font-medium text-[var(--foreground)] whitespace-pre-wrap mb-3">
                {answer}
              </div>
              <div className="flex items-start gap-2 text-xs text-[var(--muted-foreground)] whitespace-pre-wrap">
                {/* <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-[2px] text-[var(--muted-foreground)] opacity-80 shrink-0"
                > 
                  <path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z" />
                </svg> */}
                <span>{explanation}</span>
              </div>
              <div className="mt-auto pt-4 text-xs text-[var(--muted-foreground)]">
                Press Space to flip back
              </div>
            </>
          ) : (
            <>
              <div className="mb-2 text-sm font-semibold text-[var(--foreground)]">
                Question {num}
              </div>
              <div className="text-base text-[var(--foreground)] whitespace-pre-wrap">
                {question}
              </div>
              <div className="mt-auto pt-4 text-xs text-[var(--muted-foreground)]">
                Click or press Space to flip
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
