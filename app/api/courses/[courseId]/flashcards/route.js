import { NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL || "https://api.kognolearn.com";

export async function GET(request, { params }) {
  const { courseId } = await params;
  const { searchParams } = new URL(request.url);
  
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 });
  }

  const queryParams = new URLSearchParams({ userId });
  
  const currentTimestamp = searchParams.get("current_timestamp");
  if (currentTimestamp) queryParams.set("current_timestamp", currentTimestamp);
  
  const lessons = searchParams.get("lessons");
  if (lessons) queryParams.set("lessons", lessons);

  try {
    const headers = { "Content-Type": "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const res = await fetch(`${API_BASE}/courses/${courseId}/flashcards?${queryParams}`, {
      method: "GET",
      headers,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Error fetching flashcards:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { courseId } = await params;
  
  try {
    const body = await request.json();
    
    if (!body.userId || !body.updates) {
      return NextResponse.json({ success: false, error: "Missing userId or updates" }, { status: 400 });
    }

    const headers = { "Content-Type": "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const res = await fetch(`${API_BASE}/courses/${courseId}/flashcards`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Error updating flashcards:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
