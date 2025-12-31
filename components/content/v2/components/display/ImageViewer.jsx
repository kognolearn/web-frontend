"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ZoomIn, X } from "lucide-react";

/**
 * ImageViewer - Image display with various layouts
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {Array<{url: string, caption?: string, alt: string}>} props.images - Images to display
 * @param {'single' | 'grid' | 'carousel' | 'comparison'} props.layout - Display layout
 * @param {boolean} props.zoomable - Allow zoom on click
 */
export default function ImageViewer({
  id,
  images = [],
  layout = "single",
  zoomable = true,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [comparisonPosition, setComparisonPosition] = useState(50);

  if (!images.length) {
    return (
      <div
        id={id}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-center"
      >
        <p className="text-sm text-[var(--muted-foreground)]">
          No images provided
        </p>
      </div>
    );
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleZoom = (image) => {
    if (zoomable) {
      setZoomedImage(image);
    }
  };

  const handleComparisonDrag = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = (x / rect.width) * 100;
    setComparisonPosition(Math.max(0, Math.min(100, percent)));
  };

  const renderImage = (image, index) => (
    <div
      key={index}
      className={`relative group ${zoomable ? "cursor-zoom-in" : ""}`}
      onClick={() => handleZoom(image)}
    >
      <img
        src={image.url}
        alt={image.alt || `Image ${index + 1}`}
        className="w-full h-auto rounded-xl object-contain"
      />
      {image.caption && (
        <p className="mt-2 text-sm text-center text-[var(--muted-foreground)]">
          {image.caption}
        </p>
      )}
      {zoomable && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="p-2 rounded-lg bg-black/50 text-white">
            <ZoomIn className="w-4 h-4" />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div id={id} className="v2-image-viewer">
      {/* Single Layout */}
      {layout === "single" && renderImage(images[0], 0)}

      {/* Grid Layout */}
      {layout === "grid" && (
        <div
          className={`grid gap-4 ${
            images.length === 2
              ? "grid-cols-2"
              : images.length === 3
              ? "grid-cols-3"
              : "grid-cols-2 md:grid-cols-3"
          }`}
        >
          {images.map((image, index) => renderImage(image, index))}
        </div>
      )}

      {/* Carousel Layout */}
      {layout === "carousel" && (
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.2 }}
            >
              {renderImage(images[currentIndex], currentIndex)}
            </motion.div>
          </AnimatePresence>

          {images.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Dots */}
              <div className="flex justify-center gap-2 mt-4">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentIndex
                        ? "bg-[var(--primary)]"
                        : "bg-[var(--border)]"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Comparison Layout */}
      {layout === "comparison" && images.length >= 2 && (
        <div
          className="relative overflow-hidden rounded-xl cursor-ew-resize"
          onMouseMove={handleComparisonDrag}
        >
          {/* Background (Right) Image */}
          <img
            src={images[1].url}
            alt={images[1].alt || "Comparison image 2"}
            className="w-full h-auto"
          />

          {/* Foreground (Left) Image with clip */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${comparisonPosition}%` }}
          >
            <img
              src={images[0].url}
              alt={images[0].alt || "Comparison image 1"}
              className="w-full h-auto"
              style={{
                width: `${100 / (comparisonPosition / 100)}%`,
                maxWidth: "none",
              }}
            />
          </div>

          {/* Slider Handle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
            style={{ left: `${comparisonPosition}%` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
              <div className="flex gap-0.5">
                <ChevronLeft className="w-3 h-3 text-gray-600" />
                <ChevronRight className="w-3 h-3 text-gray-600" />
              </div>
            </div>
          </div>

          {/* Labels */}
          {images[0].caption && (
            <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/50 text-white text-xs">
              {images[0].caption}
            </div>
          )}
          {images[1].caption && (
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/50 text-white text-xs">
              {images[1].caption}
            </div>
          )}
        </div>
      )}

      {/* Zoom Modal */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setZoomedImage(null)}
          >
            <button
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              onClick={() => setZoomedImage(null)}
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={zoomedImage.url}
              alt={zoomedImage.alt}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {zoomedImage.caption && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-black/50 text-white text-sm">
                {zoomedImage.caption}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
