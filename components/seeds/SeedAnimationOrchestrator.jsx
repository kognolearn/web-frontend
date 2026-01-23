"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useSeeds } from "./SeedsProvider";
import FlyingSeed from "./FlyingSeed";
import SeedAwardModal from "./SeedAwardModal";

/**
 * Global orchestrator for seed animations
 * Should be mounted once at the app level
 */
export default function SeedAnimationOrchestrator() {
  const {
    pendingAnimations,
    processNextAnimation,
    completeAnimation,
    incrementBalance,
    playSound,
  } = useSeeds();

  const [currentAnimation, setCurrentAnimation] = useState(null);
  const [flyingSeeds, setFlyingSeeds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [counterRef, setCounterRef] = useState(null);
  const [mounted, setMounted] = useState(false);
  const processingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    // Find the seed counter element
    const findCounter = () => {
      const counter = document.querySelector('[data-seed-counter]');
      if (counter) {
        setCounterRef(counter);
      }
    };
    findCounter();
    // Re-check periodically in case it mounts later
    const interval = setInterval(findCounter, 1000);
    return () => clearInterval(interval);
  }, []);

  // Process animations from the queue
  useEffect(() => {
    if (processingRef.current || pendingAnimations.length === 0) return;

    processingRef.current = true;
    const animation = processNextAnimation();
    if (animation) {
      setCurrentAnimation(animation);
    }
  }, [pendingAnimations, processNextAnimation]);

  // Handle the current animation
  useEffect(() => {
    if (!currentAnimation || !mounted) return;

    if (currentAnimation.type === "modal") {
      setShowModal(true);
    } else if (currentAnimation.type === "course") {
      // Find the course card element
      const courseCard = document.querySelector(`[data-course-id="${currentAnimation.courseId}"]`);
      if (courseCard && counterRef) {
        startCourseAnimation(courseCard, currentAnimation);
      } else if (counterRef) {
        // Fallback: animate from center of screen
        startCenterAnimation(currentAnimation);
      } else {
        // No counter visible, just complete
        finishAnimation();
      }
    }
  }, [currentAnimation, mounted, counterRef]);

  const getCounterPosition = useCallback(() => {
    if (!counterRef) return { x: window.innerWidth - 100, y: 50 };
    const rect = counterRef.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }, [counterRef]);

  const startCourseAnimation = useCallback((courseCard, animation) => {
    const cardRect = courseCard.getBoundingClientRect();
    const targetPos = getCounterPosition();

    // Create multiple seeds flying from the card
    const seedCount = Math.min(animation.amount, 10); // Max 10 visual seeds
    const seeds = [];

    for (let i = 0; i < seedCount; i++) {
      seeds.push({
        id: `${animation.id}-seed-${i}`,
        startX: cardRect.left + cardRect.width / 2 + (Math.random() - 0.5) * 60,
        startY: cardRect.top + cardRect.height / 2 + (Math.random() - 0.5) * 40,
        endX: targetPos.x,
        endY: targetPos.y,
        delay: i * 50, // Staggered launch
      });
    }

    setFlyingSeeds(seeds);
  }, [getCounterPosition]);

  const startCenterAnimation = useCallback((animation) => {
    const targetPos = getCounterPosition();
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const seedCount = Math.min(animation.amount, 10);
    const seeds = [];

    for (let i = 0; i < seedCount; i++) {
      seeds.push({
        id: `${animation.id}-seed-${i}`,
        startX: centerX + (Math.random() - 0.5) * 100,
        startY: centerY + (Math.random() - 0.5) * 100,
        endX: targetPos.x,
        endY: targetPos.y,
        delay: i * 50,
      });
    }

    setFlyingSeeds(seeds);
  }, [getCounterPosition]);

  const handleSeedComplete = useCallback((seedId) => {
    playSound();

    // Trigger counter pulse animation
    if (counterRef) {
      counterRef.classList.add("seed-counter-pulse");
      setTimeout(() => {
        counterRef.classList.remove("seed-counter-pulse");
      }, 200);
    }

    setFlyingSeeds((prev) => {
      const remaining = prev.filter((s) => s.id !== seedId);
      if (remaining.length === 0 && currentAnimation) {
        // All seeds have landed, increment the displayed balance
        incrementBalance(currentAnimation.amount);
        setTimeout(finishAnimation, 100);
      }
      return remaining;
    });
  }, [counterRef, currentAnimation, incrementBalance, playSound]);

  const handleModalClose = useCallback(() => {
    setShowModal(false);
    if (currentAnimation) {
      // Start flying animation from center after modal
      startCenterAnimation(currentAnimation);
    }
  }, [currentAnimation, startCenterAnimation]);

  const finishAnimation = useCallback(() => {
    if (currentAnimation) {
      completeAnimation(currentAnimation.id);
    }
    setCurrentAnimation(null);
    setFlyingSeeds([]);
    processingRef.current = false;
  }, [currentAnimation, completeAnimation]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Flying seeds */}
      {flyingSeeds.map((seed) => (
        <FlyingSeed
          key={seed.id}
          startX={seed.startX}
          startY={seed.startY}
          endX={seed.endX}
          endY={seed.endY}
          delay={seed.delay}
          onComplete={() => handleSeedComplete(seed.id)}
        />
      ))}

      {/* Award modal for non-course seeds */}
      {showModal && currentAnimation && (
        <SeedAwardModal
          amount={currentAnimation.amount}
          reason={currentAnimation.reason}
          description={currentAnimation.description}
          onClose={handleModalClose}
        />
      )}
    </>,
    document.body
  );
}
