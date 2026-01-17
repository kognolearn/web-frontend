/**
 * Global loading UI component
 * Displayed while page content is loading for better perceived performance
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {/* Outer ring */}
          <div className="w-12 h-12 rounded-full border-2 border-[var(--border)]" />
          {/* Spinning indicator */}
          <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-[var(--primary)] animate-spin" />
        </div>
        <p className="text-sm text-[var(--muted-foreground)] animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}
