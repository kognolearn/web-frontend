"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Lock } from "lucide-react";
import { authFetch } from "@/lib/api";
import PremiumUpgradeModal from "@/components/ui/PremiumUpgradeModal";

// Category color schemes
const CATEGORY_STYLES = {
  upgrade: {
    gradient: "from-emerald-500/20 via-teal-500/10 to-cyan-500/20",
    iconBg: "from-emerald-500 to-teal-500",
    iconGlow: "shadow-emerald-500/50",
    accent: "text-emerald-400",
    badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    pattern: "dots",
  },
  cosmetic: {
    gradient: "from-purple-500/20 via-fuchsia-500/10 to-pink-500/20",
    iconBg: "from-purple-500 to-fuchsia-500",
    iconGlow: "shadow-purple-500/50",
    accent: "text-purple-400",
    badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    pattern: "waves",
  },
  gift: {
    gradient: "from-rose-500/20 via-pink-500/10 to-red-500/20",
    iconBg: "from-rose-500 to-pink-500",
    iconGlow: "shadow-rose-500/50",
    accent: "text-rose-400",
    badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    pattern: "circles",
  },
  exclusive: {
    gradient: "from-amber-500/20 via-yellow-500/10 to-orange-500/20",
    iconBg: "from-amber-500 to-yellow-500",
    iconGlow: "shadow-amber-500/50",
    accent: "text-amber-400",
    badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    pattern: "stars",
  },
  physical: {
    gradient: "from-blue-500/20 via-indigo-500/10 to-violet-500/20",
    iconBg: "from-blue-500 to-indigo-500",
    iconGlow: "shadow-blue-500/50",
    accent: "text-blue-400",
    badgeBg: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    pattern: "grid",
  },
  impact: {
    gradient: "from-green-500/20 via-lime-500/10 to-emerald-500/20",
    iconBg: "from-green-500 to-lime-500",
    iconGlow: "shadow-green-500/50",
    accent: "text-green-400",
    badgeBg: "bg-green-500/20 text-green-300 border-green-500/30",
    pattern: "leaves",
  },
};

// Reward definitions with interspersed free/premium items
const REWARDS = [
  {
    id: "course_slot",
    name: "+1 Course Slot",
    description: "Unlock an additional course slot to expand your learning",
    cost: 100,
    premiumOnly: false,
    category: "upgrade",
  },
  {
    id: "profile_flair",
    name: "Profile Flair",
    description: "Show off a special badge on your profile",
    cost: 100,
    premiumOnly: true,
    category: "cosmetic",
  },
  {
    id: "gift_week",
    name: "Gift 1 Week Premium",
    description: "Send a friend 1 week of premium access",
    cost: 150,
    premiumOnly: true,
    category: "gift",
  },
  {
    id: "custom_theme",
    name: "Custom Profile Theme",
    description: "Personalize your profile with custom colors",
    cost: 250,
    premiumOnly: true,
    category: "cosmetic",
  },
  {
    id: "week_premium",
    name: "1 Week Premium",
    description: "Experience all premium features for a week",
    cost: 300,
    premiumOnly: false,
    category: "upgrade",
  },
  {
    id: "gift_month",
    name: "Gift 1 Month Premium",
    description: "Send a friend 1 month of premium access",
    cost: 300,
    premiumOnly: true,
    category: "gift",
  },
  {
    id: "feature_vote",
    name: "Vote on Next Feature",
    description: "Help decide what we build next",
    cost: 300,
    premiumOnly: true,
    category: "exclusive",
  },
  {
    id: "subscription_extension",
    name: "+1 Month Extension",
    description: "Add an extra month to your subscription",
    cost: 400,
    premiumOnly: true,
    category: "upgrade",
  },
  {
    id: "sticker_pack",
    name: "Sticker Pack",
    description: "Get exclusive Kogno stickers mailed to you",
    cost: 500,
    premiumOnly: true,
    category: "physical",
  },
  {
    id: "month_premium",
    name: "1 Month Premium",
    description: "Full premium access for an entire month",
    cost: 750,
    premiumOnly: false,
    category: "upgrade",
  },
  {
    id: "thank_you_note",
    name: "Handwritten Note",
    description: "A personal thank you note from our founders",
    cost: 750,
    premiumOnly: true,
    category: "exclusive",
  },
  {
    id: "supporters_page",
    name: "Supporters Page",
    description: "Your name permanently on our supporters page",
    cost: 200,
    premiumOnly: true,
    category: "exclusive",
  },
  {
    id: "plant_tree",
    name: "Plant a Tree",
    description: "We'll plant a real tree in your name",
    cost: 1000,
    premiumOnly: true,
    category: "impact",
  },
  {
    id: "tshirt",
    name: "Kogno T-Shirt",
    description: "Premium quality shirt with exclusive design",
    cost: 1500,
    premiumOnly: true,
    category: "physical",
  },
];

