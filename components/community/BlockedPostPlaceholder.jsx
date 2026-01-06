"use client";

export default function BlockedPostPlaceholder({ onShowContent, depth = 0 }) {
  return (
    <div className={`p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] ${depth > 0 ? 'ml-8' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <span className="text-sm">Content from a blocked user</span>
        </div>
        <button
          onClick={onShowContent}
          className="text-sm text-[var(--primary)] hover:underline"
        >
          Show anyway
        </button>
      </div>
    </div>
  );
}
