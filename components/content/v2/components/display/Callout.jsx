"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import { Info, Lightbulb, AlertTriangle, AlertCircle, BookOpen, ChevronDown } from "lucide-react";

const CALLOUT_STYLES = {
  info: {
    icon: Info,
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    iconColor: "text-blue-500",
    titleColor: "text-blue-600 dark:text-blue-400",
  },
  tip: {
    icon: Lightbulb,
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    iconColor: "text-emerald-500",
    titleColor: "text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    iconColor: "text-amber-500",
    titleColor: "text-amber-600 dark:text-amber-400",
  },
  error: {
    icon: AlertCircle,
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    iconColor: "text-rose-500",
    titleColor: "text-rose-600 dark:text-rose-400",
  },
  definition: {
    icon: BookOpen,
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    iconColor: "text-purple-500",
    titleColor: "text-purple-600 dark:text-purple-400",
  },
};

const DEFAULT_TITLES = {
  info: "Info",
  tip: "Tip",
  warning: "Warning",
  error: "Error",
  definition: "Definition",
};

/**
 * Callout - Highlighted info/warning/tip boxes
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {'info' | 'tip' | 'warning' | 'error' | 'definition'} props.type - Callout type
 * @param {string} [props.title] - Optional title
 * @param {string} props.content - Markdown content
 * @param {boolean} props.collapsible - Whether callout can be collapsed
 */
export default function Callout({
  id,
  type = "info",
  title,
  content,
  collapsible = false,
}) {
  const [isOpen, setIsOpen] = useState(true);
  const style = CALLOUT_STYLES[type] || CALLOUT_STYLES.info;
  const Icon = style.icon;
  const displayTitle = title || DEFAULT_TITLES[type];

  const handleToggle = () => {
    if (collapsible) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div
      id={id}
      className={`v2-callout rounded-xl border ${style.border} ${style.bg} overflow-hidden`}
    >
      {/* Header */}
      <div
        className={`flex items-center gap-3 px-4 py-3 ${
          collapsible ? "cursor-pointer select-none hover:bg-white/5" : ""
        }`}
        onClick={handleToggle}
        role={collapsible ? "button" : undefined}
        aria-expanded={collapsible ? isOpen : undefined}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 ${style.iconColor}`} />
        <span className={`font-semibold text-sm ${style.titleColor}`}>
          {displayTitle}
        </span>
        {collapsible && (
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="ml-auto"
          >
            <ChevronDown className={`w-4 h-4 ${style.iconColor}`} />
          </motion.div>
        )}
      </div>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 pt-0 prose prose-sm max-w-none dark:prose-invert">
              <MarkdownRenderer content={content} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
