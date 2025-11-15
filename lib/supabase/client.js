import { createBrowserClient } from "@supabase/ssr";

let browserClient;

function getBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_KEY
    );
  }
  return browserClient;
}

// Export a shared browser client for use in client components
export const supabase = getBrowserClient();

export function createSupabaseBrowserClient() {
  return getBrowserClient();
}
