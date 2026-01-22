import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";

export async function POST(request) {
  try {
    const json = await request.json().catch(() => ({}));

    console.log("Modify Plan API received payload:", JSON.stringify({
      planId: json.planId,
      hasRequest: typeof json.request === "string" && json.request.trim().length > 0,
    }));

    if (!json.planId) {
      return NextResponse.json({ error: "planId is required" }, { status: 400 });
    }

    if (!json.request || typeof json.request !== "string") {
      return NextResponse.json({ error: "request must be a non-empty string" }, { status: 400 });
    }

    const url = new URL("/courses/modify-plan", BASE_URL);

    const headers = { "Content-Type": "application/json", Accept: "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30 * 1000);
    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: JSON.stringify(json),
        signal: controller.signal,
      });
      console.log(`Modify Plan API backend response status: ${res.status}`);
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
    console.error("Modify Plan API error:", String(err));
    const response = NextResponse.json({ error: "Internal server error", details: String(err) }, { status: 500 });
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    return response;
  }
}
