import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";

export async function POST(request) {
  try {
    const json = await request.json().catch(() => ({}));

    // Log the incoming request payload for debugging
    console.log("Unified Plan API received payload:", JSON.stringify({
      courseTitle: json.courseTitle,
      university: json.university,
      mode: json.mode,
      userId: json.userId ? "present" : "missing",
      hasSyllabusText: !!json.syllabusText,
      hasSyllabusFiles: !!json.syllabusFiles?.length,
      hasExamFiles: !!json.examFiles?.length,
      payloadKeys: Object.keys(json),
    }));

    // Validate that required fields are present
    if (!json.courseTitle) {
      console.error("Unified Plan API: Missing courseTitle in payload!");
    }

    const url = new URL("/courses/unified-plan", BASE_URL);

    const headers = { "Content-Type": "application/json", Accept: "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const controller = new AbortController();
    // Unified plan generation may take longer; allow up to 10 minutes (600000 ms)
    const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000);
    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: JSON.stringify(json),
        signal: controller.signal,
      });
      console.log(`Unified Plan API backend response status: ${res.status}`);
      const bodyText = await res.text();
      let data;
      try {
        data = bodyText ? JSON.parse(bodyText) : {};
      } catch (err) {
        console.error("Invalid JSON from backend for", url.toString(), "-- response body:", bodyText, "error:", String(err));
        data = { error: "Invalid JSON from backend" };
      }
      const response = NextResponse.json(data, { status: res.status });
      response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
      return response;
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    console.error("Unified Plan API error:", String(err));
    const response = NextResponse.json({ error: "Internal server error", details: String(err) }, { status: 500 });
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    return response;
  }
}
