"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import { ChevronDown } from "lucide-react";

/**
 * Accordion - Collapsible sections
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {Array<{id: string, title: string, content: string, initially_open: boolean}>} props.sections - Sections
 * @param {boolean} props.allow_multiple_open - Allow multiple sections open at once
 */
export default function Accordion({
  id,
  sections = [],
  allow_multiple_open = false,
}) {
  // Initialize open sections based on initially_open flag
  const [openSections, setOpenSections] = useState(() => {
    const initial = new Set();
    sections.forEach((section) => {
      if (section.initially_open) {
        initial.add(section.id);
      }
    });
    return initial;
  });

  const toggleSection = (sectionId) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        if (!allow_multiple_open) {
          next.clear();
        }
        next.add(sectionId);
      }
      return next;
    });
  };

  if (!sections.length) {
    return null;
  }

  return (
    <div id={id} className="v2-accordion space-y-2">
      {sections.map((section, index) => {
        const isOpen = openSections.has(section.id);
        const isFirst = index === 0;
        const isLast = index === sections.length - 1;

        return (
          <div
            key={section.id}
            className={`
              border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden
              ${isFirst ? "rounded-t-xl" : ""}
              ${isLast ? "rounded-b-xl" : ""}
              ${!isFirst && !isLast ? "" : ""}
            `}
          >
            {/* Header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--surface-2)]/50 transition-colors"
              aria-expanded={isOpen}
            >
              <span className="font-medium text-[var(--foreground)]">
                {section.title}
              </span>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" />
              </motion.div>
            </button>

            {/* Content */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="px-4 pb-4 border-t border-[var(--border)] pt-4">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <MarkdownRenderer content={section.content} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
