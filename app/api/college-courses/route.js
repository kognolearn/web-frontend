import { NextResponse } from "next/server";

// Proxy route to the backend /college-courses endpoint that now expects
// { college, subject?, course? } query params and returns { items: [{ code, title }, ...] }.
// Behavior: if only college, returns colleges; if college+subject, returns subjects; if all, returns courses.
const API_BASE = process.env.BACKEND_API_URL || "https://edtech-backend-api.onrender.com";
const MAX_LEN = 120;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawCollege = (searchParams.get("college") || "").trim().slice(0, MAX_LEN);
    const rawSubject = (searchParams.get("subject") || "").trim().slice(0, MAX_LEN);
    const rawCourse = (searchParams.get("course") || "").trim().slice(0, MAX_LEN);

    // Be lenient for UX: if missing college, return empty set with 200
    if (rawCollege.length < 2) {
      return NextResponse.json({ query: rawCollege, count: 0, items: [] }, { status: 200 });
    }

    const url = new URL("/college-courses", API_BASE);
    url.searchParams.set("college", rawCollege);
    if (rawSubject.length >= 2) url.searchParams.set("subject", rawSubject);
    if (rawCourse.length >= 2) url.searchParams.set("course", rawCourse);

    const attempt = async (timeoutMs = 4000) => {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        return await fetch(url.toString(), {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(to);
      }
    };

    let res = await attempt();
    if (!res.ok) {
      await new Promise((r) => setTimeout(r, 300));
      res = await attempt(5000);
    }

    if (!res.ok) {
      // Graceful fallback to empty results to avoid breaking UX
      return NextResponse.json({ query: rawCollege, count: 0, items: [] }, { status: 200 });
    }

    const body = await res.json().catch(() => ({ items: [] }));
    const items = Array.isArray(body?.items) ? body.items : [];
    return NextResponse.json({ ...body, count: items.length, items }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
