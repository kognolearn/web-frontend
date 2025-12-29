import { NextResponse } from "next/server";

const BASE_URL = process.env.BACKEND_API_URL || "https://api.kognolearn.com";

// POST /api/courses/:courseId/exams/:type/:examNumber/modify - Modify an existing practice exam
export async function POST(request, { params }) {
  try {
    const { courseId, type, examNumber } = await params;
    const json = await request.json().catch(() => ({}));

    const { prompt } = json;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }
    if (!["midterm", "final"].includes(type)) {
      return NextResponse.json({ error: "type must be 'midterm' or 'final'" }, { status: 400 });
    }
    const examNum = parseInt(examNumber, 10);
    if (isNaN(examNum) || examNum < 1) {
      return NextResponse.json({ error: "examNumber must be a positive integer" }, { status: 400 });
    }

    const url = new URL(`/courses/${courseId}/exams/${type}/${examNum}/modify`, BASE_URL);

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json"
    };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    // Long timeout for exam modification (can take a while)
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 minutes
    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt: prompt.trim() }),
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
