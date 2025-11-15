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
    <div className="min-h-screen bg-[var(--background)] px-4 py-16 text-[var(--foreground)] transition-colors">
      <div className="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[3fr_2fr]">
        <div className="card-shell rounded-3xl p-10">
          <div className="mb-8 space-y-2 text-left">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted-foreground)]">Study for Anything</p>
            <h1 className="text-3xl font-semibold">Sign in to your workspace</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Access task boards, study decks, and shared syllabi from any device.
            </p>
          </div>

          <Suspense fallback={<SignInFormSkeleton />}>
            <SignInForm />
          </Suspense>

          <div className="mt-6 flex flex-col gap-3 text-sm text-[var(--muted-foreground)] sm:flex-row sm:items-center sm:justify-between">
            <span>New here? <Link href="/auth/sign-up" className="font-medium text-[var(--foreground)]">Create an account</Link></span>
            <span className="text-xs">By signing in you agree to our Terms of Service and Privacy Policy.</span>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--surface-2)] bg-[var(--surface)] p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted-foreground)]">Workspace preview</p>
          <h2 className="mt-4 text-xl font-semibold">What waits on the inside</h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Keep every course, certification, or cohort aligned. No fillers—just the context you set.
          </p>
          <div className="mt-6 space-y-4">
            {["Unified syllabus view", "Flashcards + focus timers", "Collaboration-ready notes", "Weekly reflection prompts"].map((item) => (
              <div key={item} className="rounded-2xl border border-[var(--surface-2)] bg-[var(--background)]/60 p-4">
                <p className="text-sm font-medium">{item}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Curated by your goals and updated whenever plans shift.</p>
              </div>
            ))}
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
