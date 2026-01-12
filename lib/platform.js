/**
 * Platform detection utilities for differentiating web browser vs desktop app
 */

import { isDownloadRedirectEnabled } from "./featureFlags";

/**
 * Check if the current environment is the Electron desktop app.
 * The desktop app exposes window.electronAPI via preload script.
 * @returns {boolean} true if running in desktop app, false if in web browser
 */
export function isDesktopApp() {
  if (typeof window === 'undefined') return false;
  return typeof window.electronAPI !== 'undefined';
}

/**
 * Get the appropriate redirect destination based on platform.
 * Web users go to /download, desktop app users go to the intended path.
 * @param {string} intendedPath - The path desktop app users should go to
 * @returns {string} The redirect destination
 */
export function getRedirectDestination(intendedPath = '/dashboard') {
  if (isDesktopApp()) {
    return intendedPath;
  }
  return isDownloadRedirectEnabled() ? '/download' : intendedPath;
}
