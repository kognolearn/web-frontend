import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-[var(--foreground)] transition-colors relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 rounded-full opacity-20 blur-3xl" 
             style={{background: 'var(--gradient-primary)'}}></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 rounded-full opacity-20 blur-3xl" 
             style={{background: 'var(--gradient-secondary)'}}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl" 
             style={{background: 'var(--gradient-accent)'}}></div>
      </div>

      <div className="w-full max-w-4xl text-center space-y-12 relative z-10">
        <div className="mx-auto max-w-3xl">
          <div className="card rounded-[32px] px-12 py-16 backdrop-blur-sm">
            {/* Logo/Brand with gradient */}
            <div className="mx-auto mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent">
                Kogno
              </h2>
              <div className="mt-2 h-1 w-16 mx-auto rounded-full" style={{background: 'var(--gradient-primary)'}}></div>
            </div>

            {/* Hero headline with better typography */}
            <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-2">
              Study for <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">Everything</span>.
            </h1>
            
            {/* Tagline */}
            <p className="mt-6 text-lg sm:text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto leading-relaxed">
              Build immersive study plans, track your confidence, and let curated topics keep you ahead of every lecture.
            </p>
            
            {/* CTA Buttons with enhanced styling */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/signup"
                className="btn btn-primary text-base px-8 py-3"
              >
                <span className="relative z-10">Create your account</span>
              </Link>
              <Link
                href="/auth/signin"
                className="btn btn-outline text-base px-8 py-3"
              >
                <span className="relative z-10">I already have access</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Feature cards with icons and gradients */}
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { text: "Generate courses in seconds", gradient: "var(--gradient-primary)", icon: "⚡" },
            { text: "Learn anything you desire", gradient: "var(--gradient-secondary)", icon: "🎯" },
            { text: "Stay on track with reminders", gradient: "var(--gradient-accent)", icon: "🔔" }
          ].map((feature, idx) => (
            <div key={feature.text} className="card rounded-[20px] px-6 py-8 text-center group hover:scale-105 transition-transform duration-300"
                 style={{animationDelay: `${idx * 100}ms`}}>
              {/* Icon with gradient background */}
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center text-2xl"
                   style={{background: feature.gradient}}>
                {feature.icon}
              </div>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
