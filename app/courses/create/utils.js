
export const defaultTopicRating = 2;
export const familiarityLevels = [1, 2, 3];
export const manualOverviewId = "overview_manual";
export const manualOverviewTitle = "Custom topics";

export const NEW_EXCEPTION_SCORE = 0.7;
export const CONFIDENT_EXCEPTION_SCORE = 0.3;
export const SOMEWHAT_KNOW_SCORE = 0.9;
export const SOMEWHAT_GAP_SCORE = 0.3;

export const moduleConfidenceOptions = [
  {
    id: "new",
    label: "New to me",
    emoji: "🔴",
    baseScore: 0.1,
    badgeClass: "bg-red-500/15 text-red-400",
    buttonClass: "border-red-500/40 text-red-300",
    activeClass: "bg-red-500/15 border-red-500 text-red-100",
    linkLabel: "Do you know any of these?",
  },
  {
    id: "somewhat",
    label: "Somewhat",
    emoji: "🟡",
    baseScore: 0.5,
    badgeClass: "bg-amber-500/15 text-amber-400",
    buttonClass: "border-amber-500/40 text-amber-300",
    activeClass: "bg-amber-500/15 border-amber-500 text-amber-100",
    linkLabel: null,
  },
  {
    id: "confident",
    label: "Confident",
    emoji: "🟢",
    baseScore: 0.9,
    badgeClass: "bg-emerald-500/15 text-emerald-400",
    buttonClass: "border-emerald-500/40 text-emerald-300",
    activeClass: "bg-emerald-500/15 border-emerald-500 text-emerald-100",
    linkLabel: "Any gaps in your knowledge?",
  },
];

export const moduleConfidencePresets = moduleConfidenceOptions.reduce((acc, option) => {
  acc[option.id] = option;
  return acc;
}, {});

export function scoreToFamiliarityBand(score) {
  if (!Number.isFinite(score)) return "developing";
  if (score >= 0.75) return "confident";
  if (score <= 0.25) return "needs review";
  return "developing";
}

export function importanceScoreToTag(score) {
  if (!Number.isFinite(score)) return null;
  if (score >= 9) return { label: "Critical", color: "bg-red-500/15 text-red-500" };
  if (score >= 7) return { label: "High", color: "bg-amber-500/15 text-amber-500" };
  if (score >= 5) return { label: "Medium", color: "bg-blue-500/10 text-blue-500" };
  return { label: "Low", color: "bg-gray-200 text-[var(--muted-foreground)]" };
}

export function formatStudyTime(minutes) {
  if (!Number.isFinite(minutes)) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
