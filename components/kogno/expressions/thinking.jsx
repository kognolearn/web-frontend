export default function thinkingExpression(colors) {
  const line = {
    stroke: colors.line,
    strokeWidth: 6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const thinLine = {
    ...line,
    strokeWidth: 4,
    opacity: 0.75,
  };

  return {
    eyes: (
      <>
        <circle cx="76" cy="88" r="6" fill={colors.eye} />
        <path d="M114 88 Q122 84 130 88" {...line} fill="none" />
      </>
    ),
    brows: (
      <>
        <path d="M64 74 Q78 66 92 72" {...thinLine} fill="none" />
        <path d="M108 68 Q124 60 140 68" {...thinLine} fill="none" />
      </>
    ),
    mouth: <path d="M86 116 Q100 112 114 116" {...line} fill="none" />,
    extras: (
      <>
        <circle cx="148" cy="50" r="8" fill={colors.bodyLight} stroke={colors.line} strokeWidth={2} />
        <circle cx="160" cy="36" r="4" fill={colors.bodyLight} stroke={colors.line} strokeWidth={2} />
      </>
    ),
    arms: {
      left: <path d="M70 124 C60 128 54 122 58 112" {...line} fill="none" />,
      right: <path d="M128 124 C144 134 154 148 158 162" {...line} fill="none" />,
    },
  };
}
