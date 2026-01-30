"use client";

import { motion } from "framer-motion";
import KognoSprite from "./KognoSprite";

const DEFAULT_SIZE = "clamp(140px, 18vw, 240px)";

export default function KognoCharacter({
  expression = "neutral",
  size = DEFAULT_SIZE,
  className = "",
  spriteClassName = "",
  style,
  floating = true,
  showShadow = true,
  ariaLabel = "Kogno",
  ...props
}) {
  const resolvedSize = typeof size === "number" ? `${size}px` : size;
  const wrapperStyle = {
    "--kogno-size": resolvedSize,
    width: "var(--kogno-size)",
    ...style,
  };

  const floatAnimation = floating
    ? { y: [0, -6, 0], rotate: [0, 1.2, 0] }
    : undefined;
  const floatTransition = floating
    ? { duration: 5.6, repeat: Infinity, ease: "easeInOut" }
    : undefined;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={wrapperStyle}
      {...props}
    >
      {showShadow && (
        <div
          className="absolute -bottom-3 left-1/2 h-4 w-2/3 -translate-x-1/2 rounded-full blur-md"
          style={{ background: "rgba(0, 0, 0, 0.18)" }}
          aria-hidden="true"
        />
      )}
      <motion.div
        animate={floatAnimation}
        transition={floatTransition}
        className="w-full"
        style={{ transformOrigin: "50% 70%" }}
      >
        <KognoSprite
          expression={expression}
          className={`w-full ${spriteClassName}`}
          ariaLabel={ariaLabel}
          ariaHidden={!ariaLabel}
        />
      </motion.div>
    </div>
  );
}
