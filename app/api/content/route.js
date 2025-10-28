import { NextResponse } from "next/server";

const BASE_URL = process.env.BACKEND_API_URL || "https://edtech-backend-api.onrender.com";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "";
    const id = searchParams.get("id") || "";

    const url = new URL("/content", BASE_URL);
    if (format) url.searchParams.set("format", format);
    if (id) url.searchParams.set("id", id);

    console.log("[/api/content] proxy →", url.toString());
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      const bodyText = await res.text();
      console.log("[/api/content] backend status:", res.status, "bytes:", bodyText?.length ?? 0);
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
