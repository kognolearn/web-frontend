"use client";

/**
 * UserAvatar component - displays user's profile picture or initials fallback
 * @param {Object} props
 * @param {Object} props.user - User object with user_metadata (from Supabase auth)
 * @param {string} props.user.user_metadata.avatar_url - Profile picture URL (from OAuth)
 * @param {string} props.user.user_metadata.picture - Alternative profile picture URL (Google)
 * @param {string} props.user.user_metadata.full_name - User's full name
 * @param {string} props.user.email - User's email (fallback for initials)
 * @param {string} props.size - Size variant: "sm" (24px), "md" (36px), "lg" (48px), "xl" (64px)
 * @param {string} props.className - Additional CSS classes
 */
export default function UserAvatar({ user, size = "md", className = "" }) {
  const metadata = user?.user_metadata || {};
  const avatarUrl = metadata.avatar_url || metadata.picture;
  const fullName = metadata.full_name || "";
  const email = user?.email || "";

  // Generate initials from name or email
  const getInitials = () => {
    if (fullName) {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return fullName.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "?";
  };

  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={fullName || "User avatar"}
        className={`${sizeClass} rounded-full object-cover ring-2 ring-[var(--primary)]/20 ${className}`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-[var(--primary)] ring-2 ring-[var(--primary)]/20 flex items-center justify-center text-white font-semibold ${className}`}
    >
      {getInitials()}
    </div>
  );
}
