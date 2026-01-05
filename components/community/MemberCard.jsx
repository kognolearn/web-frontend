"use client";

export default function MemberCard({ member, isCurrentUser }) {
  const isCreator = member.role === "creator";

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-xs font-semibold text-[var(--primary)]">
        {member.displayName?.[0]?.toUpperCase() || "?"}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--foreground)] truncate">
            {member.displayName || "Unknown"}
          </span>
          {isCurrentUser && (
            <span className="text-xs text-[var(--muted-foreground)]">(you)</span>
          )}
        </div>
        {isCreator && (
          <span className="text-xs text-[var(--primary)]">Creator</span>
        )}
      </div>

      {/* Online indicator (could be enhanced with real-time status) */}
      <div className="w-2 h-2 rounded-full bg-green-500" title="Online" />
    </div>
  );
}
