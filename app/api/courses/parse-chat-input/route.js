import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";

export async function POST(request) {
  try {
    const json = await request.json().catch(() => ({}));

    const { message, savedCollege } = json;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Message is required',
        courseName: null,
        collegeName: null,
      }, { status: 400 });
    }

    const url = new URL("/courses/parse-chat-input", BASE_URL);

    const headers = { "Content-Type": "application/json", Accept: "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: JSON.stringify({ message, savedCollege }),
        signal: controller.signal,
      });

      const bodyText = await res.text();
      let data;
      try {
        data = bodyText ? JSON.parse(bodyText) : {};
      } catch (err) {
        console.error("Invalid JSON from backend for", url.toString(), "-- response body:", bodyText, "error:", String(err));
        data = { success: false, error: "Invalid response from server", courseName: null, collegeName: null };
      }

      return NextResponse.json(data, { status: res.status });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    console.error("Parse chat input API error:", String(err));
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      courseName: null,
      collegeName: null,
    }, { status: 500 });
  }
}
