import { NextResponse } from "next/server";

const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";

async function proxyRequest(request, method) {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.replace(/^\/api\/tokens\/?/, "");
    const backendUrl = new URL(`/tokens/${pathSegments}`, BASE_URL);

    // Copy query params through to the backend.
    url.searchParams.forEach((value, key) => {
      backendUrl.searchParams.set(key, value);
    });

    const headers = { Accept: "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const fetchOptions = {
      method,
      headers,
      cache: "no-store",
    };

    if (["POST", "PUT", "PATCH"].includes(method)) {
      headers["Content-Type"] = "application/json";
      const body = await request.json().catch(() => ({}));
      fetchOptions.body = JSON.stringify(body);
    }

    const res = await fetch(backendUrl.toString(), fetchOptions);

    // Use text + JSON.parse so HTML error pages do not crash the client.
    const bodyText = await res.text();
    let data = {};
    if (bodyText) {
      try {
        data = JSON.parse(bodyText);
      } catch {
        data = {
          error: "Invalid JSON from backend",
          status: res.status,
          statusText: res.statusText,
        };
      }
    }

    if (!res.ok && !data?.error) {
      data = {
        error: `Backend request failed (${res.status})`,
        status: res.status,
        statusText: res.statusText,
        ...data,
      };
    }

    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Tokens API proxy error:", err);
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
