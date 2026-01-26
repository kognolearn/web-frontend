"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

export default function PageTransition({ children }) {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    // Skip transition on initial load
    if (prevPathRef.current === pathname) {
      setDisplayChildren(children);
      return;
    }

    // Start transition
    setIsTransitioning(true);

    // After exit animation, swap content
    const swapTimer = setTimeout(() => {
      setDisplayChildren(children);
      prevPathRef.current = pathname;
    }, 150);

    // End transition after enter animation
    const endTimer = setTimeout(() => {
      setIsTransitioning(false);
    }, 300);

    return () => {
      clearTimeout(swapTimer);
      clearTimeout(endTimer);
    };
  }, [pathname, children]);

  return (
    <div className="relative w-full h-full">
      {/* Transition overlay - subtle sweep effect */}
      <div
        className={`fixed inset-0 z-[60] pointer-events-none transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isTransitioning ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          background: "linear-gradient(90deg, transparent 0%, var(--surface-1) 30%, var(--surface-1) 70%, transparent 100%)",
        }}
      />

      {/* Content with fade/slide */}
      <div
        className={`transition-all duration-200 ease-out ${
          isTransitioning
            ? "opacity-0 translate-y-2"
            : "opacity-100 translate-y-0"
        }`}
      >
        {displayChildren}
      </div>
    </div>
  );
}
