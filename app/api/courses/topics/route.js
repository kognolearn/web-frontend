import { NextResponse } from "next/server";

const BASE_URL = process.env.BACKEND_API_URL || "https://api.kognolearn.com";

export async function POST(request) {
  try {
    const json = await request.json().catch(() => ({}));
    const url = new URL("/courses/topics", BASE_URL);

    const controller = new AbortController();
    // Topic generation may take longer; allow up to 10 minutes (600000 ms)
    const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000);
    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(json),
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
    return NextResponse.json({ error: "Internal server error", details: String(err) }, { status: 500 });
  }
}
