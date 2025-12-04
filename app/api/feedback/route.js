import { NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL || "https://api.kognolearn.com";

export async function POST(request) {
  try {
    const body = await request.json();
    
    if (!body.userId || !body.type || !body.message) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: userId, type, message" },
        { status: 400 }
      );
    }

    const headers = { "Content-Type": "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const res = await fetch(`${API_BASE}/feedback`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Error submitting feedback:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
