import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-[var(--foreground)] transition-colors">
      <div className="w-full max-w-3xl text-center space-y-10">
        <div className="mx-auto max-w-2xl gradient-border rounded-3xl">
          <div className="card-shell rounded-3xl px-10 py-12">
            <div className="mx-auto mb-6">
              <h2 className="text-2xl font-bold text-primary">Preply</h2>
            </div>
            <h1 className="text-4xl sm:text-5xl font-semibold leading-tight">
              Study for Everything.
            </h1>
            <p className="mt-4 text-base sm:text-lg text-[var(--muted-foreground)]">
              Build immersive study plans, track your confidence, and let curated topics keep you ahead of every lecture.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/signup"
                className="bg-primary hover:bg-primary-hover text-sm font-semibold px-6 py-3 rounded-full shadow-lg"
              >
                Create your account
              </Link>
              <Link
                href="/auth/signin"
                className="rounded-full border border-[var(--border-muted)] px-6 py-3 text-sm font-semibold text-[var(--foreground)]/90 hover:text-[var(--foreground)] transition-colors"
              >
                I already have access
              </Link>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {["Generate courses in seconds", "Learn anything you desire", "Stay on track with reminders"].map((feature) => (
            <div key={feature} className="card-shell rounded-2xl px-5 py-6 text-left">
              <p className="text-sm font-medium text-[var(--muted-foreground-strong)] text-center">{feature}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
