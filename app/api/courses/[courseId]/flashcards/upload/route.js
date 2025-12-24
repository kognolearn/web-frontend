import { NextResponse } from "next/server";

const API_BASE = process.env.BACKEND_API_URL || "https://api.kognolearn.com";

export async function POST(request, { params }) {
  const { courseId } = await params;

  try {
    const formData = await request.formData();
    
    const ankiFile = formData.get("ankiFile");
    const userId = formData.get("userId");

    if (!ankiFile) {
      return NextResponse.json(
        { success: false, error: "Missing ankiFile" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    // Forward the form data to the backend API
    const backendFormData = new FormData();
    backendFormData.append("ankiFile", ankiFile);
    backendFormData.append("userId", userId);

    const headers = {};
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const res = await fetch(`${API_BASE}/courses/${courseId}/flashcards/upload`, {
      method: "POST",
      headers,
      body: backendFormData,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Error uploading Anki flashcards:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
