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
    <div className="min-h-screen bg-[var(--background)] px-4 py-16 text-[var(--foreground)] transition-colors">
      <div className="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[3fr_2fr]">
        <div className="card-shell rounded-3xl p-10">
          <div className="mb-8 space-y-2 text-left">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted-foreground)]">Study for Anything</p>
            <h1 className="text-3xl font-semibold">Create your Kogno workspace</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Centralize every syllabus, project brief, and prep plan without juggling extra tools.
            </p>
          </div>

          <SignUpForm />

          <div className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
            Already have access?{" "}
            <Link href="/auth/sign-in" className="font-medium text-[var(--foreground)]">
              Sign in
            </Link>
          </div>

          <p className="mt-4 text-center text-xs text-[var(--muted-foreground)]">
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--surface-2)] bg-[var(--surface)] p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted-foreground)]">What you unlock</p>
          <h2 className="mt-4 text-xl font-semibold">A system that respects your effort</h2>
          <div className="mt-6 space-y-4 text-sm text-[var(--muted-foreground)]">
            {commitments.map((item) => (
              <div key={item} className="rounded-2xl border border-[var(--surface-2)] bg-[var(--background)]/60 p-4">
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-dashed border-[var(--surface-2)] bg-[var(--background)]/50 p-5 text-sm">
            <p className="font-medium text-[var(--foreground)]">Plan-ready toolkit</p>
            <ul className="mt-3 space-y-2 text-[var(--muted-foreground)]">
              {[
                "Reusable study cadences for lectures, labs, and certifications",
                "Course libraries where you can store notes, decks, and flashcards",
                "Role-based invites so mentors can review progress without editing",
              ].map((line) => (
                <li key={line} className="flex gap-2 text-sm">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[var(--primary)]"></span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
