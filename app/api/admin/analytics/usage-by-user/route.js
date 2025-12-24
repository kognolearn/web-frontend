import { NextResponse } from "next/server";

const API_BASE = process.env.BACKEND_API_URL || "https://api.kognolearn.com";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const includeEmail = searchParams.get("includeEmail");

    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (includeEmail) params.append("includeEmail", includeEmail);
    // Request all users for admin view
    params.append("admin", "true");

    const queryString = params.toString();
    const url = `${API_BASE}/analytics/usage-by-user${queryString ? `?${queryString}` : ""}`;

    const headers = { "Content-Type": "application/json" };
    // Forward the authorization header from the incoming request if present
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
    console.error("Error fetching usage by user:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
