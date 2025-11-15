import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

export default async function Home() {
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
          cookieStore.set({
            name,
            value: "",
            expires: new Date(0),
            ...options,
          });
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

  const highlights = [
    "Organize every course, topic, and exam in one plan",
    "Build adaptive study blocks in under five minutes",
    "Keep momentum with reminders that respect your schedule",
  ];

  const features = [
    {
      title: "Semantic course search",
      body: "Surface the right readings, labs, and question banks by scanning your own uploads alongside trusted sources.",
    },
    {
      title: "Confidence-based tracking",
      body: "Log quick check-ins after each block so Kogno can reprioritize what needs another pass.",
    },
    {
      title: "Curriculum composer",
      body: "Map prerequisites, layered topics, and practice sets into one hub students can actually follow.",
    },
  ];

  const workflow = [
    {
      label: "1",
      title: "Capture coursework",
      desc: "Drop outlines, slides, or past exams to seed your workspace.",
    },
    {
      label: "2",
      title: "Shape a plan",
      desc: "Auto-generate blocks, deadlines, and review prompts tailored to each subject.",
    },
    {
      label: "3",
      title: "Stay accountable",
      desc: "Use the Study Pulse tracker to see what needs attention today.",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-5 py-16 sm:px-8 lg:px-0">
        <section className="grid items-center gap-10 lg:grid-cols-[3fr_2fr]">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--surface-2)] px-4 py-1 text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              <span className="h-2 w-2 rounded-full bg-[var(--primary)]"></span>
              Study for Anything
            </p>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                Planning, coaching, and content aligned to every subject on your calendar.
              </h1>
              <p className="text-base text-[var(--muted-foreground)] sm:text-lg">
                Kogno keeps academic and certification goals inside one structured workspace—no spreadsheets, no guesswork. Reuse templates, track focus, and invite collaborators when you need support.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/auth/create-account" className="btn btn-primary">
                Start for free
              </Link>
              <Link href="/auth/sign-in" className="btn btn-outline">
                Already with Kogno?
              </Link>
            </div>
            <ul className="grid gap-3 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface)] p-5 text-sm text-[var(--muted-foreground)] sm:grid-cols-2">
              {highlights.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[var(--primary)]"></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="card rounded-[28px] border border-[var(--surface-2)] bg-[var(--surface)] p-8 shadow-xl shadow-[color-mix(in srgb,var(--primary)20%,transparent)]">
              <div className="flex items-center justify-between text-sm text-[var(--muted-foreground)]">
                <span>Study Board</span>
                <span>Focus view</span>
              </div>
              <div className="mt-6 space-y-4">
                {["Neurobiology midterm review", "Grant writing workshop", "Data viz critique", "CFA Level I formulas"].map((task, index) => (
                  <div key={task} className="rounded-2xl border border-[var(--surface-muted)] bg-[var(--background)]/60 p-4">
                    <p className="text-sm font-medium">{task}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{index === 0 ? "Due today • Active" : index === 1 ? "Friday • Prep focus" : index === 2 ? "Next week • Feedback" : "Self-paced • Concept refresh"}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute -bottom-10 left-1/2 w-full max-w-sm -translate-x-1/2 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-muted)]/80 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted-foreground)]">Study Pulse</p>
              <div className="mt-4 space-y-3">
                {["Deep work", "Quick review", "Collaboration"].map((label, idx) => (
                  <div key={label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                      <span>{label}</span>
                      <span>{idx === 0 ? "Today" : idx === 1 ? "Tomorrow" : "Flexible"}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--surface-2)]">
                      <div
                        className="h-full rounded-full bg-[var(--primary)]"
                        style={{ width: idx === 0 ? "70%" : idx === 1 ? "45%" : "30%" }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted-foreground)]">Designed for teams & individuals</p>
            <h2 className="text-2xl font-semibold">Everything needed to guide a study initiative</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="card rounded-[20px] border border-[var(--surface-2)] p-6 text-left">
                <h3 className="text-lg font-medium text-[var(--foreground)]">{feature.title}</h3>
                <p className="mt-3 text-sm text-[var(--muted-foreground)]">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-[var(--surface-2)] bg-[var(--surface)] p-8">
          <div className="grid gap-8 lg:grid-cols-3">
            {workflow.map((step) => (
              <div key={step.label} className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--primary)] text-sm font-semibold text-[var(--primary)]">
                  {step.label}
                </div>
                <h3 className="text-lg font-medium">{step.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-4 rounded-2xl bg-[var(--background)]/60 p-6 text-sm text-[var(--muted-foreground)] sm:flex-row sm:items-center sm:justify-between">
            <span>Bring advisors, tutors, or classmates in with granular access controls when you are ready.</span>
            <Link href="/auth/create-account" className="btn btn-primary sm:w-auto">
              Build a workspace
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
