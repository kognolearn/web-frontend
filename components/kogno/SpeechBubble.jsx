"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

const DEFAULT_MAX_WIDTH = 320;
const DEFAULT_PADDING = 12;
const DEFAULT_OFFSET = 14;
const DEFAULT_POINTER_SIZE = 14;
const DEFAULT_TYPE_SPEED = 22;

const PLACEMENT_FALLBACK = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function SpeechBubble({
  anchorRef,
  show = true,
  text = "",
  children,
  header,
  footer,
  placement = "top",
  offset = DEFAULT_OFFSET,
  viewportPadding = DEFAULT_PADDING,
  maxWidth = DEFAULT_MAX_WIDTH,
  pointerSize = DEFAULT_POINTER_SIZE,
  typewriter = true,
  typewriterSpeed = DEFAULT_TYPE_SPEED,
  className = "",
  bubbleClassName = "",
  textClassName = "",
  portal = true,
  onTypewriterDone,
}) {
  const bubbleRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    placement,
    pointerOffset: 0,
  });
  const [displayText, setDisplayText] = useState(text);

  const shouldUseTypewriter = typewriter && typeof text === "string" && children == null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!show) return;
    if (!shouldUseTypewriter) {
      setDisplayText(text);
      return;
    }
    let index = 0;
    setDisplayText("");
    const id = setInterval(() => {
      index += 1;
      const nextValue = text.slice(0, index);
      setDisplayText(nextValue);
      if (index >= text.length) {
        clearInterval(id);
        if (onTypewriterDone) onTypewriterDone();
      }
    }, typewriterSpeed);

    return () => clearInterval(id);
  }, [text, show, shouldUseTypewriter, typewriterSpeed, onTypewriterDone]);

  const placementsToTry = useMemo(() => {
    const fallback = PLACEMENT_FALLBACK[placement] || "top";
    const all = [placement, fallback, "top", "bottom", "left", "right"];
    return Array.from(new Set(all));
  }, [placement]);

  const computePosition = useCallback(() => {
    const anchorEl = anchorRef?.current;
    const bubbleEl = bubbleRef.current;
    if (!anchorEl || !bubbleEl) return;

    const anchorRect = anchorEl.getBoundingClientRect();
    const bubbleRect = bubbleEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const anchorCenterX = anchorRect.left + anchorRect.width / 2;
    const anchorCenterY = anchorRect.top + anchorRect.height / 2;

    const computeCoords = (candidatePlacement) => {
      let top = 0;
      let left = 0;
      if (candidatePlacement === "top") {
        top = anchorRect.top - offset - bubbleRect.height;
        left = anchorCenterX - bubbleRect.width / 2;
      } else if (candidatePlacement === "bottom") {
        top = anchorRect.bottom + offset;
        left = anchorCenterX - bubbleRect.width / 2;
      } else if (candidatePlacement === "left") {
        top = anchorCenterY - bubbleRect.height / 2;
        left = anchorRect.left - offset - bubbleRect.width;
      } else {
        top = anchorCenterY - bubbleRect.height / 2;
        left = anchorRect.right + offset;
      }

      const fits =
        top >= viewportPadding &&
        left >= viewportPadding &&
        top + bubbleRect.height <= viewportHeight - viewportPadding &&
        left + bubbleRect.width <= viewportWidth - viewportPadding;

      return { top, left, fits };
    };

    let resolvedPlacement = placement;
    let coords = computeCoords(placement);
    if (!coords.fits) {
      for (const candidate of placementsToTry) {
        const candidateCoords = computeCoords(candidate);
        if (candidateCoords.fits) {
          coords = candidateCoords;
          resolvedPlacement = candidate;
          break;
        }
      }
    }

    const clampedLeft = clamp(
      coords.left,
      viewportPadding,
      viewportWidth - bubbleRect.width - viewportPadding
    );
    const clampedTop = clamp(
      coords.top,
      viewportPadding,
      viewportHeight - bubbleRect.height - viewportPadding
    );

    let pointerOffset = 0;
    const pointerInset = pointerSize * 0.6;

    if (resolvedPlacement === "top" || resolvedPlacement === "bottom") {
      pointerOffset = clamp(
        anchorCenterX - clampedLeft,
        pointerInset,
        bubbleRect.width - pointerInset
      );
    } else {
      pointerOffset = clamp(
        anchorCenterY - clampedTop,
        pointerInset,
        bubbleRect.height - pointerInset
      );
    }

    setPosition({
      top: clampedTop,
      left: clampedLeft,
      placement: resolvedPlacement,
      pointerOffset,
    });
  }, [anchorRef, offset, placement, placementsToTry, pointerSize, viewportPadding]);

  useLayoutEffect(() => {
    if (!show) return;
    computePosition();
  }, [show, computePosition, text, children]);

  useEffect(() => {
    if (!show) return undefined;

    const handleUpdate = () => {
      requestAnimationFrame(computePosition);
    };

    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(handleUpdate);
      if (anchorRef?.current) resizeObserver.observe(anchorRef.current);
      if (bubbleRef.current) resizeObserver.observe(bubbleRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [show, computePosition, anchorRef]);

  const pointerStyle = useMemo(() => {
    const base = {
      width: pointerSize,
      height: pointerSize,
      background: "var(--surface-1)",
      border: "1px solid var(--border)",
      transform: "rotate(45deg)",
    };

    if (position.placement === "top") {
      return {
        ...base,
        left: position.pointerOffset - pointerSize / 2,
        bottom: -pointerSize / 2,
      };
    }
    if (position.placement === "bottom") {
      return {
        ...base,
        left: position.pointerOffset - pointerSize / 2,
        top: -pointerSize / 2,
      };
    }
    if (position.placement === "left") {
      return {
        ...base,
        top: position.pointerOffset - pointerSize / 2,
        right: -pointerSize / 2,
      };
    }
    return {
      ...base,
      top: position.pointerOffset - pointerSize / 2,
      left: -pointerSize / 2,
    };
  }, [pointerSize, position]);

  const bubble = (
    <AnimatePresence>
      {show && (
        <motion.div
          ref={bubbleRef}
          className={`fixed z-[9999] ${className}`}
          style={{
            top: position.top,
            left: position.left,
            maxWidth,
          }}
          initial={{ opacity: 0, scale: 0.96, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <div
            className={`relative rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-sm leading-relaxed text-[var(--foreground)] shadow-xl shadow-black/10 ${bubbleClassName}`}
          >
            <span
              className="absolute block"
              style={pointerStyle}
              aria-hidden="true"
            />
            <div className="relative z-10 flex flex-col gap-3">
              {header ? <div>{header}</div> : null}
              <div className={`text-sm leading-relaxed text-[var(--foreground)] ${textClassName}`}>
                {children ?? displayText}
                {shouldUseTypewriter && displayText.length < text.length && (
                  <span className="inline-block h-3 w-2 translate-y-0.5 animate-pulse rounded-sm bg-[var(--foreground)]/50" />
                )}
              </div>
              {footer ? <div>{footer}</div> : null}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (portal && mounted && typeof document !== "undefined") {
    return createPortal(bubble, document.body);
  }

  return bubble;
}
