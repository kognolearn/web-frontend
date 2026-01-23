import ConfirmEmailClient from "./ConfirmEmailClient";

// Force dynamic rendering since this page uses useSearchParams
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Confirm Your Email | Kogno",
  description: "Please check your email to confirm your Kogno account.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ConfirmEmailPage() {
  return <ConfirmEmailClient />;
}
