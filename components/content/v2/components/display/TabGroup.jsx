"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";

/**
 * TabGroup - Tabbed content panels
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {Array<{id: string, label: string, content: string, icon?: string}>} props.tabs - Tab items
 * @param {string} [props.default_tab] - Default tab ID
 */
export default function TabGroup({
  id,
  tabs = [],
  default_tab,
}) {
  const [activeTab, setActiveTab] = useState(
    default_tab || (tabs.length > 0 ? tabs[0].id : null)
  );

  if (!tabs.length) {
    return null;
  }

  const activeTabContent = tabs.find((tab) => tab.id === activeTab);

  return (
    <div id={id} className="v2-tab-group">
      {/* Tab Headers */}
      <div className="flex border-b border-[var(--border)] overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative flex items-center gap-2 px-4 py-3 text-sm font-medium
                transition-colors whitespace-nowrap
                ${
                  isActive
                    ? "text-[var(--primary)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }
              `}
            >
              {tab.icon && <span>{tab.icon}</span>}
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId={`tab-indicator-${id}`}
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTabContent && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="prose prose-sm max-w-none dark:prose-invert"
          >
            <MarkdownRenderer content={activeTabContent.content} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
