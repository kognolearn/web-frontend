"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  useCodeEditorSettings,
  editorThemeOptions,
  editorFontOptions
} from "@/components/editor/CodeEditorSettingsProvider";
import { Code2, ChevronDown, RotateCcw } from "lucide-react";

export default function PersonalizationModal({ isOpen, onClose }) {
  const { themeMode, setThemeMode } = useTheme();
  const { settings, updateSetting, resetSettings
  } = useCodeEditorSettings();
  const [showEditorSettings, setShowEditorSettings] = useState(false);

  if (!isOpen) return null;

  const appearanceOptions = [
    {
      id: "system",
      label: "System",
      description: "Automatically match your device's appearance",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: "light",
      label: "Light",
      description: "Always use light mode",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M6.05 6.05 4.636 4.636m12.728 0l-1.414 1.414M6.05 17.95l-1.414 1.414M12 8a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
      ),
    },
    {
      id: "dark",
      label: "Dark",
      description: "Always use dark mode",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      ),
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] sm:w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[var(--border)] bg-[var(--surface-1)]/95 shadow-2xl backdrop-blur-xl flex flex-col max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4 sm:px-6 sm:py-5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                  <svg className="h-5 w-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">Personalization</h2>
                  <p className="text-xs text-[var(--muted-foreground)]">Customize your experience</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 transition-colors hover:bg-[var(--surface-muted)]"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Appearance Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  Appearance
                </h3>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Choose how Kogno looks to you. Select a single theme or sync with your system.
                </p>
                
                <div className="space-y-2 mt-4">
                  {appearanceOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setThemeMode(option.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        themeMode === option.id
                          ? "border-[var(--primary)] bg-[var(--primary)]/10"
                          : "border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--surface-muted)]/50"
                      }`}
                    >
                      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                        themeMode === option.id
                          ? "bg-[var(--primary)] text-white"
                          : "bg-[var(--surface-muted)] text-[var(--muted-foreground)]"
                      }`}>
                        {option.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`text-sm font-medium ${
                          themeMode === option.id ? "text-[var(--primary)]" : "text-[var(--foreground)]"
                        }`}>
                          {option.label}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {option.description}
                        </p>
                      </div>
                      {themeMode === option.id && (
                        <svg className="w-5 h-5 text-[var(--primary)]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Editor Section */}
              <div className="space-y-3 pt-5 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowEditorSettings(!showEditorSettings)}
                  className="w-full flex items-center justify-between"
                >
                  <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[var(--primary)]" />
                    Code Editor
                  </h3>
                  <ChevronDown className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${showEditorSettings ? 'rotate-180' : ''}`} />
                </button>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Customize the code editor for interactive tasks
                </p>

                <AnimatePresence>
                  {showEditorSettings && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 space-y-4">
                        {/* Editor Theme */}
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-[var(--foreground)]">
                            Editor Theme
                          </label>
                          <select
                            value={settings.theme}
                            onChange={(e) => updateSetting("theme", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                          >
                            {editorThemeOptions.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Font Size */}
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-[var(--foreground)]">
                            Font Size: {settings.fontSize}px
                          </label>
                          <input
                            type="range"
                            min="10"
                            max="24"
                            value={settings.fontSize}
                            onChange={(e) => updateSetting("fontSize", Number(e.target.value))}
                            className="w-full h-2 bg-[var(--surface-2)] rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
                          />
                          <div className="flex justify-between text-[10px] text-[var(--muted-foreground)]">
                            <span>10px</span>
                            <span>24px</span>
                          </div>
                        </div>

                        {/* Font Family */}
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-[var(--foreground)]">
                            Font Family
                          </label>
                          <select
                            value={settings.fontFamily}
                            onChange={(e) => updateSetting("fontFamily", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                          >
                            {editorFontOptions.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Toggle Options */}
                        <div className="space-y-3">
                          {/* Line Numbers */}
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-xs font-medium text-[var(--foreground)]">Line Numbers</span>
                            <button
                              type="button"
                              onClick={() => updateSetting("lineNumbers", !settings.lineNumbers)}
                              className={`relative w-10 h-5 rounded-full transition-colors ${
                                settings.lineNumbers ? "bg-[var(--primary)]" : "bg-[var(--surface-muted)]"
                              }`}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                                settings.lineNumbers ? "translate-x-5" : ""
                              }`} />
                            </button>
                          </label>

                          {/* Minimap */}
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-xs font-medium text-[var(--foreground)]">Minimap</span>
                            <button
                              type="button"
                              onClick={() => updateSetting("minimap", !settings.minimap)}
                              className={`relative w-10 h-5 rounded-full transition-colors ${
                                settings.minimap ? "bg-[var(--primary)]" : "bg-[var(--surface-muted)]"
                              }`}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                                settings.minimap ? "translate-x-5" : ""
                              }`} />
                            </button>
                          </label>

                          {/* Word Wrap */}
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-xs font-medium text-[var(--foreground)]">Word Wrap</span>
                            <button
                              type="button"
                              onClick={() => updateSetting("wordWrap", !settings.wordWrap)}
                              className={`relative w-10 h-5 rounded-full transition-colors ${
                                settings.wordWrap ? "bg-[var(--primary)]" : "bg-[var(--surface-muted)]"
                              }`}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                                settings.wordWrap ? "translate-x-5" : ""
                              }`} />
                            </button>
                          </label>

                          {/* Bracket Pair Colorization */}
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-xs font-medium text-[var(--foreground)]">Bracket Colorization</span>
                            <button
                              type="button"
                              onClick={() => updateSetting("bracketPairColorization", !settings.bracketPairColorization)}
                              className={`relative w-10 h-5 rounded-full transition-colors ${
                                settings.bracketPairColorization ? "bg-[var(--primary)]" : "bg-[var(--surface-muted)]"
                              }`}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                                settings.bracketPairColorization ? "translate-x-5" : ""
                              }`} />
                            </button>
                          </label>

                          {/* Font Ligatures */}
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-xs font-medium text-[var(--foreground)]">Font Ligatures</span>
                            <button
                              type="button"
                              onClick={() => updateSetting("fontLigatures", !settings.fontLigatures)}
                              className={`relative w-10 h-5 rounded-full transition-colors ${
                                settings.fontLigatures ? "bg-[var(--primary)]" : "bg-[var(--surface-muted)]"
                              }`}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                                settings.fontLigatures ? "translate-x-5" : ""
                              }`} />
                            </button>
                          </label>
                        </div>

                        {/* Reset Button */}
                        <button
                          type="button"
                          onClick={resetSettings}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/50 transition-all"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reset to Defaults
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--border)] px-4 py-4 sm:px-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-all"
              >
                Done
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
