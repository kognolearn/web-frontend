import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";

async function forwardRequest(request, method) {
  const headers = { "Content-Type": "application/json" };
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  headers["Authorization"] = authHeader;

  const options = {
    method,
    headers,
  };

  if (method !== "GET") {
    const body = await request.text();
    if (body) {
      options.body = body;
    }
  }

  const res = await fetch(`${API_BASE}/user/settings`, options);
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function GET(request) {
  try {
    return await forwardRequest(request, "GET");
  } catch (err) {
    console.error("Error fetching user settings:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    return await forwardRequest(request, "PATCH");
  } catch (err) {
    console.error("Error updating user settings:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
