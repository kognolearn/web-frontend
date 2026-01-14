import { NextResponse } from "next/server";

const BASE_URL = process.env.BACKEND_API_URL || "https://api.kognolearn.com";

/**
 * GET /api/queue/status
 * Proxy to backend queue status endpoint
 * Returns queue status and credit utilization for high usage warnings
 */
export async function GET() {
  try {
    const url = new URL("/queue/status", BASE_URL);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      });

      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    // Return safe defaults on error
    return NextResponse.json({
      isHighUsage: false,
      creditsUsed: 0,
      maxCredits: 60,
      creditUtilization: 0,
      estimatedWaitMinutes: null,
    });
  }
}
