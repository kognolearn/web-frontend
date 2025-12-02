import { NextResponse } from "next/server";

const BASE_URL = process.env.BACKEND_API_URL || "https://api.kognolearn.com";

// GET /api/courses/:courseId/exams/:type - Fetch list of generated practice exams
export async function GET(request, { params }) {
  try {
    const { courseId, type } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!["midterm", "final"].includes(type)) {
      return NextResponse.json({ error: "type must be 'midterm' or 'final'" }, { status: 400 });
    }

    const url = new URL(`/courses/${courseId}/exams/${type}`, BASE_URL);
    url.searchParams.set("userId", userId);

    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      const bodyText = await res.text();
      let data;
      try {
        data = bodyText ? JSON.parse(bodyText) : {};
      } catch {
        data = { error: "Invalid JSON from backend" };
      }
      
      // Return the response as-is (backend returns { success, exams: [...] })
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
