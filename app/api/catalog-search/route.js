import { NextResponse } from "next/server";

// Proxy route to the backend Courses API on Render.
// Keeps the existing frontend contract: returns { results: Array<{ id, code, title }> }
// while delegating search to the backend (which uses Supabase under the hood).

const COURSES_API_BASE = process.env.BACKEND_API_URL || "https://api.kognolearn.com";
const MAX_QUERY_LENGTH = 100; // per spec

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get("q") || searchParams.get("query") || "";
    const sanitized = raw.trim().slice(0, MAX_QUERY_LENGTH);

    // Preserve previous behavior: empty query returns empty results with 200.
    if (!sanitized) {
      return NextResponse.json({ results: [] }, { status: 200 });
    }

    const url = new URL("/college-courses", COURSES_API_BASE);
    url.searchParams.set("query", sanitized);

    // Basic retry (handles cold starts on serverless hosts) with a short timeout
    const attemptFetch = async () => {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 3000);
      try {
        return await fetch(url.toString(), {
          method: "GET",
          headers: {
            "Accept": "application/json",
          },
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
    };

    let res = await attemptFetch();
    if (!res.ok) {
      // quick single retry
      await new Promise((r) => setTimeout(r, 400));
      res = await attemptFetch();
    }

    if (!res.ok) {
      // Fallback gracefully to empty results to avoid breaking UX
      return NextResponse.json({ results: [] }, { status: 200 });
    }

    const body = await res.json().catch(() => ({ items: [] }));
    const items = Array.isArray(body?.items) ? body.items : [];

    // Map backend response to frontend expectations: add a stable id
    const results = items.map((item) => {
      const code = String(item?.code ?? "");
      const title = String(item?.title ?? "");
      const id = `${code}-${title}`;
      return { id, code, title };
    });

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
