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
    <div className="relative min-h-screen bg-[var(--background)] px-4 py-20 text-[var(--foreground)] transition-colors overflow-hidden">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-[var(--primary)]/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-[var(--primary)]/5 blur-3xl"></div>
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
        {/* Left column - Form */}
        <div className="order-2 lg:order-1">
          <div className="card rounded-[32px] border-2 border-[var(--primary)]/20 p-10 sm:p-12 shadow-2xl backdrop-blur-sm">
            <div className="mb-8 space-y-3">
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:opacity-80 transition-opacity">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to home
              </Link>
              <h1 className="text-4xl font-bold">Welcome back</h1>
              <p className="text-[var(--muted-foreground)]">
                Continue your learning journey
              </p>
            </div>

            <Suspense fallback={<SignInFormSkeleton />}>
              <SignInForm />
            </Suspense>

            <div className="mt-8 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">
                New to Kogno?{" "}
                <Link href="/auth/sign-up" className="font-semibold text-[var(--primary)] hover:opacity-80 transition-opacity">
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Right column - Benefits */}
        <div className="order-1 lg:order-2 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-4 py-2 backdrop-blur-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">Trusted by thousands</span>
            </div>
            <h2 className="text-3xl font-bold sm:text-4xl lg:text-5xl">
              Your study workspace awaits
            </h2>
            <p className="text-lg text-[var(--muted-foreground)] leading-relaxed">
              Access personalized course plans, intelligent flashcards, and collaborative study tools from anywhere.
            </p>
          </div>

          <div className="grid gap-5">
            {["Unified syllabus view", "AI-powered flashcards", "Progress tracking", "Collaboration tools"].map((item, idx) => (
              <div 
                key={item} 
                className="card rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/80 p-6 backdrop-blur-sm hover:border-[var(--primary)]/50 hover:shadow-lg transition-all group"
                style={{animationDelay: `${idx * 0.1}s`}}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 group-hover:from-[var(--primary)]/30 group-hover:to-[var(--primary)]/10 transition-all">
                    <svg className="h-6 w-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[var(--foreground)] mb-1">{item}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {idx === 0 ? "Keep all your courses organized in one place" : 
                       idx === 1 ? "Study smarter with adaptive learning" :
                       idx === 2 ? "Monitor your progress and stay motivated" :
                       "Study together with classmates and friends"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[var(--primary)]/30 bg-gradient-to-br from-[var(--primary)]/10 to-transparent p-6 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/20">
                <svg className="h-5 w-5 text-[var(--primary)]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[var(--foreground)] mb-1">Quick tip</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Enable notifications to get reminders for upcoming study sessions and deadlines
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignInFormSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-10 rounded-lg bg-[var(--surface-2)]"></div>
      <div className="h-10 rounded-lg bg-[var(--surface-2)]"></div>
      <div className="h-12 rounded-lg bg-[var(--surface-muted)] mt-6"></div>
    </div>
  );
}
