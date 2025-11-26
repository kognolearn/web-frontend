
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
    label: "Unfamiliar",
    emoji: "🌱",
    baseScore: 0.1,
    badgeClass: "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400",
    buttonClass: "border-gray-200 text-gray-600 dark:border-gray-800 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700",
    activeClass: "bg-rose-50 border-rose-300 text-rose-600 dark:bg-rose-950/30 dark:border-rose-700 dark:text-rose-400",
    linkLabel: "Do you know any of these?",
  },
  {
    id: "somewhat",
    label: "Still Learning",
    emoji: "🪴",
    baseScore: 0.5,
    badgeClass: "bg-[#FDFD96] text-yellow-900 dark:bg-yellow-950/20 dark:text-yellow-400",
    buttonClass: "border-gray-200 text-gray-600 dark:border-gray-800 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700",
    activeClass: "bg-[#FDFD96] border-yellow-400 text-yellow-900 dark:bg-yellow-950/30 dark:border-yellow-700 dark:text-yellow-400",
    linkLabel: null,
  },
  {
    id: "confident",
    label: "Confident",
    emoji: "🌳",
    baseScore: 0.9,
    badgeClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400",
    buttonClass: "border-gray-200 text-gray-600 dark:border-gray-800 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700",
    activeClass: "bg-emerald-50 border-emerald-300 text-emerald-600 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400",
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
  if (score >= 9) return { label: "Critical", color: "bg-[var(--danger)]/15 text-[var(--danger)]" };
  if (score >= 7) return { label: "High", color: "bg-[var(--warning)]/15 text-[var(--warning)]" };
  if (score >= 5) return { label: "Medium", color: "bg-[var(--info)]/15 text-[var(--info)]" };
  return { label: "Low", color: "bg-[var(--surface-muted)] text-[var(--muted-foreground)]" };
}

export function formatStudyTime(minutes) {
  if (!Number.isFinite(minutes)) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
