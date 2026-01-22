import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";

export async function POST(request) {
  try {
    const json = await request.json().catch(() => ({}));

    // Log the incoming request payload for debugging
    console.log("Apply Patches API received payload:", JSON.stringify({
      planId: json.planId,
      patchCount: Array.isArray(json.patches) ? json.patches.length : 0,
    }));

    // Validate required fields
    if (!json.planId) {
      return NextResponse.json(
        { error: "planId is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(json.patches)) {
      return NextResponse.json(
        { error: "patches must be an array" },
        { status: 400 }
      );
    }

    const url = new URL("/courses/apply-patches", BASE_URL);

    const headers = { "Content-Type": "application/json", Accept: "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const controller = new AbortController();
    // Apply patches is a quick operation; 10 second timeout
    const timeout = setTimeout(() => controller.abort(), 10 * 1000);
    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: JSON.stringify(json),
        signal: controller.signal,
      });
      console.log(`Apply Patches API backend response status: ${res.status}`);
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
    console.error("Apply Patches API error:", String(err));
    const response = NextResponse.json({ error: "Internal server error", details: String(err) }, { status: 500 });
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    return response;
  }
}
