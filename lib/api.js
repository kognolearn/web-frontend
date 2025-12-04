import { supabase } from "@/lib/supabase/client";

/**
 * Get the current session access token
 * @returns {Promise<string|null>} The access token or null if not authenticated
 */
export async function getAccessToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error("Error getting access token:", error);
    return null;
  }
}

/**
 * Get authorization headers for API requests
 * @returns {Promise<Record<string, string>>} Headers object with Authorization if available
 */
export async function getAuthHeaders() {
  const token = await getAccessToken();
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Make an authenticated fetch request
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>} The fetch response
 */
export async function authFetch(url, options = {}) {
  const authHeaders = await getAuthHeaders();
  const headers = {
    ...authHeaders,
    ...options.headers,
  };
  
  return fetch(url, {
    ...options,
    headers,
  });
}
