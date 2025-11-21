"use client";
import React, {
  useMemo, useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle
} from "react";

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
          className="absolute inset-0 p-6 flex flex-col min-h-0"
          style={{ transform: `rotateY(${angle}deg)` }}
        >
          {showBack ? (
            <>
              <div className="mb-2 text-sm font-semibold text-[var(--foreground)]">Answer</div>

              {/* ANSWER: allow vertical scroll if long */}
              <div className="flex-1 overflow-y-auto min-h-0 mb-3 text-[var(--foreground)]">
                <p className="text-base leading-relaxed whitespace-pre-wrap">{answer}</p>
              </div>

              {/* EXPLANATION: usually short (no scroll) */}
              {explanation && (
                <div className="mt-auto pt-3 border-t border-[var(--border)]">
                  <p className="text-xs text-[var(--muted-foreground)] whitespace-pre-wrap">
                    {explanation}
                  </p>
                </div>
              )}

              <div className="mt-3 pt-2 text-xs text-[var(--muted-foreground)] text-center">
                Press Space to flip back
              </div>
            </>
          ) : (
            <>
              <div className="mb-2 text-sm font-semibold text-[var(--foreground)]">
                Question {num}
              </div>

              {/* QUESTION: no scroll by default */}
              <div className="flex-1 overflow-y-auto min-h-0 mb-3">
                <p className="text-lg font-medium text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                  {question}
                </p>
              </div>

              <div className="mt-auto pt-3 text-xs text-[var(--muted-foreground)] text-center">
                Click or press Space to flip
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
