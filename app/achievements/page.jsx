"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { authFetch } from "@/lib/api";
import DashboardSidebar from "@/components/navigation/DashboardSidebar";
import SeedsDisplay from "@/components/ui/SeedsDisplay";

// Category color schemes - unique gradients and patterns for achievements
const CATEGORY_STYLES = {
  getting_started: {
    gradient: "from-emerald-500/20 via-teal-500/10 to-cyan-500/20",
    iconBg: "from-emerald-500 to-teal-500",
    iconGlow: "shadow-emerald-500/50",
    accent: "text-emerald-400",
    badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    pattern: "sprouts",
  },
  learning: {
    gradient: "from-blue-500/20 via-indigo-500/10 to-violet-500/20",
    iconBg: "from-blue-500 to-indigo-500",
    iconGlow: "shadow-blue-500/50",
    accent: "text-blue-400",
    badgeBg: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    pattern: "books",
  },
  engagement: {
    gradient: "from-orange-500/20 via-amber-500/10 to-yellow-500/20",
    iconBg: "from-orange-500 to-amber-500",
    iconGlow: "shadow-orange-500/50",
    accent: "text-orange-400",
    badgeBg: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    pattern: "flames",
  },
  social: {
    gradient: "from-purple-500/20 via-fuchsia-500/10 to-pink-500/20",
    iconBg: "from-purple-500 to-fuchsia-500",
    iconGlow: "shadow-purple-500/50",
    accent: "text-purple-400",
    badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    pattern: "hearts",
  },
  achievements: {
    gradient: "from-yellow-500/20 via-amber-500/10 to-orange-500/20",
    iconBg: "from-yellow-500 to-amber-500",
    iconGlow: "shadow-yellow-500/50",
    accent: "text-yellow-400",
    badgeBg: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    pattern: "stars",
  },
  mastery: {
    gradient: "from-rose-500/20 via-pink-500/10 to-red-500/20",
    iconBg: "from-rose-500 to-pink-500",
    iconGlow: "shadow-rose-500/50",
    accent: "text-rose-400",
    badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    pattern: "crowns",
  },
};

