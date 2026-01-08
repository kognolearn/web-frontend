"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const CodeEditorSettingsContext = createContext(undefined);

const storageKey = "edtech-code-editor-settings";

// Default settings
const defaultSettings = {
  theme: "vs-dark", // vs-dark, vs-light, hc-black, hc-light
  fontSize: 14,
  fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
  lineNumbers: true,
  minimap: false,
  wordWrap: false,
  bracketPairColorization: true,
  fontLigatures: true,
  tabSize: 2,
  renderWhitespace: "none", // none, boundary, selection, trailing, all
  cursorBlinking: "blink", // blink, smooth, phase, expand, solid
  cursorStyle: "line", // line, block, underline, line-thin, block-outline, underline-thin
  smoothScrolling: true,
  autoClosingBrackets: "always", // always, languageDefined, beforeWhitespace, never
  formatOnPaste: false,
  formatOnType: false,
};

// Available theme options
export const editorThemeOptions = [
  { id: "vs-dark", label: "Dark (VS Code)", description: "Default dark theme" },
  { id: "vs-light", label: "Light (VS Code)", description: "Default light theme" },
  { id: "hc-black", label: "High Contrast Dark", description: "High contrast dark theme" },
  { id: "hc-light", label: "High Contrast Light", description: "High contrast light theme" },
];

// Available font options
export const editorFontOptions = [
  { id: "'Fira Code', monospace", label: "Fira Code" },
  { id: "'Cascadia Code', monospace", label: "Cascadia Code" },
  { id: "'JetBrains Mono', monospace", label: "JetBrains Mono" },
  { id: "Consolas, monospace", label: "Consolas" },
  { id: "'Source Code Pro', monospace", label: "Source Code Pro" },
  { id: "'Monaco', monospace", label: "Monaco" },
  { id: "monospace", label: "System Monospace" },
];

export function CodeEditorSettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [mounted, setMounted] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all keys exist
        setSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.error("Error loading code editor settings:", e);
    }
    setMounted(true);
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch (e) {
      console.error("Error saving code editor settings:", e);
    }
  }, [settings, mounted]);

  // Update a single setting
  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Update multiple settings at once
  const updateSettings = useCallback((newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  // Get Monaco editor options from settings
  // Note: theme is NOT included here - it's passed separately to Monaco
  const getMonacoOptions = useCallback(() => {
    return {
      fontSize: settings.fontSize,
      fontFamily: settings.fontFamily,
      lineNumbers: settings.lineNumbers ? "on" : "off",
      minimap: { enabled: settings.minimap },
      wordWrap: settings.wordWrap ? "on" : "off",
      fontLigatures: settings.fontLigatures,
      tabSize: settings.tabSize,
      renderWhitespace: settings.renderWhitespace,
      cursorBlinking: settings.cursorBlinking,
      cursorStyle: settings.cursorStyle,
      smoothScrolling: settings.smoothScrolling,
      autoClosingBrackets: settings.autoClosingBrackets,
      formatOnPaste: settings.formatOnPaste,
      formatOnType: settings.formatOnType,
      // Bracket pair colorization
      bracketPairColorization: {
        enabled: settings.bracketPairColorization,
      },
      // Additional VS Code-like defaults
      scrollBeyondLastLine: false,
      automaticLayout: true,
      padding: { top: 12, bottom: 12 },
      scrollbar: {
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
        useShadows: false,
      },
      overviewRulerBorder: false,
      hideCursorInOverviewRuler: true,
      renderLineHighlight: "line",
      matchBrackets: "always",
      guides: {
        bracketPairs: settings.bracketPairColorization,
        indentation: true,
      },
      folding: true,
      foldingHighlight: true,
      showFoldingControls: "mouseover",
    };
  }, [settings]);

  const value = useMemo(
    () => ({
      settings,
      updateSetting,
      updateSettings,
      resetSettings,
      getMonacoOptions,
      mounted,
    }),
    [settings, updateSetting, updateSettings, resetSettings, getMonacoOptions, mounted]
  );

  return (
    <CodeEditorSettingsContext.Provider value={value}>
      {children}
    </CodeEditorSettingsContext.Provider>
  );
}

// Default Monaco options for SSR/fallback
const defaultMonacoOptions = {
  fontSize: 14,
  fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
  lineNumbers: "on",
  minimap: { enabled: false },
  wordWrap: "off",
  fontLigatures: true,
  tabSize: 2,
  renderWhitespace: "none",
  cursorBlinking: "blink",
  cursorStyle: "line",
  smoothScrolling: true,
  autoClosingBrackets: "always",
  formatOnPaste: false,
  formatOnType: false,
  bracketPairColorization: { enabled: true },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  padding: { top: 12, bottom: 12 },
  scrollbar: {
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
    useShadows: false,
  },
  overviewRulerBorder: false,
  hideCursorInOverviewRuler: true,
  renderLineHighlight: "line",
  matchBrackets: "always",
  guides: { bracketPairs: true, indentation: true },
  folding: true,
  foldingHighlight: true,
  showFoldingControls: "mouseover",
};

export function useCodeEditorSettings() {
  const ctx = useContext(CodeEditorSettingsContext);

  // Provide safe defaults if context is not available (SSR or missing provider)
  if (!ctx) {
    return {
      settings: defaultSettings,
      updateSetting: () => {},
      updateSettings: () => {},
      resetSettings: () => {},
      getMonacoOptions: () => defaultMonacoOptions,
      mounted: false,
    };
  }
  return ctx;
}
