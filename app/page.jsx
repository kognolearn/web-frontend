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
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors overflow-hidden">
      {/* Animated background gradients */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[var(--primary)]/10 blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -left-32 h-80 w-80 rounded-full bg-[var(--primary)]/5 blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-20 right-1/4 h-64 w-64 rounded-full bg-[var(--primary)]/8 blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-24 px-5 py-20 sm:px-8 lg:px-12">
        {/* Hero Section */}
        <section className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-8 animate-fadeIn">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/5 px-5 py-2 backdrop-blur-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--primary)]"></span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">Study for Anything</span>
            </div>
            
            <div className="space-y-6">
              <h1 className="text-5xl font-bold leading-[1.1] sm:text-6xl lg:text-7xl bg-gradient-to-br from-[var(--foreground)] to-[var(--muted-foreground)] bg-clip-text text-transparent">
                Master every subject with AI-powered learning
              </h1>
              <p className="text-lg text-[var(--muted-foreground)] sm:text-xl leading-relaxed max-w-2xl">
                Transform your study workflow with personalized course plans, intelligent flashcards, and progress tracking. No spreadsheets. No guesswork. Just results.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="/auth/create-account" className="btn btn-primary btn-lg group">
                Start for free
                <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link href="/auth/sign-in" className="btn btn-outline btn-lg">
                Sign in
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 pt-4">
              {highlights.map((item, idx) => (
                <div key={item} className="flex items-start gap-3 group">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)]/10 group-hover:bg-[var(--primary)]/20 transition-colors">
                    <svg className="h-4 w-4 text-[var(--primary)]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-sm text-[var(--muted-foreground)]">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive demo card */}
          <div className="relative lg:h-[600px] animate-fadeIn z-10" style={{animationDelay: '0.2s'}}>
            <div className="card relative rounded-[32px] border-2 border-[var(--primary)]/20 bg-gradient-to-br from-[var(--surface-1)] to-[var(--surface-2)] p-8 shadow-2xl">
              <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-br from-[var(--primary)]/20 to-transparent blur-xl"></div>
              <div className="relative space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-400"></div>
                    <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                    <div className="h-3 w-3 rounded-full bg-green-400"></div>
                  </div>
                  <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Study Dashboard</span>
                </div>
                
                <div className="space-y-4">
                  {["Neurobiology midterm review", "Grant writing workshop", "Data viz critique", "CFA Level I formulas"].map((task, index) => (
                    <div 
                      key={task} 
                      className="group rounded-2xl border border-[var(--border)] bg-[var(--background)]/80 p-5 backdrop-blur-sm hover:border-[var(--primary)]/50 hover:shadow-lg transition-all cursor-pointer"
                      style={{animationDelay: `${index * 0.1}s`}}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">{task}</p>
                          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                            {index === 0 ? "Due today • Active" : index === 1 ? "Friday • Prep focus" : index === 2 ? "Next week • Feedback" : "Self-paced • Concept refresh"}
                          </p>
                        </div>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--primary)]/10 to-transparent p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">Study Pulse</p>
                    <span className="text-xs text-[var(--muted-foreground)]">This week</span>
                  </div>
                  <div className="space-y-4">
                    {["Deep work", "Quick review", "Collaboration"].map((label, idx) => (
                      <div key={label} className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[var(--foreground)]">{label}</span>
                          <span className="text-[var(--muted-foreground)]">{idx === 0 ? "6h completed" : idx === 1 ? "3h completed" : "2h completed"}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] transition-all duration-1000"
                            style={{ width: idx === 0 ? "70%" : idx === 1 ? "45%" : "30%" }}
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
        <section className="space-y-10 relative z-20">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">Designed for excellence</p>
            <h2 className="text-3xl font-bold sm:text-4xl lg:text-5xl">Everything you need to succeed</h2>
            <p className="text-lg text-[var(--muted-foreground)]">Powerful tools that adapt to your learning style and goals</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature, idx) => (
              <div key={feature.title} className="card group rounded-[24px] border-2 border-[var(--border)] p-8 hover:border-[var(--primary)]/50 hover:shadow-2xl transition-all cursor-pointer" style={{animationDelay: `${idx * 0.1}s`}}>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 group-hover:from-[var(--primary)]/30 group-hover:to-[var(--primary)]/10 transition-all">
                  <svg className="h-7 w-7 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {idx === 0 ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    ) : idx === 1 ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    )}
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-[var(--foreground)] mb-3 group-hover:text-[var(--primary)] transition-colors">{feature.title}</h3>
                <p className="text-[var(--muted-foreground)] leading-relaxed">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Workflow Section */}
        <section className="card rounded-[32px] border-2 border-[var(--primary)]/20 bg-gradient-to-br from-[var(--surface-1)] to-[var(--surface-2)] p-10 sm:p-16">
          <div className="text-center space-y-4 mb-12">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">Simple workflow</p>
            <h2 className="text-3xl font-bold sm:text-4xl lg:text-5xl">Get started in minutes</h2>
          </div>
          <div className="grid gap-10 lg:grid-cols-3">
            {workflow.map((step, idx) => (
              <div key={step.label} className="relative group">
                {idx < workflow.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-0.5 bg-gradient-to-r from-[var(--primary)]/50 to-transparent"></div>
                )}
                <div className="relative space-y-4 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-2xl font-bold text-white shadow-lg group-hover:scale-110 transition-transform">
                    {step.label}
                  </div>
                  <h3 className="text-xl font-bold">{step.title}</h3>
                  <p className="text-[var(--muted-foreground)]">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col gap-6 rounded-3xl border border-[var(--border)] bg-[var(--background)]/80 p-8 text-center sm:text-left">
            <div className="space-y-3">
              <h3 className="text-xl font-bold">Ready to transform your learning?</h3>
              <p className="text-[var(--muted-foreground)]">Join thousands of students achieving their academic goals with Kogno</p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center">
              <Link href="/auth/create-account" className="btn btn-primary btn-lg">
                Start learning for free
              </Link>
              <span className="text-sm text-[var(--muted-foreground)]">No credit card required</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
