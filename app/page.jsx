import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-[var(--foreground)] transition-colors">
      <div className="w-full max-w-3xl text-center space-y-10">
        <div className="mx-auto max-w-2xl">
          <div className="card rounded-[24px] px-10 py-12">
            <div className="mx-auto mb-6">
              <h2 className="text-2xl font-bold" style={{color: 'var(--primary)'}}>Kogno</h2>
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
                className="btn btn-primary"
              >
                Create your account
              </Link>
              <Link
                href="/auth/signin"
                className="btn btn-outline"
              >
                I already have access
              </Link>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {["Generate courses in seconds", "Learn anything you desire", "Stay on track with reminders"].map((feature) => (
            <div key={feature} className="card rounded-[16px] px-5 py-6 text-left">
              <p className="text-sm font-medium text-center" style={{color: 'color-mix(in srgb, var(--foreground) 80%, var(--muted-foreground))'}}>{feature}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
