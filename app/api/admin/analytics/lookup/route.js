import { NextResponse } from "next/server";

const API_BASE = process.env.BACKEND_API_URL || "https://api.kognolearn.com";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const courseId = searchParams.get("courseId");

    if (!userId && !courseId) {
      return NextResponse.json(
        { success: false, error: "At least one of userId or courseId is required" },
        { status: 400 }
      );
    }

    const params = new URLSearchParams();
    if (userId) params.append("userId", userId);
    if (courseId) params.append("courseId", courseId);

    const queryString = params.toString();
    const url = `${API_BASE}/analytics/lookup${queryString ? `?${queryString}` : ""}`;

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
    console.error("Error looking up user/course:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
