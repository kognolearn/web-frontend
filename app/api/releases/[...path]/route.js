import { NextResponse } from "next/server";

const BASE_URL = process.env.BACKEND_API_URL || "https://api.kognolearn.com";

async function proxyRequest(request, method) {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.replace(/^\/api\/releases\//, "");
    const backendUrl = new URL(`/releases/${pathSegments}`, BASE_URL);

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

      // For download routes, handle redirects
      if (res.status === 302 || res.status === 301) {
        const location = res.headers.get("location");
        if (location) {
          return NextResponse.redirect(location, res.status);
        }
      }

      const contentType = res.headers.get("content-type") || "";
      const bodyText = await res.text();

      // Pass through YAML responses as-is
      if (contentType.includes("yaml") || contentType.includes("yml")) {
        return new Response(bodyText, {
          status: res.status,
          headers: { "Content-Type": "text/yaml" },
        });
      }

      // Parse JSON responses
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
    console.error("Releases API proxy error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  return proxyRequest(request, "GET");
}

export async function POST(request) {
  return proxyRequest(request, "POST");
}

export async function PUT(request) {
  return proxyRequest(request, "PUT");
}

export async function PATCH(request) {
  return proxyRequest(request, "PATCH");
}

export async function DELETE(request) {
  return proxyRequest(request, "DELETE");
}
