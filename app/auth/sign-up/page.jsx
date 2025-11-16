import SignUpForm from "@/components/auth/SignUpForm";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

export const metadata = {
  title: "Sign Up | Kogno",
  description: "Create your workspace and start organizing every study goal",
};

export default async function SignUpPage() {
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

  const commitments = [
    "No vague dashboards—every block is tied to a specific course or certification.",
    "Structured templates for labs, readings, and exam prep you can remix.",
    "Context-aware reminders so you actually close the loop on study goals.",
  ];

  return (
    <div className="relative min-h-screen bg-[var(--background)] px-4 py-20 text-[var(--foreground)] transition-colors overflow-hidden">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-0 h-96 w-96 rounded-full bg-[var(--primary)]/10 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[var(--primary)]/5 blur-3xl"></div>
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
        {/* Left column - Benefits */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-4 py-2 backdrop-blur-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--primary)]"></span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">Join thousands of learners</span>
            </div>
            <h2 className="text-3xl font-bold sm:text-4xl lg:text-5xl">
              Start your learning journey today
            </h2>
            <p className="text-lg text-[var(--muted-foreground)] leading-relaxed">
              Create your account and unlock personalized study plans, AI-powered tools, and collaborative features.
            </p>
          </div>

          <div className="grid gap-5">
            {commitments.map((item, idx) => (
              <div 
                key={item} 
                className="card rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/80 p-6 backdrop-blur-sm hover:border-[var(--primary)]/50 hover:shadow-lg transition-all group"
                style={{animationDelay: `${idx * 0.1}s`}}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 group-hover:from-[var(--primary)]/30 group-hover:to-[var(--primary)]/10 transition-all flex-shrink-0">
                    <svg className="h-6 w-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{item}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border-2 border-[var(--primary)]/30 bg-gradient-to-br from-[var(--primary)]/10 to-transparent p-8 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary)] mb-4">What you get</p>
            <h3 className="font-bold text-xl mb-4 text-[var(--foreground)]">Complete learning toolkit</h3>
            <ul className="space-y-3 text-sm text-[var(--muted-foreground)]">
              {[
                "Adaptive study schedules based on your pace",
                "Smart flashcards with spaced repetition",
                "Progress analytics and insights",
                "Collaborative study rooms",
                "Priority support from our team"
              ].map((line, idx) => (
                <li key={line} className="flex items-start gap-3">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)]/20 flex-shrink-0 mt-0.5">
                    <svg className="h-3 w-3 text-[var(--primary)]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right column - Form */}
        <div>
          <div className="card rounded-[32px] border-2 border-[var(--primary)]/20 p-10 sm:p-12 shadow-2xl backdrop-blur-sm">
            <div className="mb-8 space-y-3">
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:opacity-80 transition-opacity">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to home
              </Link>
              <h1 className="text-4xl font-bold">Create account</h1>
              <p className="text-[var(--muted-foreground)]">
                Get started with your free account
              </p>
            </div>

            <SignUpForm />

            <div className="mt-8 text-center space-y-3">
              <p className="text-sm text-[var(--muted-foreground)]">
                Already have an account?{" "}
                <Link href="/auth/sign-in" className="font-semibold text-[var(--primary)] hover:opacity-80 transition-opacity">
                  Sign in
                </Link>
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                By signing up you agree to our{" "}
                <Link href="/terms" className="underline hover:text-[var(--foreground)]">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="underline hover:text-[var(--foreground)]">Privacy Policy</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
