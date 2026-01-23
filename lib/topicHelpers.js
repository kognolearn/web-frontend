export const getFamiliarityLevel = (rating) => {
  if (typeof rating === 'string') {
    if (rating === 'unfamiliar' || rating === 'learning' || rating === 'confident') {
      return rating;
    }
  }

  const numericRating = Number(rating);
  if (!Number.isFinite(numericRating)) return 'learning';
  if (numericRating <= 1) return 'unfamiliar';
  if (numericRating >= 3) return 'confident';
  return 'learning';
};

export const getFamiliarityColor = (level) => {
  switch (level) {
    case 'unfamiliar':
      return 'bg-rose-500/15 text-rose-600 border-rose-500/30';
    case 'confident':
      return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
    case 'learning':
    default:
      return 'bg-amber-500/15 text-amber-700 border-amber-500/30';
  }
};

export const getFamiliarityIcon = (level) => {
  switch (level) {
    case 'unfamiliar':
      return (
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
        </svg>
      );
    case 'confident':
      return (
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22v-4" />
          <path d="M7 12H2l5-5-1-3 6 2 6-2-1 3 5 5h-5" />
          <path d="M12 8v4" />
          <path d="M8 22h8" />
          <path d="M5.5 12.5L8 15h8l2.5-2.5" />
        </svg>
      );
    case 'learning':
    default:
      return (
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 20h10" />
          <path d="M10 20c5.5-2.5.8-6.4 3-10" />
          <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
          <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
        </svg>
      );
  }
};
