import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";

export async function POST(request) {
  try {
    const json = await request.json().catch(() => ({}));

    // Log the incoming request payload for debugging
    console.log("Adjust Confidence API received payload:", JSON.stringify({
      planId: json.planId,
      mode: json.mode,
      confidenceMapKeys: json.confidenceMap ? Object.keys(json.confidenceMap) : [],
    }));

    // Validate required fields
    if (!json.planId) {
      return NextResponse.json(
        { error: "planId is required" },
        { status: 400 }
      );
    }

    if (!json.confidenceMap || typeof json.confidenceMap !== "object") {
      return NextResponse.json(
        { error: "confidenceMap is required and must be an object" },
        { status: 400 }
      );
    }

    const url = new URL("/courses/adjust-confidence", BASE_URL);

    const headers = { "Content-Type": "application/json", Accept: "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const controller = new AbortController();
    // Confidence adjustment is a quick LLM call; 30 second timeout
    const timeout = setTimeout(() => controller.abort(), 30 * 1000);
    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: JSON.stringify(json),
        signal: controller.signal,
      });
      console.log(`Adjust Confidence API backend response status: ${res.status}`);
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
    console.error("Adjust Confidence API error:", String(err));
    const response = NextResponse.json({ error: "Internal server error", details: String(err) }, { status: 500 });
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    return response;
  }
}
