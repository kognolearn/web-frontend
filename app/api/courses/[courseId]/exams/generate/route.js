import { NextResponse } from "next/server";

const BASE_URL = process.env.BACKEND_API_URL || "https://api.kognolearn.com";

// POST /api/courses/:courseId/exams/generate - Generate a new practice exam
export async function POST(request, { params }) {
  try {
    const { courseId } = await params;
    const json = await request.json().catch(() => ({}));

    const { lessons, type } = json;

    if (!lessons || !Array.isArray(lessons) || lessons.length === 0) {
      return NextResponse.json({ error: "lessons array is required" }, { status: 400 });
    }
    if (!["midterm", "final"].includes(type)) {
      return NextResponse.json({ error: "type must be 'midterm' or 'final'" }, { status: 400 });
    }

    const url = new URL(`/courses/${courseId}/exams/generate`, BASE_URL);

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json"
    };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    // Long timeout for exam generation (can take a while)
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 minutes
    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: JSON.stringify({ lessons, type }),
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
      clearTimeout(to);
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
