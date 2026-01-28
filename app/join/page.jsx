import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

// Force dynamic rendering due to auth check
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Join Kogno",
  description: "Join Kogno and start your learning journey",
};

export default async function JoinPage({ searchParams }) {
  const params = await searchParams;
  const ref = params?.ref;

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

  // Signed-in non-anonymous users bypass referral
  if (session && !session.user?.is_anonymous) {
    redirect("/dashboard");
  }

  // Redirect to onboarding chat with referral code preserved
  if (ref) {
    redirect(`/?ref=${encodeURIComponent(ref)}`);
  }

  redirect("/");
}