// Animated floating particles component
function FloatingParticles({ category, count = 6 }) {
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.getting_started;
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 3 + 4,
      delay: Math.random() * 2,
    }));
  }, [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute rounded-full bg-gradient-to-br ${style.iconBg} opacity-40`}
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            animation: `float ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// Background pattern component - unique patterns for achievements
function PatternBackground({ pattern, category }) {
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.getting_started;

  if (pattern === "sprouts") {
    return (
      <div className="absolute inset-0 opacity-20 overflow-hidden">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice">
          {Array.from({ length: 8 }, (_, i) => {
            const x = 20 + i * 25;
            const height = 15 + Math.sin(i) * 8;
            return (
              <g key={i}>
                <path
                  d={`M${x} 140 L${x} ${140 - height}`}
                  stroke="#10b981"
                  strokeWidth="2"
                  fill="none"
                />
                <ellipse
                  cx={x - 5}
                  cy={140 - height - 5}
                  rx="6"
                  ry="4"
                  fill="#10b981"
                  transform={`rotate(-30 ${x - 5} ${140 - height - 5})`}
                />
                <ellipse
                  cx={x + 5}
                  cy={140 - height - 5}
                  rx="6"
                  ry="4"
                  fill="#10b981"
                  transform={`rotate(30 ${x + 5} ${140 - height - 5})`}
                />
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  if (pattern === "books") {
    return (
      <div className="absolute inset-0 opacity-15">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`books-${category}`} x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
              <rect x="5" y="15" width="8" height="30" rx="1" fill="currentColor" className={style.accent} />
              <rect x="15" y="10" width="8" height="35" rx="1" fill="currentColor" className={style.accent} opacity="0.7" />
              <rect x="25" y="18" width="8" height="27" rx="1" fill="currentColor" className={style.accent} opacity="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#books-${category})`} />
        </svg>
      </div>
    );
  }

  if (pattern === "flames") {
    return (
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`flames-${category}`} x="0" y="0" width="40" height="50" patternUnits="userSpaceOnUse">
              <path
                d="M20 45 Q15 35 20 25 Q25 15 20 5 Q30 15 25 25 Q30 35 20 45"
                fill="currentColor"
                className={style.accent}
                opacity="0.6"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#flames-${category})`} />
        </svg>
      </div>
    );
  }

  if (pattern === "hearts") {
    return (
      <div className="absolute inset-0 opacity-15">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`hearts-${category}`} x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
              <path
                d="M25 40 L10 25 Q5 15 15 15 Q22 15 25 22 Q28 15 35 15 Q45 15 40 25 Z"
                fill="currentColor"
                className={style.accent}
                transform="scale(0.5) translate(25, 25)"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#hearts-${category})`} />
        </svg>
      </div>
    );
  }

  if (pattern === "stars") {
    return (
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`stars-${category}`} x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M25 5 L28 18 L41 18 L30 26 L34 39 L25 31 L16 39 L20 26 L9 18 L22 18 Z" fill="currentColor" className={style.accent} transform="scale(0.4) translate(30, 30)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#stars-${category})`} />
        </svg>
      </div>
    );
  }

  if (pattern === "crowns") {
    return (
      <div className="absolute inset-0 opacity-15">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`crowns-${category}`} x="0" y="0" width="60" height="50" patternUnits="userSpaceOnUse">
              <path
                d="M10 35 L15 20 L22 30 L30 15 L38 30 L45 20 L50 35 L50 40 L10 40 Z"
                fill="currentColor"
                className={style.accent}
                transform="scale(0.6) translate(15, 10)"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#crowns-${category})`} />
        </svg>
      </div>
    );
  }

  return null;
}

// Category icons - detailed SVGs for each milestone type
function MilestoneIcon({ iconName, className = "" }) {
  const iconClass = `w-full h-full ${className}`;

  const icons = {
    "book-plus": (
      <svg className={iconClass} fill="none" viewBox="0 0 48 48">
        <defs>
          <linearGradient id="bookPlusGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <path d="M8 8C8 6 10 4 12 4H36C38 4 40 6 40 8V40C40 42 38 44 36 44H12C10 44 8 42 8 40V8Z" fill="url(#bookPlusGrad)" stroke="white" strokeWidth="1.5" />
        <path d="M24 4V44" stroke="white" strokeWidth="1.5" strokeOpacity="0.5" />
        <path d="M18 22H30M24 16V28" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
    "check-circle": (
      <svg className={iconClass} fill="none" viewBox="0 0 48 48">
        <defs>
          <linearGradient id="checkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="20" fill="url(#checkGrad)" stroke="white" strokeWidth="1.5" />
        <path d="M14 24L21 31L34 18" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    trophy: (
      <svg className={iconClass} fill="none" viewBox="0 0 48 48">
        <defs>
          <linearGradient id="trophyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <path d="M14 8H34V20C34 26 29.5 32 24 32C18.5 32 14 26 14 20V8Z" fill="url(#trophyGrad)" stroke="white" strokeWidth="1.5" />
        <path d="M14 12H8C8 12 6 12 6 16C6 20 10 22 14 20" stroke="white" strokeWidth="1.5" fill="none" />
        <path d="M34 12H40C40 12 42 12 42 16C42 20 38 22 34 20" stroke="white" strokeWidth="1.5" fill="none" />
        <path d="M24 32V38" stroke="white" strokeWidth="2" />
        <path d="M16 38H32V42H16V38Z" fill="white" fillOpacity="0.8" />
        <circle cx="24" cy="18" r="4" fill="white" fillOpacity="0.6" />
      </svg>
    ),
    flame: (
      <svg className={iconClass} fill="none" viewBox="0 0 48 48">
        <defs>
          <linearGradient id="flameGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        <path d="M24 4C24 4 12 14 12 28C12 36 17 44 24 44C31 44 36 36 36 28C36 14 24 4 24 4Z" fill="url(#flameGrad)" stroke="white" strokeWidth="1.5" />
        <path d="M24 24C24 24 18 30 18 36C18 40 21 44 24 44C27 44 30 40 30 36C30 30 24 24 24 24Z" fill="white" fillOpacity="0.4" />
      </svg>
    ),
    fire: (
      <svg className={iconClass} fill="none" viewBox="0 0 48 48">
        <defs>
          <linearGradient id="fireGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
        <path d="M24 4C24 4 10 16 10 30C10 38 16 44 24 44C32 44 38 38 38 30C38 16 24 4 24 4Z" fill="url(#fireGrad)" stroke="white" strokeWidth="1.5" />
        <path d="M24 20C24 20 16 28 16 36C16 42 20 44 24 44" stroke="white" strokeWidth="1.5" strokeOpacity="0.5" fill="none" />
      </svg>
    ),
    users: (
      <svg className={iconClass} fill="none" viewBox="0 0 48 48">
        <defs>
          <linearGradient id="usersGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="14" r="8" fill="url(#usersGrad)" stroke="white" strokeWidth="1.5" />
        <path d="M10 44C10 34 16 28 24 28C32 28 38 34 38 44" fill="url(#usersGrad)" stroke="white" strokeWidth="1.5" />
        <circle cx="38" cy="16" r="5" fill="white" fillOpacity="0.6" stroke="url(#usersGrad)" strokeWidth="1" />
        <circle cx="10" cy="16" r="5" fill="white" fillOpacity="0.6" stroke="url(#usersGrad)" strokeWidth="1" />
      </svg>
    ),
    star: (
      <svg className={iconClass} fill="none" viewBox="0 0 48 48">
        <defs>
          <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#facc15" />
          </linearGradient>
        </defs>
        <path
          d="M24 4L28.5 17.5H42.5L31 26L35.5 40L24 31L12.5 40L17 26L5.5 17.5H19.5L24 4Z"
          fill="white"
          stroke="white"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M24 4L28.5 17.5H42.5L31 26L35.5 40L24 31L12.5 40L17 26L5.5 17.5H19.5L24 4Z"
          fill="url(#starGrad)"
          strokeLinejoin="round"
        />
      </svg>
    ),
    "file-check": (
      <svg className={iconClass} fill="none" viewBox="0 0 48 48">
        <defs>
          <linearGradient id="fileCheckGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <path d="M12 4H30L38 12V44H12C10 44 8 42 8 40V8C8 6 10 4 12 4Z" fill="url(#fileCheckGrad)" stroke="white" strokeWidth="1.5" />
        <path d="M30 4V12H38" stroke="white" strokeWidth="1.5" fill="none" />
        <path d="M18 28L22 32L32 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    medal: (
      <svg className={iconClass} fill="none" viewBox="0 0 48 48">
        <defs>
          <linearGradient id="medalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <path d="M18 4L24 16L30 4" stroke="url(#medalGrad)" strokeWidth="3" fill="none" />
        <circle cx="24" cy="30" r="14" fill="url(#medalGrad)" stroke="white" strokeWidth="1.5" />
        <circle cx="24" cy="30" r="10" fill="white" fillOpacity="0.2" />
        <path d="M24 22L26 27H31L27 30L28.5 35L24 32L19.5 35L21 30L17 27H22L24 22Z" fill="white" />
      </svg>
    ),
    lightning: (
      <svg className={iconClass} fill="none" viewBox="0 0 48 48">
        <defs>
          <linearGradient id="lightningGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <path d="M28 4L12 26H22L18 44L36 20H26L28 4Z" fill="url(#lightningGrad)" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  };

  return icons[iconName] || icons["check-circle"];
}

function BadgeCard({ milestone, isAchieved }) {
  const category = milestone.category || "getting_started";
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.getting_started;

  return (
    <div
      className={`group relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-500 ${
        isAchieved
          ? "border-[var(--border)] bg-[var(--surface-1)] hover:border-white/20 hover:shadow-xl hover:-translate-y-1"
          : "border-[var(--border)]/50 bg-[var(--surface-1)]/30 opacity-60 grayscale"
      }`}
    >
      {/* Visual section with gradient, pattern and particles */}
      <div className={`relative aspect-[4/3] bg-gradient-to-br ${style.gradient} overflow-hidden`}>
        {/* Pattern background */}
        <PatternBackground pattern={style.pattern} category={category} />

        {/* Floating particles */}
        <FloatingParticles category={category} count={8} />

        {/* Glow effect on hover */}
        {isAchieved && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-transparent via-transparent to-white/10" />
        )}

        {/* Icon container */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`relative w-20 h-20 sm:w-24 sm:h-24 transform transition-transform duration-500 ${isAchieved ? "group-hover:scale-110" : ""}`}>
            {/* Icon glow */}
            {isAchieved && (
              <div className={`absolute inset-0 rounded-full blur-xl bg-gradient-to-br ${style.iconBg} opacity-50 group-hover:opacity-70 transition-opacity`} />
            )}
            {/* Icon */}
            <div className="relative z-10">
              <MilestoneIcon iconName={milestone.icon || "check-circle"} />
            </div>
          </div>
        </div>

        {/* Category badge */}
        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold border ${style.badgeBg} backdrop-blur-sm capitalize`}>
          {category.replace("_", " ")}
        </span>

        {/* Achieved checkmark */}
        {isAchieved && (
          <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-green-500/90 flex items-center justify-center shadow-lg">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        {/* Locked indicator */}
        {!isAchieved && (
          <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center">
            <svg className="w-4 h-4 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 bg-gradient-to-b from-transparent to-[var(--surface-1)]/50">
        <h3 className="font-bold text-[var(--foreground)] text-lg">{milestone.title}</h3>
        <p className="mt-1.5 text-sm text-[var(--muted-foreground)] line-clamp-2 flex-1">
          {milestone.description}
        </p>

        {/* Reward and date */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Image
              src="/images/seed_icon.png"
              alt="Seeds"
              width={20}
              height={20}
              className={`w-5 h-5 ${!isAchieved ? "opacity-50 grayscale" : ""}`}
            />
            <span className={`font-bold text-base ${isAchieved ? style.accent : "text-[var(--muted-foreground)]"}`}>
              +{milestone.seeds}
            </span>
          </div>

          {isAchieved && milestone.achievedAt && (
            <span className="text-xs text-[var(--muted-foreground)]">
              {new Date(milestone.achievedAt).toLocaleDateString()}
            </span>
          )}

          {milestone.repeatable && (
            <span className="text-xs text-[var(--muted-foreground)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full">
              Repeatable
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AchievementsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allMilestones, setAllMilestones] = useState([]);
  const [stats, setStats] = useState({ total: 0, achieved: 0 });

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/create-account");
        return;
      }

      setUser(user);

      try {
        const res = await authFetch("/api/seeds/milestones/all");
        if (res.ok) {
          const data = await res.json();
          // Flatten all milestones from all categories into a single array
          const milestones = (data.categories || []).flatMap(cat => cat.milestones || []);
          setAllMilestones(milestones);
          setStats(data.stats || { total: 0, achieved: 0 });
        }
      } catch (err) {
        console.error("Failed to fetch achievements:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const progressPercent = stats.total > 0 ? (stats.achieved / stats.total) * 100 : 0;

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[var(--background)]">
        <DashboardSidebar activePath="/achievements" />
        <div className="flex-1 relative overflow-hidden">
          {/* Background effects */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[var(--primary)]/10 to-[var(--primary)]/5 blur-3xl" />
            <div className="absolute top-1/2 -left-40 h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-[var(--primary)]/10 to-transparent blur-3xl" />
          </div>

          <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-8 px-4 pb-16 pt-6 sm:pt-8 sm:px-6 lg:px-8">
            <div className="animate-pulse space-y-8">
              <div className="h-10 w-48 bg-[var(--surface-2)] rounded-lg" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
                    <div className="aspect-[4/3] bg-[var(--surface-2)]" />
                    <div className="p-4 space-y-3">
                      <div className="h-6 w-2/3 rounded bg-[var(--surface-2)]" />
                      <div className="h-4 w-full rounded bg-[var(--surface-2)]" />
                      <div className="h-8 w-full rounded bg-[var(--surface-2)]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <DashboardSidebar activePath="/achievements" />

      {/* CSS for floating animation */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.4;
          }
          25% {
            transform: translateY(-10px) translateX(5px);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-5px) translateX(-5px);
            opacity: 0.3;
          }
          75% {
            transform: translateY(-15px) translateX(3px);
            opacity: 0.5;
          }
        }
      `}</style>

      <div className="flex-1 relative overflow-hidden">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full blur-3xl animate-pulse"
            style={{
              animationDuration: "8s",
              background:
                "radial-gradient(circle, rgba(var(--primary-rgb), var(--grid-glow-opacity)) 0%, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.25)) 100%)",
            }}
          />
          <div
            className="absolute top-1/2 -left-40 h-[400px] w-[400px] rounded-full blur-3xl animate-pulse"
            style={{
              animationDuration: "10s",
              animationDelay: "2s",
              background:
                "radial-gradient(circle, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.75)) 0%, transparent 100%)",
            }}
          />
          <div
            className="absolute bottom-20 right-1/4 h-[300px] w-[300px] rounded-full blur-3xl animate-pulse"
            style={{
              animationDuration: "12s",
              animationDelay: "4s",
              background:
                "radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 100%)",
            }}
          />

          {/* Mesh gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--background)]/50 to-[var(--background)]" />

          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />
        </div>

        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-8 px-4 pb-16 pt-6 sm:pt-8 sm:px-6 lg:px-8">
          {/* Top bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[var(--foreground)] to-[var(--muted-foreground)] bg-clip-text text-transparent">
                Achievements
              </h1>
              <p className="mt-1 text-sm sm:text-base text-[var(--muted-foreground)]">
                Earn badges and seeds by completing milestones
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Progress summary */}
              <div className="flex items-center gap-3 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--foreground)]">
                      {stats.achieved} / {stats.total}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {Math.round(progressPercent)}% complete
                    </div>
                  </div>
                </div>

                {/* Mini progress bar */}
                <div className="w-20 h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--primary)] rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <SeedsDisplay />
            </div>
          </div>

          {/* Achievements grid - flat, no sections */}
          {allMilestones.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {allMilestones.map((milestone) => (
                <BadgeCard
                  key={milestone.key}
                  milestone={milestone}
                  isAchieved={milestone.achieved}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <p className="text-[var(--muted-foreground)]">No achievements available yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
