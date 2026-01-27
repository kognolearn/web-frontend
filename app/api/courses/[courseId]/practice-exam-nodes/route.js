import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";

// POST /api/courses/:courseId/practice-exam-nodes - Create a new practice exam node
export async function POST(request, { params }) {
  try {
    const { courseId } = await params;
    const json = await request.json().catch(() => ({}));

    const url = new URL(`/courses/${courseId}/practice-exam-nodes`, BASE_URL);

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json"
    };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const res = await fetch(url.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify(json),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}

// GET /api/courses/:courseId/practice-exam-nodes - List all custom practice exam nodes
export async function GET(request, { params }) {
  try {
    const { courseId } = await params;

    const url = new URL(`/courses/${courseId}/practice-exam-nodes`, BASE_URL);

    const headers = { Accept: "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const res = await fetch(url.toString(), { headers });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
