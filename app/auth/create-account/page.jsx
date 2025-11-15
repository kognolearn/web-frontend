import SignUpForm from "@/components/auth/SignUpForm";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

export const metadata = {
  title: "Create Account | Kogno",
  description: "Create your Kogno account to get started",
};

export default async function CreateAccountPage() {
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
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4 text-[var(--foreground)] transition-colors">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-[var(--foreground)] mb-2">
            Create account
          </h1>
          <p className="text-[var(--muted-foreground)] text-sm">
            Join thousands of students using AI for smarter studying.
          </p>
        </div>

        <div className="mb-8 text-center text-sm italic text-[var(--muted-foreground)]">
          "Kogno keeps my study plan organized without the chaos."<br />
          <span className="not-italic">- Alex, University sophomore</span>
        </div>

        {/* Create Account Form */}
        <div className="card-shell rounded-2xl p-8">
          <SignUpForm />

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              Want to sign in instead?{" "}
              <Link
                href="/auth/signin"
                className="font-medium text-[var(--foreground)] hover:text-primary transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-center text-xs text-[var(--muted-foreground)] mt-6">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
