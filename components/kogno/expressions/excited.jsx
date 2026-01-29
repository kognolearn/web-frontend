export default function excitedExpression(colors) {
  const line = {
    stroke: colors.line,
    strokeWidth: 6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  return {
    eyes: (
      <>
        <circle cx="78" cy="88" r="8" fill={colors.eye} />
        <circle cx="122" cy="88" r="8" fill={colors.eye} />
        <circle cx="74" cy="84" r="2" fill="#fff" opacity={0.7} />
        <circle cx="118" cy="84" r="2" fill="#fff" opacity={0.7} />
      </>
    ),
    brows: (
      <>
        <path d="M64 74 Q78 64 94 70" {...line} fill="none" />
        <path d="M106 70 Q122 64 138 74" {...line} fill="none" />
      </>
    ),
    mouth: (
      <>
        <ellipse cx="100" cy="118" rx="14" ry="12" fill={colors.mouth} />
        <ellipse cx="100" cy="122" rx="6" ry="4" fill="#fff" opacity={0.25} />
      </>
    ),
    extras: (
      <>
        <circle cx="64" cy="108" r="6" fill={colors.cheek} />
        <circle cx="136" cy="108" r="6" fill={colors.cheek} />
        <path d="M150 56 L158 48" {...line} fill="none" />
        <path d="M152 68 L164 66" {...line} fill="none" />
      </>
    ),
    arms: {
      left: <path d="M68 118 C52 100 44 82 46 62" {...line} fill="none" />,
      right: <path d="M132 118 C148 100 156 82 154 62" {...line} fill="none" />,
    },
  };
}
