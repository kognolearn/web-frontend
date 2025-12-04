import { NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL || "https://api.kognolearn.com";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const endpoint = searchParams.get("endpoint");
    const model = searchParams.get("model");
    const userId = searchParams.get("userId");
    const courseId = searchParams.get("courseId");

    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (endpoint) params.append("endpoint", endpoint);
    if (model) params.append("model", model);
    if (userId) params.append("userId", userId);
    if (courseId) params.append("courseId", courseId);

    const queryString = params.toString();
    const url = `${API_BASE}/analytics/usage/summary${queryString ? `?${queryString}` : ""}`;

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
    console.error("Error fetching usage summary:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
