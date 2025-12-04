import { NextResponse } from "next/server";

const BASE_URL = process.env.BACKEND_API_URL || "https://api.kognolearn.com";

// Proxy to GET /courses/ids?userId=...
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "";

    const url = new URL("/courses/ids", BASE_URL);
    if (userId) url.searchParams.set("userId", userId);

    const headers = { Accept: "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers,
        signal: controller.signal,
      });
      const bodyText = await res.text();
      let data;
      try {
        data = bodyText ? JSON.parse(bodyText) : {};
      } catch {
        data = { error: "Invalid JSON from backend" };
      }
      return NextResponse.json(data, { status: res.status });
    } finally {
      clearTimeout(to);
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
