import { authFetch } from "@/lib/api";

export const DEFAULT_USER_SETTINGS = {
  default_college: null,
  tour_completed: false,
  tour_phase: null,
  tour_state_version: 2,
};

function normalizeUserSettings(settings) {
  return {
    ...DEFAULT_USER_SETTINGS,
    ...(settings || {}),
  };
}

export async function fetchUserSettings() {
  const res = await authFetch("/api/user/settings", { method: "GET" });
  if (res.status === 401) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Failed to fetch user settings");
  }
  return normalizeUserSettings(data.settings);
}

export async function patchUserSettings(payload) {
  const res = await authFetch("/api/user/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  if (res.status === 401) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Failed to update user settings");
  }
  return normalizeUserSettings(data.settings);
}
