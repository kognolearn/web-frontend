export default function wavingExpression(colors) {
  const line = {
    stroke: colors.line,
    strokeWidth: 6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const thinLine = {
    ...line,
    strokeWidth: 4,
    opacity: 0.7,
  };

  return {
    eyes: (
      <>
        <path d="M70 88 Q78 80 86 88" {...line} fill="none" />
        <path d="M114 88 Q122 80 130 88" {...line} fill="none" />
      </>
    ),
    brows: (
      <>
        <path d="M66 72 Q78 66 92 72" {...thinLine} fill="none" />
        <path d="M108 72 Q122 66 136 72" {...thinLine} fill="none" />
      </>
    ),
    mouth: <path d="M80 112 Q100 126 120 112" {...line} fill="none" />,
    extras: (
      <>
        <path d="M172 58 Q182 48 194 46" {...thinLine} fill="none" />
        <path d="M170 74 Q184 66 196 66" {...thinLine} fill="none" />
      </>
    ),
    arms: {
      left: <path d="M72 124 C58 136 50 150 46 162" {...line} fill="none" />,
      right: <path d="M130 116 C150 96 164 74 170 54" {...line} fill="none" />,
    },
  };
}
