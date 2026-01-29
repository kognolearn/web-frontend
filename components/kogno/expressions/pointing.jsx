export default function pointingExpression(colors) {
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
        <circle cx="78" cy="88" r="6" fill={colors.eye} />
        <circle cx="122" cy="88" r="6" fill={colors.eye} />
      </>
    ),
    brows: (
      <>
        <path d="M66 74 Q80 68 94 76" {...thinLine} fill="none" />
        <path d="M106 76 Q120 68 134 74" {...thinLine} fill="none" />
      </>
    ),
    mouth: <path d="M88 116 Q100 120 112 116" {...line} fill="none" />,
    extras: (
      <>
        <path d="M168 98 L184 94" {...thinLine} fill="none" />
        <circle cx="188" cy="93" r="4" fill={colors.accent} />
      </>
    ),
    arms: {
      left: <path d="M72 124 C58 134 48 146 44 160" {...line} fill="none" />,
      right: (
        <>
          <path d="M128 118 C150 108 170 104 186 100" {...line} fill="none" />
          <path d="M186 100 L194 98" {...line} fill="none" />
        </>
      ),
    },
  };
}
