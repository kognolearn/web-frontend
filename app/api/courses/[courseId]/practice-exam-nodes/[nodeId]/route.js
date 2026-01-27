import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";

// PATCH /api/courses/:courseId/practice-exam-nodes/:nodeId - Update a practice exam node
export async function PATCH(request, { params }) {
  try {
    const { courseId, nodeId } = await params;
    const json = await request.json().catch(() => ({}));

    const url = new URL(`/courses/${courseId}/practice-exam-nodes/${nodeId}`, BASE_URL);

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json"
    };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const res = await fetch(url.toString(), {
      method: "PATCH",
      headers,
      body: JSON.stringify(json),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}

// DELETE /api/courses/:courseId/practice-exam-nodes/:nodeId - Delete a practice exam node
export async function DELETE(request, { params }) {
  try {
    const { courseId, nodeId } = await params;

    const url = new URL(`/courses/${courseId}/practice-exam-nodes/${nodeId}`, BASE_URL);

    const headers = { Accept: "application/json" };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const res = await fetch(url.toString(), {
      method: "DELETE",
      headers,
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
