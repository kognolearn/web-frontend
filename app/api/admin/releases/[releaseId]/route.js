import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";

async function proxyRequest(request, method, releaseId) {
  try {
    const url = new URL(request.url);
    const backendUrl = new URL(`/releases/admin/${releaseId}`, BASE_URL);

    // Copy query params
    url.searchParams.forEach((value, key) => {
      backendUrl.searchParams.set(key, value);
    });

    const headers = { Accept: "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const fetchOptions = {
      method,
      headers,
    };

    // Handle body for POST/PUT/PATCH
    if (["POST", "PUT", "PATCH"].includes(method)) {
      headers["Content-Type"] = "application/json";
      const body = await request.json().catch(() => ({}));
      fetchOptions.body = JSON.stringify(body);
    }

    fetchOptions.headers = headers;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(backendUrl.toString(), {
        ...fetchOptions,
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
    console.error("Admin releases API proxy error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  const { releaseId } = await params;
  return proxyRequest(request, "GET", releaseId);
}

export async function PATCH(request, { params }) {
  const { releaseId } = await params;
  return proxyRequest(request, "PATCH", releaseId);
}

export async function DELETE(request, { params }) {
  const { releaseId } = await params;
  return proxyRequest(request, "DELETE", releaseId);
}
