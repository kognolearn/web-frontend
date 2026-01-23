"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";

/**
 * A single flying seed that animates from source to target position
 */
export default function FlyingSeed({
  startX,
  startY,
  endX,
  endY,
  delay = 0,
  duration = 600,
  onComplete,
  size = 24,
}) {
  const [phase, setPhase] = useState("waiting"); // waiting, flying, done
  const [position, setPosition] = useState({ x: startX, y: startY });
  const [scale, setScale] = useState(0);
  const [opacity, setOpacity] = useState(0);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    // Initial delay before starting
    const delayTimer = setTimeout(() => {
      setPhase("flying");
      setScale(1);
      setOpacity(1);
      startTimeRef.current = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out cubic)
        const eased = 1 - Math.pow(1 - progress, 3);

        // Calculate position with slight arc
        const arcHeight = Math.min(100, Math.abs(endY - startY) * 0.3);
        const arcProgress = Math.sin(progress * Math.PI);

        const x = startX + (endX - startX) * eased;
        const y = startY + (endY - startY) * eased - arcHeight * arcProgress;

        setPosition({ x, y });

        // Scale down near the end
        if (progress > 0.7) {
          setScale(1 - (progress - 0.7) / 0.3 * 0.3);
        }

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setPhase("done");
          setOpacity(0);
          onComplete?.();
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(delayTimer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [startX, startY, endX, endY, delay, duration, onComplete]);

  if (phase === "done") return null;

  return (
    <div
      className="fixed pointer-events-none z-[9999]"
      style={{
        left: position.x,
        top: position.y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        transition: phase === "waiting" ? "none" : "opacity 0.1s",
      }}
    >
      <Image
        src="/images/seed_icon.png"
        alt=""
        width={size}
        height={size}
        className="drop-shadow-lg"
      />
    </div>
  );
}
