"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import neutralExpression from "./expressions/neutral";
import happyExpression from "./expressions/happy";
import pointingExpression from "./expressions/pointing";
import excitedExpression from "./expressions/excited";
import thinkingExpression from "./expressions/thinking";
import wavingExpression from "./expressions/waving";

const EXPRESSIONS = {
  neutral: neutralExpression,
  happy: happyExpression,
  pointing: pointingExpression,
  excited: excitedExpression,
  thinking: thinkingExpression,
  waving: wavingExpression,
};

const DEFAULT_COLORS = {
  body: "var(--primary)",
  bodyLight: "rgba(var(--primary-rgb), 0.22)",
  bodyShadow: "rgba(0, 0, 0, 0.12)",
  eye: "var(--foreground)",
  mouth: "var(--foreground)",
  line: "var(--foreground)",
  cheek: "rgba(var(--primary-rgb), 0.35)",
  accent: "rgba(var(--primary-rgb), 0.7)",
};

export default function KognoSprite({
  expression = "neutral",
  className = "",
  colors: colorOverrides = {},
  ariaLabel = "Kogno",
  ariaHidden = false,
  ...props
}) {
  const gradientId = useId();
  const colors = { ...DEFAULT_COLORS, ...colorOverrides };
  const expressionFn = EXPRESSIONS[expression] || EXPRESSIONS.neutral;
  const expressionDef = expressionFn(colors);

  const blinkAnimation = {
    scaleY: [1, 1, 0.15, 1, 1],
    transition: {
      duration: 4.2,
      times: [0, 0.45, 0.5, 0.55, 1],
      repeat: Infinity,
      repeatDelay: 2.4,
      ease: "easeInOut",
    },
  };

  const ariaProps = ariaHidden
    ? { "aria-hidden": true }
    : { role: "img", "aria-label": ariaLabel };

  return (
    <svg
      viewBox="0 0 200 220"
      className={`block h-auto w-full ${className}`}
      {...ariaProps}
      {...props}
    >
      {!ariaHidden && ariaLabel ? <title>{ariaLabel}</title> : null}
      <defs>
        <radialGradient id={gradientId} cx="30%" cy="20%" r="80%">
          <stop offset="0%" stopColor={colors.bodyLight} />
          <stop offset="65%" stopColor={colors.body} />
          <stop offset="100%" stopColor={colors.bodyShadow} />
        </radialGradient>
      </defs>
      <g>
        <path
          d="M100 18 C136 18 168 40 172 78 C176 118 170 176 130 196 C107 208 93 208 70 196 C30 176 24 118 28 78 C32 40 64 18 100 18 Z"
          fill={`url(#${gradientId})`}
          stroke={colors.bodyShadow}
          strokeWidth="2"
        />
        <ellipse cx="78" cy="70" rx="36" ry="22" fill={colors.bodyLight} opacity="0.7" />
        <ellipse cx="122" cy="150" rx="38" ry="20" fill={colors.bodyShadow} opacity="0.12" />
      </g>
      <g>
        {expressionDef.arms?.left}
        {expressionDef.arms?.right}
      </g>
      <g>
        {expressionDef.extrasBack}
      </g>
      <motion.g
        animate={blinkAnimation}
        style={{ transformOrigin: "center", transformBox: "fill-box" }}
      >
        {expressionDef.eyes}
      </motion.g>
      {expressionDef.brows}
      {expressionDef.mouth}
      {expressionDef.extras}
    </svg>
  );
}
