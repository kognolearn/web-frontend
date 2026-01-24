"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

/**
 * Simple notification that slides down from top when seeds are awarded
 */
export default function SeedNotification({ amount, reason, onComplete }) {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Slide in
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Auto-dismiss after 2.5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete?.();
      }, 300);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-[var(--surface-1)] border border-[var(--primary)]/30 shadow-lg shadow-black/20 backdrop-blur-xl">
        <div className="relative">
          <Image
            src="/images/seed_icon.png"
            alt="Seeds"
            width={28}
            height={28}
            className="w-7 h-7 object-contain animate-bounce"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-[var(--primary)]">+{amount}</span>
          <span className="text-sm text-[var(--muted-foreground)]">{reason || "Seeds earned!"}</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
