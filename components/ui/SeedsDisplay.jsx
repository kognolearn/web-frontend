"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSeeds } from "@/components/seeds/SeedsProvider";

export default function SeedsDisplay({ className = "" }) {
  const { balance, loading } = useSeeds();
  const [displayedBalance, setDisplayedBalance] = useState(null);
  const [isIncrementing, setIsIncrementing] = useState(false);
  const prevBalanceRef = useRef(null);
  const animationRef = useRef(null);

  // Animate counter when balance changes - increment one at a time
  useEffect(() => {
    if (balance === null) return;

    // First load - just set the value
    if (prevBalanceRef.current === null) {
      setDisplayedBalance(balance);
      prevBalanceRef.current = balance;
      return;
    }

    // Balance increased - animate the counter one at a time
    if (balance > prevBalanceRef.current) {
      const startValue = displayedBalance ?? prevBalanceRef.current;
      const endValue = balance;
      const diff = endValue - startValue;

      // Calculate delay per step - faster for smaller amounts, slower base for larger
      // Min 50ms per step, max 150ms per step, adjust based on total diff
      const delayPerStep = Math.max(50, Math.min(150, 1500 / diff));

      let currentValue = startValue;
      setIsIncrementing(true);

      const stepUp = () => {
        currentValue += 1;
        setDisplayedBalance(currentValue);

        if (currentValue < endValue) {
          animationRef.current = setTimeout(stepUp, delayPerStep);
        } else {
          setIsIncrementing(false);
        }
      };

      // Clear any existing animation
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }

      // Start stepping
      animationRef.current = setTimeout(stepUp, delayPerStep);
      prevBalanceRef.current = balance;
    } else {
      // Balance decreased or same - just set it
      setDisplayedBalance(balance);
      prevBalanceRef.current = balance;
    }

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [balance, displayedBalance]);

  if (loading) {
    return (
      <Link
        href="/store"
        className={`inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-[var(--primary)]/20 to-[var(--primary)]/10 border border-[var(--primary)]/30 ${className}`}
      >
        <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] animate-pulse" />
        <div className="w-20 h-7 rounded bg-[var(--surface-2)] animate-pulse" />
      </Link>
    );
  }

  const showBalance = displayedBalance ?? balance ?? 0;

  return (
    <Link
      href="/store"
      data-seed-counter
      className={`group inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[var(--primary)]/15 border-2 border-dashed border-[var(--primary)]/40 hover:border-solid hover:border-[var(--primary)] hover:bg-[var(--primary)]/20 transition-all duration-300 cursor-pointer ${className} ${
        isIncrementing ? "seed-counter-active" : ""
      }`}
      title="Visit the Seed Store"
    >
      <Image
        src="/images/seed_icon.png"
        alt="Seeds"
        width={28}
        height={28}
        className={`w-7 h-7 object-contain transition-transform duration-300 ${
          isIncrementing ? "animate-bounce" : "group-hover:rotate-12"
        }`}
      />
      <span
        className={`text-xl font-bold text-[var(--primary)] transition-transform ${
          isIncrementing ? "scale-110" : ""
        }`}
      >
        {showBalance.toLocaleString()}
      </span>
      <span className="max-w-0 overflow-hidden group-hover:max-w-24 transition-all duration-300 ease-out text-base font-medium text-[var(--primary)]/80 whitespace-nowrap">
        seeds
      </span>
    </Link>
  );
}
