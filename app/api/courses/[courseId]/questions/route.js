import { NextResponse } from "next/server";

const API_BASE = process.env.BACKEND_API_URL || "https://api.kognolearn.com";

export async function GET(request, { params }) {
  const { courseId } = await params;
  const { searchParams } = new URL(request.url);

  const queryParams = new URLSearchParams();

  const correctness = searchParams.get("correctness");
  if (correctness) queryParams.set("correctness", correctness);

  const attempted = searchParams.get("attempted");
  if (attempted) queryParams.set("attempted", attempted);

  const lessons = searchParams.get("lessons");
  if (lessons) queryParams.set("lessons", lessons);

  const queryString = queryParams.toString();
  const url = queryString
    ? `${API_BASE}/courses/${courseId}/questions?${queryString}`
    : `${API_BASE}/courses/${courseId}/questions`;

  try {
    const headers = { "Content-Type": "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const res = await fetch(url, {
      method: "GET",
      headers,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Error fetching questions:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { courseId } = await params;

  try {
    const body = await request.json();

    if (!body.updates) {
      return NextResponse.json({ success: false, error: "Missing updates" }, { status: 400 });
    }

    const headers = { "Content-Type": "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const res = await fetch(`${API_BASE}/courses/${courseId}/questions`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Error updating questions:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
