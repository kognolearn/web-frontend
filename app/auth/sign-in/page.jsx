import SignInForm from "@/components/auth/SignInForm";
import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

export const metadata = {
  title: "Sign In | Kogno",
  description: "Access your courses and continue learning",
};

export default async function SignInPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: "", expires: new Date(0), ...options });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card rounded-lg border border-[var(--border)] p-8 shadow-lg">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Sign In</h1>
            <p className="text-[var(--muted-foreground)]">
              Welcome back to Kogno
            </p>
          </div>

          <Suspense fallback={<SignInFormSkeleton />}>
            <SignInForm />
          </Suspense>

          <div className="mt-6 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              Don't have an account?{" "}
              <Link href="/auth/create-account" className="font-medium text-[var(--primary)] hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignInFormSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 rounded-lg bg-[var(--surface-2)]"></div>
      <div className="h-10 rounded-lg bg-[var(--surface-2)]"></div>
      <div className="h-10 rounded-lg bg-[var(--surface-2)] mt-4"></div>
    </div>
  );
}
