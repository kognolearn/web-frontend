import { NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL || "https://api.kognolearn.com";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const params = new URLSearchParams();
    if (userId) params.append("userId", userId);
    if (type) params.append("type", type);
    if (limit) params.append("limit", limit);
    if (offset) params.append("offset", offset);

    const queryString = params.toString();
    const url = `${API_BASE}/feedback${queryString ? `?${queryString}` : ""}`;

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
    console.error("Error fetching feedback:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
