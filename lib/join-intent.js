const JOIN_INTENT_STORAGE_KEY = "kogno_pending_join";
const JOIN_INTENT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export function storeJoinIntent(shareToken) {
  if (!shareToken || typeof window === "undefined") return;
  try {
    localStorage.setItem(
      JOIN_INTENT_STORAGE_KEY,
      JSON.stringify({ shareToken, timestamp: Date.now() })
    );
  } catch (err) {
    console.error("Failed to store join intent:", err);
  }
}

export function getJoinIntentToken() {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(JOIN_INTENT_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!parsed?.shareToken || !parsed?.timestamp) return null;
    if (Date.now() - parsed.timestamp > JOIN_INTENT_EXPIRY_MS) {
      localStorage.removeItem(JOIN_INTENT_STORAGE_KEY);
      return null;
    }
    return parsed.shareToken;
  } catch (err) {
    console.error("Failed to read join intent:", err);
    return null;
  }
}

export function getJoinRedirectPath() {
  const token = getJoinIntentToken();
  return token ? `/join/${token}` : null;
}

export function clearJoinIntent() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(JOIN_INTENT_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear join intent:", err);
  }
}

export function isJoinPath(pathname) {
  return typeof pathname === "string" && pathname.startsWith("/join/");
}

export function extractJoinToken(pathname) {
  if (!isJoinPath(pathname)) return null;
  const token = pathname.replace("/join/", "").trim();
  return token || null;
}
