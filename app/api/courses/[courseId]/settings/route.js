import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const BASE_URL = process.env.BACKEND_API_URL || "https://api.kognolearn.com";

// Helper to get auth token from cookies (for sendBeacon which doesn't support headers)
async function getTokenFromCookies() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

async function updateSettings(request, { params }) {
  try {
    const { courseId } = await params;
    
    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    const json = await request.json().catch(() => ({}));
    
    if (!json.userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (typeof json.seconds_to_complete !== 'number' || json.seconds_to_complete < 0) {
      return NextResponse.json({ error: "seconds_to_complete must be a non-negative number" }, { status: 400 });
    }

    const url = new URL(`/courses/${encodeURIComponent(courseId)}/settings`, BASE_URL);

    const headers = { "Content-Type": "application/json", Accept: "application/json" };
    
    // Try to get auth from header first, fall back to cookies (for sendBeacon)
    let authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      const cookieToken = await getTokenFromCookies();
      if (cookieToken) {
        authHeader = `Bearer ${cookieToken}`;
      }
    }
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 5000);
    
    try {
      const res = await fetch(url.toString(), {
        method: "PATCH",
        headers,
        body: JSON.stringify(json),
        signal: controller.signal,
      });
      
      const bodyText = await res.text();
      let data;
      try { 
        data = bodyText ? JSON.parse(bodyText) : {}; 
      } catch { 
        data = { error: "Invalid JSON from backend" }; 
      }
      
      if (!res.ok) {
        return NextResponse.json(data, { status: res.status });
      }
      
      return NextResponse.json(data, { status: 200 });
    } finally {
      clearTimeout(to);
    }
  } catch (err) {
    return NextResponse.json({ 
      error: "Internal server error", 
      details: String(err) 
    }, { status: 500 });
  }
}

// PATCH handler for normal requests
export async function PATCH(request, context) {
  return updateSettings(request, context);
}

// POST handler for sendBeacon (which only supports POST)
export async function POST(request, context) {
  return updateSettings(request, context);
}
