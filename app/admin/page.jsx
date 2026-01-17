import AdminClient from "./AdminClient";

// Force dynamic rendering - admin page uses auth and client-side data
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Dashboard | Kogno",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <AdminClient />;
}
