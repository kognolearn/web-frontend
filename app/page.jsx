import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors">
      {/* Hero Section */}
      <section className="px-4 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto text-center space-y-8">
          {/* Logo/Brand */}
          <div className="mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold" style={{color: 'var(--primary)'}}>Kogno</h2>
          </div>
          
          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight" style={{color: 'var(--primary)'}}>
            Study for Everything.
          </h1>
          
          {/* Supporting Text */}
          <p className="mt-6 text-lg sm:text-xl text-[var(--muted-foreground)] max-w-3xl mx-auto">
            Build immersive study plans, track your confidence, and let curated topics keep you ahead of every lecture.
          </p>
          
          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="btn btn-primary text-lg px-8 py-3"
            >
              Create your account
            </Link>
            <Link
              href="/auth/signin"
              className="btn btn-outline text-lg px-8 py-3"
            >
              I already have access
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section - Card Grid */}
      <section className="px-4 py-16 bg-[var(--surface-muted)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12" style={{color: 'var(--primary)'}}>
            Everything you need to succeed
          </h2>
          
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Generate courses in seconds",
                description: "Create comprehensive study courses instantly with AI-powered content generation tailored to your learning style.",
                icon: "⚡"
              },
              {
                title: "Learn anything you desire",
                description: "From mathematics to literature, explore any subject with personalized study materials and interactive content.",
                icon: "📚"
              },
              {
                title: "Stay on track with reminders",
                description: "Never miss a deadline with intelligent reminders and progress tracking to keep you motivated.",
                icon: "📅"
              }
            ].map((feature) => (
              <div key={feature.title} className="card rounded-2xl bg-[var(--surface-1)] text-left hover:transform hover:scale-105 transition-transform">
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3" style={{color: 'var(--primary)'}}>{feature.title}</h3>
                <p className="text-[var(--muted-foreground)] mb-6">{feature.description}</p>
                <Link
                  href="/auth/signup"
                  className="btn btn-secondary text-sm"
                >
                  Explore
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--surface-muted)] py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            © 2025 Kogno. All rights reserved.
          </p>
          <div className="flex justify-center gap-6 text-sm">
            <a href="#" className="text-[var(--secondary)] hover:text-[var(--secondary-hover)] transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-[var(--secondary)] hover:text-[var(--secondary-hover)] transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-[var(--secondary)] hover:text-[var(--secondary-hover)] transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
