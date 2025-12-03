import { NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL || "https://api.kognolearn.com";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const params = new URLSearchParams();
    if (userId) params.append("userId", userId);

    const queryString = params.toString();
    const url = `${API_BASE}/analytics/usage/summary${queryString ? `?${queryString}` : ""}`;

    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
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
