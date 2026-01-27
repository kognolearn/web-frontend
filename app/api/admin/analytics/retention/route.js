import { NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const grains = searchParams.get("grains");
    const maxDayOffset = searchParams.get("maxDayOffset");
    const maxWeekOffset = searchParams.get("maxWeekOffset");
    const maxMonthOffset = searchParams.get("maxMonthOffset");

    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (grains) params.append("grains", grains);
    if (maxDayOffset) params.append("maxDayOffset", maxDayOffset);
    if (maxWeekOffset) params.append("maxWeekOffset", maxWeekOffset);
    if (maxMonthOffset) params.append("maxMonthOffset", maxMonthOffset);

    const queryString = params.toString();
    const url = `${API_BASE}/analytics/admin/retention${
      queryString ? `?${queryString}` : ""
    }`;

    const headers = { "Content-Type": "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const res = await fetch(url, {
      method: "GET",
      headers,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Error fetching retention analytics:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

