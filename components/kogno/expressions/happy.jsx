export default function happyExpression(colors) {
  const line = {
    stroke: colors.line,
    strokeWidth: 6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
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
        <path d="M66 72 Q78 66 92 72" {...line} fill="none" opacity={0.6} />
        <path d="M108 72 Q122 66 136 72" {...line} fill="none" opacity={0.6} />
      </>
    ),
    mouth: <path d="M78 110 Q100 134 122 110" {...line} fill="none" />,
    extras: (
      <>
        <circle cx="66" cy="106" r="6" fill={colors.cheek} />
        <circle cx="134" cy="106" r="6" fill={colors.cheek} />
      </>
    ),
    arms: {
      left: <path d="M72 120 C54 112 40 100 36 86" {...line} fill="none" />,
      right: <path d="M128 120 C146 112 160 100 164 86" {...line} fill="none" />,
    },
  };
}
