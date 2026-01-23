import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";

export async function GET(request, { params }) {
  try {
    const { shareToken } = await params;
    const backendUrl = new URL(`/courses/share/${shareToken}`, BASE_URL);

    const headers = { Accept: "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(backendUrl.toString(), {
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
      clearTimeout(timeout);
    }
  } catch (err) {
    console.error("Share validation API error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { shareToken } = await params;
    const backendUrl = new URL(`/courses/join/${shareToken}`, BASE_URL);

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // Longer timeout for course copy

    try {
      const res = await fetch(backendUrl.toString(), {
        method: "POST",
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
      clearTimeout(timeout);
    }
  } catch (err) {
    console.error("Join course API error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
