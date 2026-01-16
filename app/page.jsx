import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import HomeContent from "@/components/onboarding/HomeContent";

export default async function Home() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/auth/create-account");
  }

  const host = headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") || "http";
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (host ? `${proto}://${host}` : "http://localhost:3000");

  let hasSubscription = false;
  try {
    const res = await fetch(
      `${baseUrl}/api/stripe?endpoint=subscription-status`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      }
    );
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      hasSubscription = Boolean(data?.hasSubscription);
    }
  } catch (error) {}

  if (hasSubscription) {
    redirect("/dashboard");
  }

  let trialActive = false;
  try {
    const res = await fetch(`${baseUrl}/api/onboarding/negotiation-status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      trialActive = data?.trialStatus === "active";
    }
  } catch (error) {}

  if (trialActive) {
    redirect("/dashboard");
  }

  return <HomeContent />;
}
