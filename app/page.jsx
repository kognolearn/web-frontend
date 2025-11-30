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

  const features = [
    {
      icon: "search",
      title: "Smart Organization",
      body: "Intelligent course structuring that adapts to your learning goals.",
    },
    {
      icon: "chart",
      title: "Progress Tracking",
      body: "Visual insights into your study patterns and knowledge gaps.",
    },
    {
      icon: "flash",
      title: "Active Recall",
      body: "Intelligent flashcards and quizzes that reinforce what matters.",
    },
  ];

  return (
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)] overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div 
          className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full blur-3xl" 
          style={{ background: `radial-gradient(circle, rgba(var(--primary-rgb), var(--grid-glow-opacity)) 0%, transparent 100%)` }}
        />
        <div 
          className="absolute top-1/2 -left-40 h-[500px] w-[500px] rounded-full blur-3xl"
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

      {/* Navigation */}
      <nav className="relative z-10 mx-auto max-w-6xl px-6 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-[var(--primary)]">
            Kogno
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/sign-in" className="px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
              Sign in
            </Link>
            <Link href="/auth/create-account" className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-20">
        {/* Hero Section */}
        <section className="pt-16 pb-20 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
              Learn smarter,
              <span className="block text-[var(--primary)]">not harder</span>
            </h1>
            <p className="text-lg sm:text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto leading-relaxed">
              Personalized study plans, flashcards, and progress tracking—all in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link 
                href="/auth/create-account" 
                className="w-full sm:w-auto px-8 py-3.5 text-base font-medium rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 transition-all shadow-lg shadow-[var(--primary)]/25 hover:shadow-xl hover:shadow-[var(--primary)]/30 hover:-translate-y-0.5"
              >
                Start learning free
              </Link>
              <Link 
                href="/auth/sign-in" 
                className="w-full sm:w-auto px-8 py-3.5 text-base font-medium rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--surface-1)] transition-all"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16">
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <div 
                key={feature.title} 
                className="group relative rounded-2xl border border-white/10 dark:border-white/5 bg-[var(--surface-1)]/50 backdrop-blur-sm p-6 hover:border-[var(--primary)]/30 transition-all hover:-translate-y-1"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5">
                  <svg className="h-5 w-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    {feature.icon === "search" ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    ) : feature.icon === "chart" ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    )}
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-[var(--foreground)] mb-2">{feature.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 text-center">
          <div className="rounded-3xl border border-white/10 dark:border-white/5 bg-gradient-to-b from-[var(--surface-1)] to-transparent p-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to start?</h2>
            <p className="text-[var(--muted-foreground)] mb-8 max-w-md mx-auto">
              Create your free account and build your first course in minutes.
            </p>
            <Link 
              href="/auth/create-account" 
              className="inline-flex px-8 py-3.5 text-base font-medium rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 transition-all shadow-lg shadow-[var(--primary)]/25"
            >
              Get started free
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-8 pb-6 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            © {new Date().getFullYear()} Kogno. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
