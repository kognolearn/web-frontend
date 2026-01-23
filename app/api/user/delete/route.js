import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";

export async function DELETE(request) {
  try {
    const headers = { "Content-Type": "application/json" };
    const authHeader = request.headers.get("Authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    headers["Authorization"] = authHeader;

    const res = await fetch(`${API_BASE}/user/delete`, {
      method: "DELETE",
      headers,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Error deleting user account:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
