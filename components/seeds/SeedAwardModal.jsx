"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const REASON_LABELS = {
  referral_signup: "Referral Bonus",
  referral_premium: "Premium Referral Bonus",
  first_course_created: "First Course Created",
  first_lesson_completed: "First Lesson Completed",
  course_completed: "Course Completed",
  streak_7_day: "7-Day Streak",
  streak_30_day: "30-Day Streak",
  return_after_inactivity: "Welcome Back",
  review_submitted: "Review Submitted",
  feedback_confirmed: "Feedback Confirmed",
  admin_adjustment: "Bonus Seeds",
};

const REASON_DESCRIPTIONS = {
  referral_signup: "Someone you referred just signed up!",
  referral_premium: "Your referral just upgraded to Premium!",
  first_course_created: "You created your first course!",
  first_lesson_completed: "You completed your first lesson!",
  course_completed: "You mastered all lessons in a course!",
  streak_7_day: "You've been learning for 7 days straight!",
  streak_30_day: "Incredible! 30 days of consistent learning!",
  return_after_inactivity: "Great to see you back! Here's a bonus.",
  review_submitted: "Thanks for sharing your experience!",
  feedback_confirmed: "Your feedback was helpful. Thank you!",
  admin_adjustment: "You received a special bonus!",
};

export default function SeedAwardModal({
  amount,
  reason,
  description,
  onClose,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [seedScale, setSeedScale] = useState(0);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => {
      setIsVisible(true);
      setTimeout(() => setSeedScale(1), 100);
    });

    // Auto-close after 3 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setSeedScale(0);
    setTimeout(onClose, 300);
  };

  const label = REASON_LABELS[reason] || reason || "Seeds Earned";
  const desc = description || REASON_DESCRIPTIONS[reason] || "You earned some seeds!";

  return (
    <div
      className={`fixed inset-0 z-[9998] flex items-center justify-center transition-all duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal content */}
      <div
        className={`relative bg-[var(--surface-1)] border border-[var(--border)] rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl transform transition-all duration-300 ${
          isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-[var(--primary)]/30 rounded-full blur-3xl" />

        {/* Seed icon with animation */}
        <div className="relative flex justify-center mb-6">
          <div
            className="relative"
            style={{
              transform: `scale(${seedScale})`,
              transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <Image
              src="/images/seed_icon.png"
              alt="Seeds"
              width={80}
              height={80}
              className="drop-shadow-xl"
            />
            {/* Sparkle effects */}
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping opacity-75" />
            <div className="absolute -bottom-1 -left-2 w-3 h-3 bg-[var(--primary)] rounded-full animate-ping opacity-75 animation-delay-150" />
          </div>
        </div>

        {/* Amount */}
        <div className="text-center mb-4">
          <div className="text-5xl font-bold text-[var(--primary)] mb-2">
            +{amount}
          </div>
          <div className="text-lg font-semibold text-[var(--foreground)]">
            {label}
          </div>
        </div>

        {/* Description */}
        <p className="text-center text-[var(--muted-foreground)] mb-6">
          {desc}
        </p>

        {/* Continue button */}
        <button
          type="button"
          onClick={handleClose}
          className="w-full py-3 px-4 rounded-xl bg-[var(--primary)] text-[var(--primary-contrast)] font-semibold hover:bg-[var(--primary)]/90 transition-colors"
        >
          Collect Seeds
        </button>
      </div>
    </div>
  );
}
