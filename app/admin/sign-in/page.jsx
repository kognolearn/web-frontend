import AdminSignInClient from "./AdminSignInClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Sign In | Kogno",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminSignInPage() {
  return <AdminSignInClient />;
}
