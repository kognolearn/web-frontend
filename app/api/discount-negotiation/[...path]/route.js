import { NextResponse } from "next/server";

const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";

async function proxyRequest(request, method) {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.replace(
      /^\/api\/discount-negotiation\//,
      ""
    );
    const backendUrl = new URL(
      `/discount-negotiation/${pathSegments}`,
      BASE_URL
    );

    // Forward query params
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
    };

    // Handle body for non-GET requests
    if (method !== "GET") {
      const contentType = request.headers.get("Content-Type") || "";

      if (contentType.includes("multipart/form-data")) {
        // Rebuild FormData for file uploads
        const incomingFormData = await request.formData();
        const outgoingFormData = new FormData();

        for (const [key, value] of incomingFormData.entries()) {
<<<<<<< HEAD
          const isFileLike =
            value &&
            typeof value === "object" &&
            typeof value.arrayBuffer === "function" &&
            (value instanceof File ||
              value instanceof Blob ||
              typeof value.name === "string");

          if (!isFileLike) {
            outgoingFormData.append(key, value);
            continue;
          }

          const buffer = await value.arrayBuffer();
          const mimeType =
            typeof value.type === "string" && value.type
              ? value.type
              : "application/octet-stream";
          const filename =
            typeof value.name === "string" && value.name
              ? value.name
              : "upload";
          const blob = new Blob([buffer], { type: mimeType });
          outgoingFormData.append(key, blob, filename);
=======
          if (value instanceof File) {
            const buffer = await value.arrayBuffer();
            const blob = new Blob([buffer], { type: value.type });
            outgoingFormData.append(key, blob, value.name);
          } else {
            outgoingFormData.append(key, value);
          }
>>>>>>> origin/main
        }

        fetchOptions.body = outgoingFormData;
        // Let fetch set the multipart boundary header
        delete headers["Content-Type"];
      } else {
        headers["Content-Type"] = "application/json";
        const body = await request.json().catch(() => ({}));
        fetchOptions.body = JSON.stringify(body);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(backendUrl.toString(), {
        ...fetchOptions,
        signal: controller.signal,
        cache: "no-store",
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
    console.error("Discount negotiation API proxy error:", err);
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
<<<<<<< HEAD
=======

>>>>>>> origin/main
