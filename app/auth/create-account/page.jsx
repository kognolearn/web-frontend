import SignUpForm from "@/components/auth/SignUpForm";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

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
    redirect("/download");
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[var(--background)] px-4 py-12 overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div 
          className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full blur-3xl" 
          style={{ background: `radial-gradient(circle, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.75)) 0%, transparent 100%)` }}
        />
        <div 
          className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.5)) 0%, transparent 100%)` }}
        />
        <div 
          className="absolute inset-0"
          style={{ 
            backgroundImage: `linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-2xl font-bold text-[var(--primary)]">
            Kogno
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 dark:border-white/5 bg-[var(--surface-1)]/80 backdrop-blur-xl p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold mb-2">Create your account</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Start your learning journey
            </p>
          </div>

          <SignUpForm />

          <div className="mt-8 pt-6 border-t border-white/10 dark:border-white/5 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              Already have an account?{" "}
              <Link
                href={`/auth/sign-in${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
                className="font-medium text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
