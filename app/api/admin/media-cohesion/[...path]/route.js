import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";

async function proxyRequest(request, suffix) {
  const url = `${API_BASE}/admin/media-cohesion/${suffix}`;
  const headers = {
    "Content-Type": request.headers.get("Content-Type") || "application/json",
    Accept: "application/json",
  };
  const authHeader = request.headers.get("Authorization");
  if (authHeader) {
    headers.Authorization = authHeader;
  }

  const body = request.method === "GET" ? undefined : await request.text();
  const res = await fetch(url, {
    method: request.method,
    headers,
    body,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    console.error("Invalid JSON from admin media cohesion endpoint:", err);
    data = { error: "Invalid JSON from backend", raw: text };
  }

  const response = NextResponse.json(data, { status: res.status });
  response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
  return response;
}

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const segments = Array.isArray(resolvedParams?.path) ? resolvedParams.path : [];
  const suffix = segments.join("/");
  try {
    return await proxyRequest(request, suffix);
  } catch (err) {
    console.error("Admin media cohesion proxy error:", err);
    const response = NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    return response;
  }
}

export async function POST(request, { params }) {
  const resolvedParams = await params;
  const segments = Array.isArray(resolvedParams?.path) ? resolvedParams.path : [];
  const suffix = segments.join("/");
  try {
    return await proxyRequest(request, suffix);
  } catch (err) {
    console.error("Admin media cohesion proxy error:", err);
    const response = NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    return response;
  }
}
