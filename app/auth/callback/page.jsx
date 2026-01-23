import AuthCallbackClient from "./AuthCallbackClient";

// Force dynamic rendering since this page uses browser APIs (window.location.hash)
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Verifying Email | Kogno",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthCallbackPage() {
  return <AuthCallbackClient />;
}
