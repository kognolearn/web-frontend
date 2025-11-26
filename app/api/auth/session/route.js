import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: "", expires: new Date(0), ...options });
        },
      },
    }
  );
}

export async function POST(request) {
  const supabase = await createSupabaseServerClient();
  const body = await request.json().catch(() => ({}));
  const { event, session } = body ?? {};

  try {
    if (event === "SIGNED_OUT") {
      await supabase.auth.signOut();
    } else if (session?.access_token && session?.refresh_token) {
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update Supabase auth session", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Unable to update session" },
      { status: 500 }
    );
  }
}
