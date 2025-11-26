import { NextResponse } from "next/server";

const BASE_URL = process.env.BACKEND_API_URL || "https://api.kognolearn.com";

export async function PATCH(request, { params }) {
  try {
    const { courseId } = params;
    
    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    const json = await request.json().catch(() => ({}));
    
    if (!json.userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (typeof json.seconds_to_complete !== 'number' || json.seconds_to_complete < 0) {
      return NextResponse.json({ error: "seconds_to_complete must be a non-negative number" }, { status: 400 });
    }

    const url = new URL(`/courses/${encodeURIComponent(courseId)}/settings`, BASE_URL);

    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 5000);
    
    try {
      const res = await fetch(url.toString(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(json),
        signal: controller.signal,
      });
      
      const bodyText = await res.text();
      let data;
      try { 
        data = bodyText ? JSON.parse(bodyText) : {}; 
      } catch { 
        data = { error: "Invalid JSON from backend" }; 
      }
      
      if (!res.ok) {
        return NextResponse.json(data, { status: res.status });
      }
      
      return NextResponse.json(data, { status: 200 });
    } finally {
      clearTimeout(to);
    }
  } catch (err) {
    return NextResponse.json({ 
      error: "Internal server error", 
      details: String(err) 
    }, { status: 500 });
  }
}
