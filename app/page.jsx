import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import HomeContent from "@/components/onboarding/HomeContent";

export const metadata = {
  title: "Kogno - AI-Powered Study Platform for Students",
  description: "Upload your syllabus and get personalized study plans, flashcards, practice exams, and an AI tutor. Built for college students with .edu email addresses.",
  keywords: [
    "AI learning",
    "study app",
    "flashcards",
    "practice exams",
    "AI tutor",
    "college study tool",
    "syllabus to study plan",
    "personalized learning",
    "exam preparation",
    "spaced repetition",
    "adaptive learning",
    "student study platform",
  ],
  openGraph: {
    title: "Kogno - Learn Smarter, Not Harder",
    description: "Upload your syllabus and get personalized study plans, flashcards, practice exams, and an AI tutor.",
    type: "website",
  },
  twitter: {
    title: "Kogno - Learn Smarter, Not Harder",
    description: "Upload your syllabus and get personalized study plans, flashcards, practice exams, and an AI tutor.",
  },
};

export default async function Home() {
  const cookieStore = await cookies();
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

  // Unauthenticated users see the onboarding chat
  if (!session) {
    return <HomeContent />;
  }

  // Authenticated users continue with the existing flow
  // Call backend directly (internal API routes can fail on Vercel Edge)
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.kognolearn.com";

  let hasSubscription = false;
  let trialActive = false;
  let hasAccess = false;

  // Check subscription status directly from backend
  try {
    const res = await fetch(
      `${backendUrl}/stripe/subscription-status`,
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
      trialActive = Boolean(data?.trialActive);
      hasAccess = hasSubscription || trialActive;
    }
  } catch (error) {
    console.error("[page.jsx] subscription-status fetch failed:", error);
  }

  // If no subscription/trial, also check negotiation status for expired_free users
  if (!hasAccess) {
    try {
      const negotiationRes = await fetch(
        `${backendUrl}/onboarding/negotiation-status`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }
      );
      if (negotiationRes.ok) {
        const negotiation = await negotiationRes.json().catch(() => ({}));
        const trialStatus = typeof negotiation?.trialStatus === 'string' ? negotiation.trialStatus : 'none';
        // Users with active trial or who chose free plan after trial should go to dashboard
        if (trialStatus === 'active' || trialStatus === 'expired_free') {
          hasAccess = true;
        }
      }
    } catch (error) {
      console.error("[page.jsx] negotiation-status fetch failed:", error);
    }
  }

  if (hasAccess) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  return <HomeContent />;
}
