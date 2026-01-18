import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";

// POST /api/courses/:courseId/review-modules - Generate a new review module
export async function POST(request, { params }) {
  try {
    const { courseId } = await params;
    const body = await request.json();

    const { examType, topics } = body;

    if (!examType || !["midterm", "final"].includes(examType)) {
      return NextResponse.json({ error: "examType must be 'midterm' or 'final'" }, { status: 400 });
    }
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return NextResponse.json({ error: "topics array is required" }, { status: 400 });
    }

    const url = new URL(`/courses/${courseId}/review-modules`, BASE_URL);

    const headers = { "Content-Type": "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 3 * 60 * 1000); // 3 minutes

    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: JSON.stringify({ examType, topics }),
        signal: controller.signal,
      });

      const bodyText = await res.text();
      let data;
      try {
        data = bodyText ? JSON.parse(bodyText) : {};
      } catch {
        data = { error: "Invalid JSON from backend", raw: bodyText };
      }
      
      return NextResponse.json(data, { status: res.status });
    } finally {
      clearTimeout(to);
    }
  } catch (err) {
    console.error("Generate review module error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}

// GET /api/courses/:courseId/review-modules - Fetch existing review modules
export async function GET(request, { params }) {
  try {
    const { courseId } = await params;
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type"); // optional: midterm or final

    const url = new URL(`/courses/${courseId}/review-modules`, BASE_URL);
    if (type) {
      url.searchParams.set("type", type);
    }

    const headers = { "Content-Type": "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers,
    });

    const bodyText = await res.text();
    let data;
    try {
      data = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      data = { error: "Invalid JSON from backend", raw: bodyText };
    }
    
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Fetch review modules error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