// Animated floating particles component
function FloatingParticles({ category, count = 6 }) {
  const style = CATEGORY_STYLES[category];
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

// Background pattern component
function PatternBackground({ pattern, category }) {
  const style = CATEGORY_STYLES[category];

  if (pattern === "dots") {
    // Rising dots pattern - static columns of dots positioned higher toward the center
    return (
      <div className="absolute inset-0 opacity-25 overflow-hidden">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice">
          {/* Generate columns of dots with rising effect toward center */}
          {Array.from({ length: 11 }, (_, colIndex) => {
            const x = colIndex * 20;
            const distanceFromCenter = Math.abs(colIndex - 5);
            const numDots = 8;

            return Array.from({ length: numDots }, (_, dotIndex) => {
              // Dots are positioned higher in center columns, lower at edges
              const centerOffset = (5 - distanceFromCenter) * 6;
              const y = 150 - (dotIndex * 18) - centerOffset;
              const opacity = 0.4 + (dotIndex / numDots) * 0.4; // Brighter toward top
              const size = 2 + (1 - distanceFromCenter / 5) * 1; // Slightly larger toward center

              return (
                <circle
                  key={`${colIndex}-${dotIndex}`}
                  cx={x}
                  cy={y}
                  r={size}
                  fill="#10b981"
                  opacity={opacity}
                />
              );
            });
          })}
        </svg>
      </div>
    );
  }

  if (pattern === "waves") {
    return (
      <div className="absolute inset-0 opacity-15">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <defs>
            <pattern id={`waves-${category}`} x="0" y="0" width="60" height="30" patternUnits="userSpaceOnUse">
              <path d="M0 15 Q15 0 30 15 T60 15" fill="none" stroke="currentColor" strokeWidth="1.5" className={style.accent} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#waves-${category})`} />
        </svg>
      </div>
    );
  }

  if (pattern === "circles") {
    return (
      <div className="absolute inset-0 opacity-15">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`circles-${category}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="8" fill="none" stroke="currentColor" strokeWidth="1" className={style.accent} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#circles-${category})`} />
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

  if (pattern === "grid") {
    return (
      <div className="absolute inset-0 opacity-15">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`grid-${category}`} x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M30 0 L0 0 L0 30" fill="none" stroke="currentColor" strokeWidth="0.5" className={style.accent} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#grid-${category})`} />
        </svg>
      </div>
    );
  }

  if (pattern === "leaves") {
    return (
      <div className="absolute inset-0 opacity-15">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`leaves-${category}`} x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M30 10 Q40 20 30 35 Q20 20 30 10" fill="currentColor" className={style.accent} transform="rotate(45, 30, 22)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#leaves-${category})`} />
        </svg>
      </div>
    );
  }

  return null;
}

