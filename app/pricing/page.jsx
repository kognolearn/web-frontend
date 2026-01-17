import PricingClient from "./PricingClient";

// Pricing page is noindex because pricing is negotiation-based
export const metadata = {
  title: "Pricing | Kogno",
  description: "Choose the plan that works for you. Unlock unlimited AI-powered courses, practice exams, and study materials.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
