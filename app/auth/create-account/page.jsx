import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { getDownloadRedirectPath } from "@/lib/featureFlags";

// Force dynamic rendering due to auth check
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create Account | Kogno",
  description: "Create your workspace and start organizing every study goal",
};

export default async function CreateAccountPage({ searchParams }) {
  const redirectTo = searchParams?.redirectTo;
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

  // Authenticated users go to dashboard
  if (session) {
    redirect(getDownloadRedirectPath(redirectTo || "/dashboard"));
  }

  // Redirect unauthenticated users to landing page with signup form
  // Preserve redirectTo parameter if present
  if (redirectTo) {
    redirect(`/?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  redirect("/");
}