// Category icons - larger and more detailed
function CategoryIcon({ category, className = "" }) {
  const iconClass = `w-full h-full ${className}`;

  switch (category) {
    case "upgrade":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="upgradeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          {/* White background shape - same path, slightly larger via stroke */}
          <path
            d="M24 4L44 24H34V44H14V24H4L24 4Z"
            fill="white"
            stroke="white"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Green gradient fill on top - same size as the white */}
          <path
            d="M24 4L44 24H34V44H14V24H4L24 4Z"
            fill="url(#upgradeGrad)"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "cosmetic":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="cosmeticGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="18" fill="url(#cosmeticGrad)" stroke="white" strokeWidth="1.5" />
          <path d="M16 20C16 20 20 16 24 16C28 16 32 20 32 20" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <circle cx="18" cy="26" r="3" fill="white" fillOpacity="0.6" />
          <circle cx="30" cy="26" r="3" fill="white" fillOpacity="0.6" />
          <path d="M20 33C20 33 22 35 24 35C26 35 28 33 28 33" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <circle cx="34" cy="12" r="4" fill="white" fillOpacity="0.4" />
        </svg>
      );
    case "gift":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="giftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <rect x="6" y="20" width="36" height="24" rx="3" fill="url(#giftGrad)" stroke="white" strokeWidth="1.5" />
          <rect x="10" y="14" width="28" height="8" rx="2" fill="url(#giftGrad)" stroke="white" strokeWidth="1.5" />
          <path d="M24 14V44" stroke="white" strokeWidth="3" />
          <path d="M6 30H42" stroke="white" strokeWidth="3" />
          <circle cx="18" cy="10" r="6" fill="white" fillOpacity="0.8" stroke="url(#giftGrad)" strokeWidth="1.5" />
          <circle cx="30" cy="10" r="6" fill="white" fillOpacity="0.8" stroke="url(#giftGrad)" strokeWidth="1.5" />
        </svg>
      );
    case "exclusive":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="exclusiveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#facc15" />
            </linearGradient>
          </defs>
          {/* White background shape - same path, slightly larger via stroke */}
          <path
            d="M24 4L28.5 17.5H42.5L31 26L35.5 40L24 31L12.5 40L17 26L5.5 17.5H19.5L24 4Z"
            fill="white"
            stroke="white"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Yellow gradient fill on top - same size as the white */}
          <path
            d="M24 4L28.5 17.5H42.5L31 26L35.5 40L24 31L12.5 40L17 26L5.5 17.5H19.5L24 4Z"
            fill="url(#exclusiveGrad)"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "physical":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="physicalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <path d="M24 4L42 14V34L24 44L6 34V14L24 4Z" fill="url(#physicalGrad)" stroke="white" strokeWidth="1.5" />
          <path d="M24 4L24 44" stroke="white" strokeWidth="1.5" />
          <path d="M6 14L24 24L42 14" stroke="white" strokeWidth="1.5" />
          <path d="M24 24V44" stroke="white" strokeWidth="1.5" strokeOpacity="0.5" />
          <circle cx="24" cy="24" r="6" fill="white" fillOpacity="0.3" />
        </svg>
      );
    case "impact":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="impactGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#84cc16" />
            </linearGradient>
          </defs>
          <ellipse cx="24" cy="40" rx="14" ry="4" fill="url(#impactGrad)" fillOpacity="0.3" />
          <path d="M24 38V26" stroke="#8B4513" strokeWidth="4" strokeLinecap="round" />
          <path
            d="M24 8C24 8 10 16 10 26C10 32 16 36 24 36C32 36 38 32 38 26C38 16 24 8 24 8Z"
            fill="url(#impactGrad)"
            stroke="white"
            strokeWidth="1.5"
          />
          <path
            d="M24 14C24 14 16 20 16 26C16 30 20 32 24 32"
            stroke="white"
            strokeWidth="1.5"
            strokeOpacity="0.5"
            fill="none"
          />
          <circle cx="20" cy="22" r="2" fill="white" fillOpacity="0.6" />
        </svg>
      );
    default:
      return null;
  }
}

