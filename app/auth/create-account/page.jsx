import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { getDownloadRedirectPath } from "@/lib/featureFlags";
import Link from "next/link";
import { Suspense } from "react";
import SignUpForm from "@/components/auth/SignUpForm";

// Force dynamic rendering due to auth check
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create Account | Kogno",
  description: "Create your workspace and start organizing every study goal",
};

export default async function CreateAccountPage({ searchParams }) {
  const redirectTo = searchParams?.redirectTo;
  const joinCourse = searchParams?.joinCourse;
  const isJoinFlow = joinCourse === "1" || joinCourse === "true";
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
  if (session && !session.user?.is_anonymous) {
    redirect(getDownloadRedirectPath(redirectTo || "/dashboard"));
  }

  if (isJoinFlow) {
    const signInHref = `/auth/sign-in${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`;
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-[var(--background)] px-4 py-12 overflow-hidden">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.75)) 0%, transparent 100%)` }}
          />
          <div
            className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.5)) 0%, transparent 100%)` }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative z-10 w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block text-xl font-bold text-[var(--primary)] tracking-tight">
              Kogno
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 dark:border-white/5 bg-[var(--surface-1)]/80 backdrop-blur-xl p-8 shadow-2xl">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold mb-2">Create your account</h1>
              <p className="text-sm text-[var(--muted-foreground)]">
                Sign up to join the course and save your progress
              </p>
            </div>

            <Suspense fallback={<SignUpFormSkeleton />}>
              <SignUpForm redirectTo={redirectTo || null} />
            </Suspense>

            <div className="mt-8 pt-6 border-t border-white/10 dark:border-white/5 text-center">
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                Already have an account?
              </p>
              <Link
                href={signInHref}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[var(--surface-1)] border border-white/10 text-[var(--foreground)] font-medium hover:bg-[var(--surface-2)] transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Redirect unauthenticated users to landing page with signup form
  // Preserve redirectTo parameter if present
  if (redirectTo) {
    redirect(`/?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  redirect("/");
}

function SignUpFormSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 rounded-lg bg-[var(--surface-2)]"></div>
      <div className="h-10 rounded-lg bg-[var(--surface-2)]"></div>
      <div className="h-10 rounded-lg bg-[var(--surface-2)]"></div>
      <div className="h-10 rounded-lg bg-[var(--surface-2)] mt-4"></div>
    </div>
  );
}
