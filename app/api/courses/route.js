import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";

function decodeJwtPayload(token) {
  try {
    const parts = String(token).split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

    let json;
    if (typeof globalThis.atob === "function") {
      json = globalThis.atob(padded);
    } else if (typeof Buffer !== "undefined") {
      json = Buffer.from(padded, "base64").toString("utf8");
    } else {
      return null;
    }

    return JSON.parse(json);
  } catch {
    return null;
  }
}

function maybeInjectUserId(url, request) {
  // Local backend expects userId in query; if caller didn't include it,
  // try to infer it from the Supabase JWT (sub).
  if (url.searchParams.get("userId")) return;

  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
  const match = authHeader && authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return;

  const payload = decodeJwtPayload(match[1]);
  const userId = payload?.sub;
  if (typeof userId === "string" && userId.trim()) {
    url.searchParams.set("userId", userId.trim());
  }
}

function decodeJwtPayload(token) {
  try {
    const parts = String(token).split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

    let json;
    if (typeof globalThis.atob === "function") {
      json = globalThis.atob(padded);
    } else if (typeof Buffer !== "undefined") {
      json = Buffer.from(padded, "base64").toString("utf8");
    } else {
      return null;
    }

    return JSON.parse(json);
  } catch {
    return null;
  }
}

function maybeInjectUserId(url, request) {
  // Local backend expects userId in query; if caller didn't include it,
  // try to infer it from the Supabase JWT (sub).
  if (url.searchParams.get("userId")) return;

  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
  const match = authHeader && authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return;

  const payload = decodeJwtPayload(match[1]);
  const userId = payload?.sub;
  if (typeof userId === "string" && userId.trim()) {
    url.searchParams.set("userId", userId.trim());
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = new URL("/courses", BASE_URL);
    // Forward query params (e.g., userId, courseId) to the backend.
    for (const [key, value] of searchParams.entries()) {
      if (typeof value === "string" && value.length > 0) {
        url.searchParams.set(key, value);
      }
    }
    maybeInjectUserId(url, request);

    const headers = { Accept: "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers,
        signal: controller.signal,
      });
      const bodyText = await res.text();
      let data;
      try { data = bodyText ? JSON.parse(bodyText) : {}; } catch { data = { error: "Invalid JSON from backend" }; }
      if (!res.ok) {
        return NextResponse.json(data, { status: res.status });
      }
      return NextResponse.json(data, { status: 200 });
    } finally {
      clearTimeout(to);
    }
  } catch (err) {
    return NextResponse.json({ error: "Internal server error", details: String(err) }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const json = await request.json().catch(() => ({}));
    const url = new URL("/courses", BASE_URL);

    const headers = { "Content-Type": "application/json", Accept: "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 10 * 60 * 1000);
    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: JSON.stringify(json),
        signal: controller.signal,
      });
      const bodyText = await res.text();
      let data;
      try { data = bodyText ? JSON.parse(bodyText) : {}; } catch { data = { error: "Invalid JSON from backend" }; }
      return NextResponse.json(data, { status: res.status });
    } finally {
      clearTimeout(to);
    }
  } catch (err) {
    return NextResponse.json({ error: "Internal server error", details: String(err) }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    const url = new URL("/courses", BASE_URL);
    // Backend requires userId + courseId for deletes; forward everything we have.
    for (const [key, value] of searchParams.entries()) {
      if (typeof value === "string" && value.length > 0) {
        url.searchParams.set(key, value);
      }
    }
    maybeInjectUserId(url, request);

    const headers = { Accept: "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url.toString(), {
        method: "DELETE",
        headers,
        signal: controller.signal,
      });
      const bodyText = await res.text();
      let data;
      try { data = bodyText ? JSON.parse(bodyText) : {}; } catch { data = { success: true }; }
      if (!res.ok) {
        return NextResponse.json(data, { status: res.status });
      }
      return NextResponse.json(data, { status: 200 });
    } finally {
      clearTimeout(to);
    }
  } catch (err) {
    return NextResponse.json({ error: "Internal server error", details: String(err) }, { status: 500 });
  }
}
