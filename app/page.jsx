import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import HomeContent from "@/components/onboarding/HomeContent";
import LandingPage from "@/components/landing/LandingPage";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateFAQSchema } from "@/lib/seo/structured-data";

// Landing page FAQs for structured data
const landingFAQs = [
  {
    question: "What file formats can I upload?",
    answer: "Kogno accepts PDF, DOC, DOCX, PPT, PPTX, and common image formats (PNG, JPG, JPEG). You can upload your syllabus, lecture slides, textbook chapters, or even photos of handwritten notes.",
  },
  {
    question: "Why do I need a .edu email address?",
    answer: "Kogno is built exclusively for college students. Requiring a .edu email helps us verify student status and ensures our community stays focused on academic excellence.",
  },
  {
    question: "How does the AI tutor work?",
    answer: "The AI tutor is powered by Claude and has full context of your course materials. Ask it to explain concepts, work through practice problems, or quiz you on material.",
  },
  {
    question: "What's the difference between Deep Study and Cram modes?",
    answer: "Deep Study mode is for thorough learning when you have time. Cram mode is for when you're short on time before an exam—it prioritizes the most important material.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes. Your course materials and study data are encrypted and stored securely. We never share your information with third parties.",
  },
  {
    question: "What devices can I use Kogno on?",
    answer: "Kogno works on any device with a modern web browser—laptop, desktop, tablet, or phone. Your progress syncs across all devices.",
  },
];

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

  // Unauthenticated users see the landing page
  if (!session) {
    return (
      <>
        <JsonLd schema={generateFAQSchema(landingFAQs)} />
        <LandingPage />
      </>
    );
  }

  // Authenticated users continue with the existing flow
  const host = headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") || "http";
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (host ? `${proto}://${host}` : "http://localhost:3000");

  let hasSubscription = false;
  let trialActive = false;
  let hasAccess = false;

  // Check subscription status
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
      trialActive = Boolean(data?.trialActive);
      hasAccess = hasSubscription || trialActive;
    }
  } catch (error) {}

  // If no subscription/trial, also check negotiation status for expired_free users
  if (!hasAccess) {
    try {
      const negotiationRes = await fetch(
        `${baseUrl}/api/onboarding/negotiation-status`,
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
    } catch (error) {}
  }

  if (hasAccess) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  return <HomeContent />;
}
