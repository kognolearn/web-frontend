import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = new URL("/admin/jobs", BASE_URL);

    // Forward query parameters
    searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    const headers = { Accept: "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers,
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error", details: String(err) }, { status: 500 });
  }
}
