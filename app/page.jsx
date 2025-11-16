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
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-gradient-to-r from-[var(--primary)]/10 to-[var(--secondary)]/10 px-5 py-2.5 backdrop-blur-sm">
              <div className="h-2 w-2 rounded-full bg-[var(--primary)] animate-pulse"></div>
              <span className="text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">AI-Powered Learning</span>
            </div>
            
            <div className="space-y-6">
              <h1 className="text-5xl font-extrabold leading-tight sm:text-6xl lg:text-7xl">
                <span className="bg-gradient-to-r from-[var(--foreground)] via-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
                  Master every subject
                </span>
                <br />
                <span className="text-[var(--foreground)]">with AI-powered learning</span>
              </h1>
              <p className="text-xl text-[var(--muted-foreground)] leading-relaxed max-w-xl">
                Transform your study workflow with personalized course plans, intelligent flashcards, and progress tracking that adapts to your learning style.
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
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-3xl opacity-20 blur-2xl"></div>
            
            <div className="relative card rounded-3xl border-2 border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <span className="text-sm font-bold text-[var(--foreground)]">Study Dashboard</span>
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {["Neurobiology midterm review", "Grant writing workshop", "Data viz critique"].map((task, index) => (
                    <div 
                      key={task} 
                      className="group flex items-center justify-between rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-1)] p-4 hover:border-[var(--primary)]/50 hover:shadow-lg transition-all cursor-pointer"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[var(--foreground)]">{task}</p>
                        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                          {index === 0 ? "Due today" : index === 1 ? "Due Friday" : "Next week"}
                        </p>
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-white shadow-md group-hover:scale-110 transition-transform">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-[var(--primary)]/30 bg-gradient-to-br from-[var(--primary)]/10 to-[var(--secondary)]/10 p-5 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">This Week</p>
                    <span className="text-sm font-bold text-[var(--foreground)]">11 hours</span>
                  </div>
                  <div className="space-y-3">
                    {[{label: "Deep work", value: 65}, {label: "Quick review", value: 40}].map((stat) => (
                      <div key={stat.label}>
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="font-semibold text-[var(--foreground)]">{stat.label}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] shadow-sm"
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
        <section className="space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="text-4xl font-extrabold sm:text-5xl">
              <span className="bg-gradient-to-r from-[var(--foreground)] to-[var(--primary)] bg-clip-text text-transparent">
                Everything you need to succeed
              </span>
            </h2>
            <p className="text-lg text-[var(--muted-foreground)]">Powerful tools that adapt to your learning style and goals</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature, idx) => (
              <div key={feature.title} className="group relative card rounded-2xl border-2 border-[var(--border)] p-8 hover:border-[var(--primary)]/50 transition-all">
                {/* Gradient background on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 to-[var(--secondary)]/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="relative">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {feature.title.includes("search") ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      ) : feature.title.includes("tracking") ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      )}
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-[var(--foreground)] mb-3">{feature.title}</h3>
                  <p className="text-base text-[var(--muted-foreground)] leading-relaxed">{feature.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Workflow Section */}
        <section className="relative overflow-hidden rounded-3xl border-2 border-[var(--border)] bg-gradient-to-br from-[var(--surface-1)] to-[var(--surface-2)] p-10 sm:p-16">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[var(--primary)]/10 to-[var(--secondary)]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[var(--secondary)]/10 to-[var(--primary)]/10 rounded-full blur-3xl"></div>
          
          <div className="relative">
            <div className="text-center space-y-4 mb-14">
              <h2 className="text-4xl font-extrabold sm:text-5xl">
                <span className="bg-gradient-to-r from-[var(--foreground)] to-[var(--primary)] bg-clip-text text-transparent">
                  Get started in minutes
                </span>
              </h2>
              <p className="text-lg text-[var(--muted-foreground)]">Three simple steps to transform your learning</p>
            </div>
            
            <div className="grid gap-10 lg:grid-cols-3 mb-12">
              {workflow.map((step, idx) => (
                <div key={step.label} className="relative text-center space-y-4">
                  {idx < workflow.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-[calc(50%+3rem)] w-[calc(100%-6rem)] h-0.5 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]"></div>
                  )}
                  <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-2xl font-extrabold text-white shadow-lg">
                    {step.label}
                  </div>
                  <h3 className="text-xl font-bold text-[var(--foreground)]">{step.title}</h3>
                  <p className="text-base text-[var(--muted-foreground)] leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
            
            <div className="rounded-2xl border-2 border-[var(--primary)]/30 bg-gradient-to-br from-[var(--surface-1)] to-[var(--surface-2)] p-8 text-center shadow-xl">
              <div className="space-y-4 mb-6">
              <h3 className="text-2xl font-extrabold text-[var(--foreground)]">Ready to transform your learning?</h3>
              <p className="text-base text-[var(--muted-foreground)]">Join thousands of students achieving their goals</p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center">
              <Link href="/auth/create-account" className="btn btn-primary btn-lg">
                Start learning for free
              </Link>
              <span className="text-sm font-medium text-[var(--muted-foreground)]">No credit card required</span>
            </div>
          </div>
        </div>
        </section>
      </div>
    </div>
  );
}
