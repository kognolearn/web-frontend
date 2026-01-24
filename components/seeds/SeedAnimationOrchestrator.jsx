"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useSeeds } from "./SeedsProvider";
import FlyingSeed from "./FlyingSeed";
import SeedAwardModal from "./SeedAwardModal";
import SeedNotification from "./SeedNotification";

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
    pendingNotifications,
    dismissNotification,
  } = useSeeds();

  const [currentAnimation, setCurrentAnimation] = useState(null);
  const [flyingSeeds, setFlyingSeeds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [counterRef, setCounterRef] = useState(null);
  const [mounted, setMounted] = useState(false);
  const processingRef = useRef(false);
  const completedSeedsRef = useRef(new Set());
  const totalSeedsRef = useRef(0);
  const currentAnimationRef = useRef(null);

  // Keep currentAnimation ref in sync
  useEffect(() => {
    currentAnimationRef.current = currentAnimation;
  }, [currentAnimation]);

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

  const finishAnimation = useCallback(() => {
    const anim = currentAnimationRef.current;
    if (anim) {
      completeAnimation(anim.id);
    }
    setCurrentAnimation(null);
    setFlyingSeeds([]);
    processingRef.current = false;
  }, [completeAnimation]);

  // Process animations from the queue
  useEffect(() => {
    if (processingRef.current || pendingAnimations.length === 0) return;

    processingRef.current = true;
    const animation = processNextAnimation();
    if (animation) {
      setCurrentAnimation(animation);
    }
  }, [pendingAnimations, processNextAnimation]);

  const getCounterPosition = useCallback(() => {
    if (!counterRef) return { x: window.innerWidth - 100, y: 50 };
    const rect = counterRef.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }, [counterRef]);

  // Constant interval between seeds for consistent flow rate (100ms between each seed)
  const SEED_INTERVAL = 100;

  const startCourseAnimation = useCallback((courseCard, animation) => {
    const cardRect = courseCard.getBoundingClientRect();
    const targetPos = getCounterPosition();

    // Show exactly the number of seeds earned (cap at 50 for performance)
    const seedCount = Math.min(animation.amount, 50);
    const seeds = [];

    for (let i = 0; i < seedCount; i++) {
      seeds.push({
        id: `${animation.id}-seed-${i}`,
        startX: cardRect.left + cardRect.width / 2 + (Math.random() - 0.5) * 60,
        startY: cardRect.top + cardRect.height / 2 + (Math.random() - 0.5) * 40,
        endX: targetPos.x,
        endY: targetPos.y,
        delay: i * SEED_INTERVAL, // Constant rate flow
      });
    }

    // Reset completion tracking
    completedSeedsRef.current = new Set();
    totalSeedsRef.current = seeds.length;
    setFlyingSeeds(seeds);
  }, [getCounterPosition]);

  const startCenterAnimation = useCallback((animation) => {
    const targetPos = getCounterPosition();
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Show exactly the number of seeds earned (cap at 50 for performance)
    const seedCount = Math.min(animation.amount, 50);
    const seeds = [];

    for (let i = 0; i < seedCount; i++) {
      seeds.push({
        id: `${animation.id}-seed-${i}`,
        startX: centerX + (Math.random() - 0.5) * 100,
        startY: centerY + (Math.random() - 0.5) * 100,
        endX: targetPos.x,
        endY: targetPos.y,
        delay: i * SEED_INTERVAL, // Constant rate flow
      });
    }

    // Reset completion tracking
    completedSeedsRef.current = new Set();
    totalSeedsRef.current = seeds.length;
    setFlyingSeeds(seeds);
  }, [getCounterPosition]);

  const handleSeedComplete = useCallback((seedId) => {
    // Prevent duplicate calls for same seed
    if (completedSeedsRef.current.has(seedId)) return;
    completedSeedsRef.current.add(seedId);

    playSound();

    // Trigger counter pulse animation
    if (counterRef) {
      counterRef.classList.add("seed-counter-pulse");
      setTimeout(() => {
        counterRef.classList.remove("seed-counter-pulse");
      }, 200);
    }

    // Check if all seeds are done (don't update flyingSeeds state during animation)
    if (completedSeedsRef.current.size >= totalSeedsRef.current) {
      const anim = currentAnimationRef.current;
      if (anim) {
        // All seeds have landed, increment the displayed balance
        incrementBalance(anim.amount);
      }
      setTimeout(() => {
        setFlyingSeeds([]); // Clear only at the very end
        finishAnimation();
      }, 100);
    }
  }, [counterRef, incrementBalance, playSound, finishAnimation]);

  const handleModalClose = useCallback(() => {
    setShowModal(false);
    if (currentAnimation) {
      // Start flying animation from center after modal
      startCenterAnimation(currentAnimation);
    }
  }, [currentAnimation, startCenterAnimation]);

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
  }, [currentAnimation, mounted, counterRef, startCourseAnimation, startCenterAnimation, finishAnimation]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* In-course notifications (toast from top) */}
      {pendingNotifications.map((notification) => (
        <SeedNotification
          key={notification.id}
          amount={notification.amount}
          reason={notification.reason}
          onComplete={() => dismissNotification(notification.id)}
        />
      ))}

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
