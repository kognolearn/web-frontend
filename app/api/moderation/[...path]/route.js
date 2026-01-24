import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";

async function proxyRequest(request, method) {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.replace(/^\/api\/moderation\//, '');
    const backendUrl = new URL(`/moderation/${pathSegments}`, BASE_URL);

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
      const contentType = request.headers.get("Content-Type") || "";

      if (contentType.includes("multipart/form-data")) {
        // For file uploads, reconstruct FormData for the outgoing request
        const incomingFormData = await request.formData();
        const outgoingFormData = new FormData();

        for (const [key, value] of incomingFormData.entries()) {
          if (value instanceof File) {
            // Convert File to Blob with proper filename
            const buffer = await value.arrayBuffer();
            const blob = new Blob([buffer], { type: value.type });
            outgoingFormData.append(key, blob, value.name);
          } else {
            outgoingFormData.append(key, value);
          }
        }

        fetchOptions.body = outgoingFormData;
        // Don't set Content-Type header - let fetch set it with boundary
        delete headers["Content-Type"];
      } else {
        headers["Content-Type"] = "application/json";
        const body = await request.json().catch(() => ({}));
        fetchOptions.body = JSON.stringify(body);
      }
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
    console.error("Moderation API proxy error:", err);
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
