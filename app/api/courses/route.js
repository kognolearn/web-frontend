import { NextResponse } from "next/server";

const BASE_URL = process.env.BACKEND_API_URL || "https://edtech-backend-api.onrender.com";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "";
    const courseId = searchParams.get("courseId") || "";

    const url = new URL("/courses", BASE_URL);
    if (userId) url.searchParams.set("userId", userId);
    if (courseId) url.searchParams.set("courseId", courseId);

    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
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

    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 10 * 60 * 1000);
    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
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
    const userId = searchParams.get("userId");
    const courseId = searchParams.get("courseId");

    if (!userId || !courseId) {
      return NextResponse.json({ error: "userId and courseId are required" }, { status: 400 });
    }

    const url = new URL("/courses", BASE_URL);
    url.searchParams.set("userId", userId);
    url.searchParams.set("courseId", courseId);

    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url.toString(), {
        method: "DELETE",
        headers: { Accept: "application/json" },
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
