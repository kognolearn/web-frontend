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
      <div className="mx-auto w-full max-w-7xl px-6 py-16 sm:px-8 lg:px-12 space-y-20">
        {/* Hero Section */}
        <section className="grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/5 px-4 py-2">
              <div className="h-2 w-2 rounded-full bg-[var(--primary)]"></div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">AI-Powered Learning</span>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl text-[var(--foreground)]">
                Master every subject with AI-powered learning
              </h1>
              <p className="text-lg text-[var(--muted-foreground)] leading-relaxed max-w-xl">
                Transform your study workflow with personalized course plans, intelligent flashcards, and progress tracking.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="/auth/create-account" className="btn btn-primary btn-lg">
                Start for free
              </Link>
              <Link href="/auth/sign-in" className="btn btn-outline btn-lg">
                Sign in
              </Link>
            </div>

            <div className="flex flex-wrap items-start gap-x-6 gap-y-3 pt-2">
              {highlights.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-[var(--primary)] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-[var(--muted-foreground)]">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Demo preview */}
          <div className="relative">
            <div className="card rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Study Dashboard</span>
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-[var(--muted-foreground)]/30"></div>
                    <div className="h-2.5 w-2.5 rounded-full bg-[var(--muted-foreground)]/30"></div>
                    <div className="h-2.5 w-2.5 rounded-full bg-[var(--muted-foreground)]/30"></div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {["Neurobiology midterm review", "Grant writing workshop", "Data viz critique"].map((task, index) => (
                    <div 
                      key={task} 
                      className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 hover:border-[var(--primary)]/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--foreground)]">{task}</p>
                        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                          {index === 0 ? "Due today" : index === 1 ? "Due Friday" : "Next week"}
                        </p>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">This Week</p>
                    <span className="text-xs text-[var(--muted-foreground)]">11 hours</span>
                  </div>
                  <div className="space-y-2.5">
                    {[{label: "Deep work", value: 65}, {label: "Quick review", value: 40}].map((stat) => (
                      <div key={stat.label}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-[var(--foreground)]">{stat.label}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--primary)]"
                            style={{ width: `${stat.value}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold sm:text-4xl text-[var(--foreground)]">Everything you need to succeed</h2>
            <p className="text-base text-[var(--muted-foreground)]">Powerful tools that adapt to your learning style and goals</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="card rounded-xl border border-[var(--border)] p-6 hover:border-[var(--primary)]/50 transition-all">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                  <svg className="h-6 w-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {feature.title.includes("search") ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    ) : feature.title.includes("tracking") ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    )}
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">{feature.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Workflow Section */}
        <section className="card rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-8 sm:p-12">
          <div className="text-center space-y-3 mb-10">
            <h2 className="text-3xl font-bold sm:text-4xl text-[var(--foreground)]">Get started in minutes</h2>
            <p className="text-base text-[var(--muted-foreground)]">Three simple steps to transform your learning</p>
          </div>
          <div className="grid gap-8 lg:grid-cols-3 mb-10">
            {workflow.map((step, idx) => (
              <div key={step.label} className="relative text-center space-y-3">
                {idx < workflow.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-px bg-[var(--border)]"></div>
                )}
                <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)] text-lg font-bold text-white shadow-md">
                  {step.label}
                </div>
                <h3 className="text-lg font-bold text-[var(--foreground)]">{step.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-center">
            <div className="space-y-3 mb-4">
              <h3 className="text-xl font-bold text-[var(--foreground)]">Ready to transform your learning?</h3>
              <p className="text-sm text-[var(--muted-foreground)]">Join thousands of students achieving their goals</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
              <Link href="/auth/create-account" className="btn btn-primary btn-lg">
                Start learning for free
              </Link>
              <span className="text-xs text-[var(--muted-foreground)]">No credit card required</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
