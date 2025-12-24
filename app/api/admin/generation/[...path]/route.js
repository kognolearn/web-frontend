import { NextResponse } from "next/server";

const API_BASE = process.env.BACKEND_API_URL || "https://api.kognolearn.com";

export async function POST(request, { params }) {
  const resolvedParams = await params;
  const segments = Array.isArray(resolvedParams?.path) ? resolvedParams.path : [];
  const suffix = segments.join("/");
  const url = `${API_BASE}/admin/generation/${suffix}`;

  try {
    const headers = {
      "Content-Type": request.headers.get("Content-Type") || "application/json",
      Accept: "application/json",
    };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const body = await request.text();
    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      console.error("Invalid JSON from admin generation endpoint:", err);
      data = { error: "Invalid JSON from backend", raw: text };
    }

    const response = NextResponse.json(data, { status: res.status });
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    return response;
  } catch (err) {
    console.error("Admin generation proxy error:", err);
    const response = NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    return response;
  }
}
