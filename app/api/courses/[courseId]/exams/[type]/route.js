import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";

// GET /api/courses/:courseId/exams/:type - Fetch list of generated practice exams
export async function GET(request, { params }) {
  try {
    const { courseId, type } = await params;

    if (!["midterm", "final"].includes(type)) {
      return NextResponse.json({ error: "type must be 'midterm' or 'final'" }, { status: 400 });
    }

    const url = new URL(`/courses/${courseId}/exams/${type}`, BASE_URL);

    const headers = { Accept: "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers,
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
