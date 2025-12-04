import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const API_BASE = process.env.API_BASE_URL || "https://api.kognolearn.com";

export async function GET(request) {
  try {
    // Get the user's session for authorization
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const includeCourseName = searchParams.get("includeCourseName");

    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (includeCourseName) params.append("includeCourseName", includeCourseName);
    // Request all courses for admin view
    params.append("admin", "true");

    const queryString = params.toString();
    const url = `${API_BASE}/analytics/usage-by-course${queryString ? `?${queryString}` : ""}`;

    const headers = { "Content-Type": "application/json" };
    // Pass the user's access token for backend authorization
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const res = await fetch(url, {
      method: "GET",
      headers,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Error fetching usage by course:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
