export default function neutralExpression(colors) {
  const line = {
    stroke: colors.line,
    strokeWidth: 6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const softLine = {
    ...line,
    strokeWidth: 5,
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
        <path d="M68 76 Q78 70 90 74" {...softLine} fill="none" />
        <path d="M110 74 Q122 70 132 76" {...softLine} fill="none" />
      </>
    ),
    mouth: <path d="M84 114 Q100 120 116 114" {...line} fill="none" />,
    arms: {
      left: <path d="M72 122 C58 132 48 146 44 158" {...line} fill="none" />,
      right: <path d="M128 122 C142 132 152 146 156 158" {...line} fill="none" />,
    },
  };
}
