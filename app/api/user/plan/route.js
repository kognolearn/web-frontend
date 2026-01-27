import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";

function deriveIsPremium(status) {
  if (!status || typeof status !== "object") {
    return false;
  }

  return Boolean(
    status.hasSubscription ||
      status.trialActive ||
      status.planLevel === "paid"
  );
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const res = await fetch(`${BASE_URL}/stripe/subscription-status`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: authHeader,
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    const isPremium = deriveIsPremium(data);
    return NextResponse.json({ ...data, isPremium }, { status: 200 });
  } catch (err) {
    console.error("Error fetching user plan:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