function RewardCard({ reward, seeds, isPremiumUser, onRedeem, onLockedClick }) {
  const canAfford = seeds >= reward.cost;
  const isLocked = reward.premiumOnly && !isPremiumUser;
  const canRedeem = canAfford && !isLocked;
  const style = CATEGORY_STYLES[reward.category];

  const handleLockedClick = () => {
    if (isLocked && onLockedClick) {
      onLockedClick(reward);
    }
  };

  return (
    <div
      className={`group relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-500 ${
        isLocked
          ? "border-[var(--border)]/50 bg-[var(--surface-1)]/30 cursor-pointer"
          : "border-[var(--border)] bg-[var(--surface-1)] hover:border-white/20 hover:shadow-xl hover:-translate-y-1"
      }`}
      onClick={isLocked ? handleLockedClick : undefined}
    >
      {/* Locked overlay */}
      {isLocked && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--background)]/70 backdrop-blur-[3px] transition-all group-hover:bg-[var(--background)]/60">
          <div className="flex flex-col items-center gap-2 text-center px-4 transform transition-transform group-hover:scale-105">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-2)] border border-[var(--border)] shadow-lg">
              <Lock className="h-7 w-7 text-[var(--muted-foreground)]" />
            </div>
            <span className="text-sm font-semibold text-[var(--muted-foreground)]">
              Premium Only
            </span>
            <span className="text-xs text-[var(--muted-foreground)]/70">
              Click to upgrade
            </span>
          </div>
        </div>
      )}

      {/* Visual section with gradient, pattern and particles */}
      <div className={`relative aspect-[4/3] bg-gradient-to-br ${style.gradient} overflow-hidden`}>
        {/* Pattern background */}
        <PatternBackground pattern={style.pattern} category={reward.category} />

        {/* Floating particles */}
        <FloatingParticles category={reward.category} count={8} />

        {/* Glow effect on hover */}
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-transparent via-transparent to-white/10`} />

        {/* Icon container */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`relative w-24 h-24 sm:w-28 sm:h-28 transform transition-transform duration-500 group-hover:scale-110`}>
            {/* Icon glow */}
            <div className={`absolute inset-0 rounded-full blur-xl bg-gradient-to-br ${style.iconBg} opacity-50 group-hover:opacity-70 transition-opacity`} />
            {/* Icon */}
            <div className="relative z-10">
              <CategoryIcon category={reward.category} />
            </div>
          </div>
        </div>

        {/* Category badge */}
        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold border ${style.badgeBg} backdrop-blur-sm capitalize`}>
          {reward.category}
        </span>

        {/* Premium indicator */}
        {reward.premiumOnly && (
          <span className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-sm">
            PRO
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 bg-gradient-to-b from-transparent to-[var(--surface-1)]/50">
        <h3 className="font-bold text-[var(--foreground)] text-lg">{reward.name}</h3>
        <p className="mt-1.5 text-sm text-[var(--muted-foreground)] line-clamp-2 flex-1">
          {reward.description}
        </p>

        {/* Price and action */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Image
                src="/images/seed_icon.png"
                alt="Seeds"
                width={24}
                height={24}
                className="w-6 h-6"
              />
            </div>
            <span className={`font-bold text-lg ${style.accent}`}>
              {reward.cost.toLocaleString()}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (canRedeem) onRedeem(reward);
            }}
            disabled={!canRedeem}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
              canRedeem
                ? `bg-gradient-to-r ${style.iconBg} text-white shadow-lg ${style.iconGlow} hover:shadow-xl hover:scale-105`
                : "bg-[var(--surface-2)] text-[var(--muted-foreground)] cursor-not-allowed"
            }`}
          >
            {isLocked ? "Locked" : canAfford ? "Redeem" : "Not enough"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StorePage() {
  const [seeds, setSeeds] = useState(0);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [upgradeModal, setUpgradeModal] = useState({ isOpen: false, reward: null });

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const [seedsRes, subRes] = await Promise.all([
          authFetch("/api/seeds"),
          authFetch("/api/stripe?endpoint=subscription-status"),
        ]);

        if (seedsRes.ok) {
          const data = await seedsRes.json();
          if (!cancelled) {
            setSeeds(data.seeds?.balance ?? 0);
          }
        }

        if (subRes.ok) {
          const data = await subRes.json();
          if (!cancelled) {
            setIsPremiumUser(data.planLevel === "paid" || data.trialActive);
          }
        }
      } catch (err) {
        console.error("Failed to fetch store data:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRedeem = async (reward) => {
    console.log("Redeeming:", reward);
  };

  const handleLockedClick = (reward) => {
    setUpgradeModal({ isOpen: true, reward });
  };

  const closeUpgradeModal = () => {
    setUpgradeModal({ isOpen: false, reward: null });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
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
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 sm:gap-8 px-3 sm:px-4 pb-16 pt-6 sm:pt-8 sm:px-6 lg:px-8">
        {/* Header card */}
        <div className="rounded-2xl sm:rounded-3xl border border-[var(--border)]/70 bg-[var(--surface-1)]/60 p-4 sm:p-6 shadow-lg shadow-black/10 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src="/images/kogno_logo.png"
                alt="Kogno Logo"
                width={32}
                height={32}
                className="h-7 w-7 sm:h-8 sm:w-8 object-contain"
                priority
              />
              <span className="text-lg sm:text-xl font-bold tracking-tight text-[var(--primary)]">
                Kogno
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/30">
                <Image
                  src="/images/seed_icon.png"
                  alt="Seeds"
                  width={20}
                  height={20}
                  className="w-5 h-5"
                />
                <span className="font-bold text-[var(--primary)]">
                  {loading ? "..." : seeds.toLocaleString()}
                </span>
              </div>
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--foreground)]"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </Link>
            </div>
          </div>

          <header className="mt-4">
            <h1 className="text-2xl sm:text-3xl font-bold sm:text-4xl bg-gradient-to-r from-[var(--foreground)] to-[var(--muted-foreground)] bg-clip-text text-transparent">
              Seed Store
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[var(--muted-foreground)]">
              Spend your seeds on rewards, upgrades, and exclusive items.
              {!isPremiumUser && !loading && (
                <span className="ml-2 text-[var(--primary)] font-medium">
                  Upgrade to premium to unlock all rewards!
                </span>
              )}
            </p>
          </header>
        </div>

        {/* Rewards grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-[var(--surface-2)]" />
                <div className="p-4 space-y-3">
                  <div className="h-6 w-2/3 rounded bg-[var(--surface-2)]" />
                  <div className="h-4 w-full rounded bg-[var(--surface-2)]" />
                  <div className="h-12 w-full rounded bg-[var(--surface-2)]" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {REWARDS.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                seeds={seeds}
                isPremiumUser={isPremiumUser}
                onRedeem={handleRedeem}
                onLockedClick={handleLockedClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Premium Upgrade Modal */}
      <PremiumUpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={closeUpgradeModal}
        title="Premium Reward"
        description={
          upgradeModal.reward
            ? `"${upgradeModal.reward.name}" is only available for premium users. Upgrade to unlock all store rewards and exclusive features.`
            : "This reward is only available for premium users."
        }
      />
    </div>
  );
}
