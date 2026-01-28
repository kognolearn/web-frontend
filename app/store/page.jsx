"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { authFetch } from "@/lib/api";
import PremiumUpgradeModal from "@/components/ui/PremiumUpgradeModal";
import DashboardSidebar from "@/components/navigation/DashboardSidebar";
import SeedsDisplay from "@/components/ui/SeedsDisplay";

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

function RewardCard({ reward, seeds, isPremiumUser, onRedeem, onLockedClick, isRedeeming }) {
  const canAfford = seeds >= reward.cost;
  const isLocked = reward.premiumOnly && !isPremiumUser;
  const canRedeem = canAfford && !isLocked && !isRedeeming;
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
            {isRedeeming ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                ...
              </span>
            ) : isLocked ? "Locked" : canAfford ? "Redeem" : "Not enough"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Gift Recipient Modal
function GiftRecipientModal({ isOpen, onClose, reward, onSubmit, isSubmitting }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    setError("");
    onSubmit(email);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
        </div>
        <h3 className="text-xl font-bold text-center text-[var(--foreground)] mb-2">Gift Premium</h3>
        <p className="text-center text-[var(--muted-foreground)] mb-6">
          Enter your friend&apos;s email to send them {reward?.name?.includes("Week") ? "1 week" : "1 month"} of premium access.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            className="w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] mb-2"
          />
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 px-4 bg-[var(--surface-2)] text-[var(--foreground)] rounded-lg font-medium hover:bg-[var(--surface-3)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-3 px-4 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors disabled:opacity-50">
              {isSubmitting ? "Sending..." : "Send Gift"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Shipping Address Modal
function ShippingAddressModal({ isOpen, onClose, reward, onSubmit, isSubmitting }) {
  const [form, setForm] = useState({ name: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "US" });
  const [size, setSize] = useState("");
  const [error, setError] = useState("");
  const needsSize = reward?.id === "tshirt";

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.line1 || !form.city || !form.postalCode) {
      setError("Please fill in all required fields");
      return;
    }
    if (needsSize && !size) {
      setError("Please select a size");
      return;
    }
    setError("");
    onSubmit({ shippingAddress: form, size: needsSize ? size : undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>
        <h3 className="text-xl font-bold text-center text-[var(--foreground)] mb-2">Shipping Address</h3>
        <p className="text-center text-[var(--muted-foreground)] mb-6">
          Where should we send your {reward?.name}?
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full Name *" className="w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
          <input type="text" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} placeholder="Address Line 1 *" className="w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
          <input type="text" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} placeholder="Address Line 2 (optional)" className="w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City *" className="w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
            <input type="text" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" className="w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} placeholder="Postal Code *" className="w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
            <input type="text" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Country" className="w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
          </div>
          {needsSize && (
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Size *</label>
              <div className="flex flex-wrap gap-2">
                {["XS", "S", "M", "L", "XL", "2XL"].map((s) => (
                  <button key={s} type="button" onClick={() => setSize(s)} className={`px-4 py-2 rounded-lg border font-medium transition-colors ${size === s ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-[var(--surface-2)] text-[var(--foreground)] border-[var(--border)] hover:border-[var(--primary)]"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 px-4 bg-[var(--surface-2)] text-[var(--foreground)] rounded-lg font-medium hover:bg-[var(--surface-3)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-3 px-4 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50">
              {isSubmitting ? "Processing..." : "Confirm Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Supporters Page Display Name Modal
function SupportersModal({ isOpen, onClose, onSubmit, isSubmitting }) {
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!displayName.trim() || displayName.trim().length < 2) {
      setError("Please enter a display name (at least 2 characters)");
      return;
    }
    if (displayName.trim().length > 50) {
      setError("Display name must be 50 characters or less");
      return;
    }
    setError("");
    onSubmit(displayName.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
        </div>
        <h3 className="text-xl font-bold text-center text-[var(--foreground)] mb-2">Join the Supporters Page</h3>
        <p className="text-center text-[var(--muted-foreground)] mb-6">
          How would you like your name to appear on our supporters page?
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
            maxLength={50}
            className="w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] mb-2"
          />
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 px-4 bg-[var(--surface-2)] text-[var(--foreground)] rounded-lg font-medium hover:bg-[var(--surface-3)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-3 px-4 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors disabled:opacity-50">
              {isSubmitting ? "Saving..." : "Add My Name"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Success Modal
function SuccessModal({ isOpen, onClose, title, message }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h3 className="text-xl font-bold text-center text-[var(--foreground)] mb-2">{title}</h3>
        <p className="text-center text-[var(--muted-foreground)] mb-6">{message}</p>
        <button onClick={onClose} className="w-full py-3 px-4 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors">
          Done
        </button>
      </div>
    </div>
  );
}

export default function StorePage() {
  const router = useRouter();
  const [seeds, setSeeds] = useState(0);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [upgradeModal, setUpgradeModal] = useState({ isOpen: false, reward: null });
  const [giftModal, setGiftModal] = useState({ isOpen: false, reward: null });
  const [shippingModal, setShippingModal] = useState({ isOpen: false, reward: null });
  const [supportersModal, setSupportersModal] = useState({ isOpen: false, reward: null });
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: "", message: "" });
  const [redeeming, setRedeeming] = useState(null);
  const [redeemError, setRedeemError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const checkAuthAndFetch = async () => {
      // Check if user is anonymous
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.is_anonymous) {
        router.push("/");
        return;
      }

      try {
        const [seedsRes, subRes] = await Promise.all([
          authFetch("/api/seeds"),
          authFetch("/api/stripe?endpoint=subscription-status"),
        ]);

        if (seedsRes.ok) {
          const data = await seedsRes.json();
          if (!cancelled) {
            setSeeds(data.seeds?.balance ?? data.balance ?? 0);
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

    checkAuthAndFetch();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const executeRedemption = async (itemId, additionalData = {}) => {
    setRedeeming(itemId);
    setRedeemError(null);

    try {
      const res = await authFetch("/api/store/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, ...additionalData }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Redemption failed");
      }

      // Update local seed balance
      const reward = REWARDS.find((r) => r.id === itemId);
      if (reward) {
        setSeeds((prev) => prev - reward.cost);
      }

      // Close any open modals
      setGiftModal({ isOpen: false, reward: null });
      setShippingModal({ isOpen: false, reward: null });
      setSupportersModal({ isOpen: false, reward: null });

      // Show success message
      let successMessage = `You successfully redeemed "${reward?.name || itemId}"!`;
      if (data.redemption?.premiumUntil) {
        successMessage += ` Premium active until ${new Date(data.redemption.premiumUntil).toLocaleDateString()}.`;
      }
      if (data.redemption?.status === "pending" && data.redemption?.message) {
        successMessage = data.redemption.message;
      }
      if (data.redemption?.orderId) {
        successMessage += " Your order has been placed and we'll ship it soon!";
      }
      if (data.redemption?.newCourseSlots) {
        successMessage += ` You now have ${data.redemption.newCourseSlots} bonus course slots.`;
      }

      setSuccessModal({
        isOpen: true,
        title: "Redemption Successful!",
        message: successMessage,
      });

      return data;
    } catch (err) {
      setRedeemError(err.message);
      throw err;
    } finally {
      setRedeeming(null);
    }
  };

  const handleRedeem = async (reward) => {
    // Check if item needs additional input
    if (["gift_week", "gift_month"].includes(reward.id)) {
      setGiftModal({ isOpen: true, reward });
      return;
    }

    if (["sticker_pack", "tshirt", "thank_you_note", "plant_tree"].includes(reward.id)) {
      setShippingModal({ isOpen: true, reward });
      return;
    }

    if (reward.id === "supporters_page") {
      setSupportersModal({ isOpen: true, reward });
      return;
    }

    // Direct redemption for other items
    try {
      await executeRedemption(reward.id);
    } catch {
      // Error already handled in executeRedemption
    }
  };

  const handleGiftSubmit = async (recipientEmail) => {
    try {
      await executeRedemption(giftModal.reward.id, { recipientEmail });
    } catch {
      // Error already handled
    }
  };

  const handleShippingSubmit = async ({ shippingAddress, size }) => {
    try {
      await executeRedemption(shippingModal.reward.id, { shippingAddress, size });
    } catch {
      // Error already handled
    }
  };

  const handleSupportersSubmit = async (displayName) => {
    try {
      await executeRedemption(supportersModal.reward.id, { displayName });
    } catch {
      // Error already handled
    }
  };

  const handleLockedClick = (reward) => {
    setUpgradeModal({ isOpen: true, reward });
  };

  const closeUpgradeModal = () => {
    setUpgradeModal({ isOpen: false, reward: null });
  };

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <DashboardSidebar activePath="/store" />

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
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[var(--foreground)] to-[var(--muted-foreground)] bg-clip-text text-transparent">
                Seed Store
              </h1>
              <p className="mt-1 text-sm sm:text-base text-[var(--muted-foreground)]">
                Spend your seeds on rewards, upgrades, and exclusive items.
                {!isPremiumUser && !loading && (
                  <span className="ml-2 text-[var(--primary)] font-medium">
                    Upgrade to premium to unlock all rewards!
                  </span>
                )}
              </p>
            </div>
            <SeedsDisplay />
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
                isRedeeming={redeeming === reward.id}
              />
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Error toast */}
      {redeemError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {redeemError}
            <button onClick={() => setRedeemError(null)} className="ml-2 hover:text-white/80">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

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

      {/* Gift Recipient Modal */}
      <GiftRecipientModal
        isOpen={giftModal.isOpen}
        onClose={() => setGiftModal({ isOpen: false, reward: null })}
        reward={giftModal.reward}
        onSubmit={handleGiftSubmit}
        isSubmitting={redeeming === giftModal.reward?.id}
      />

      {/* Shipping Address Modal */}
      <ShippingAddressModal
        isOpen={shippingModal.isOpen}
        onClose={() => setShippingModal({ isOpen: false, reward: null })}
        reward={shippingModal.reward}
        onSubmit={handleShippingSubmit}
        isSubmitting={redeeming === shippingModal.reward?.id}
      />

      {/* Supporters Display Name Modal */}
      <SupportersModal
        isOpen={supportersModal.isOpen}
        onClose={() => setSupportersModal({ isOpen: false, reward: null })}
        onSubmit={handleSupportersSubmit}
        isSubmitting={redeeming === supportersModal.reward?.id}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, title: "", message: "" })}
        title={successModal.title}
        message={successModal.message}
      />
    </div>
  );
}
