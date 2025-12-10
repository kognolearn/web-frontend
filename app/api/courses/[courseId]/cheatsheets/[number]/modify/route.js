import { NextResponse } from "next/server";

const BASE_URL = process.env.BACKEND_API_URL || "https://api.kognolearn.com";

// POST /api/courses/:courseId/cheatsheets/:number/modify - Modify existing cheatsheet
export async function POST(request, { params }) {
  try {
    const { courseId, number } = await params;
    const json = await request.json().catch(() => ({}));
    
    const url = new URL(`/courses/${courseId}/cheatsheets/${number}/modify`, BASE_URL);

    const headers = { "Content-Type": "application/json", Accept: "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    // Modification can take a while
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 minutes
    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: JSON.stringify(json),
        signal: controller.signal,
      });
      const bodyText = await res.text();
      let data;
      try { data = bodyText ? JSON.parse(bodyText) : {}; } catch { data = { error: "Invalid JSON from backend" }; }
      return NextResponse.json(data, { status: res.status });
    } finally {
      clearTimeout(to);
    }
  } catch (err) {
    return NextResponse.json({ error: "Internal server error", details: String(err) }, { status: 500 });
  }
}
