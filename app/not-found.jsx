import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)] overflow-hidden flex items-center justify-center">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div 
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full blur-3xl" 
          style={{ background: `radial-gradient(circle, rgba(var(--primary-rgb), var(--grid-glow-opacity)) 0%, transparent 100%)` }}
        />
        <div 
          className="absolute bottom-0 left-1/4 h-[400px] w-[400px] rounded-full blur-3xl"
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
      <nav className="absolute top-0 left-0 right-0 z-10 mx-auto max-w-6xl px-6 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-[var(--primary)] tracking-tight">
            Kogno
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
        {/* 404 Number with gradient */}
        <div className="mb-8">
          <h1 className="text-[120px] sm:text-[180px] font-bold leading-none tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-[var(--primary)] to-[var(--primary)]/30">
            404
          </h1>
        </div>

        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 border border-[var(--primary)]/20">
            <svg className="h-8 w-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
        </div>

        {/* Text */}
        <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-[var(--foreground)]">
          Page not found
        </h2>
        <p className="text-base sm:text-lg text-[var(--muted-foreground)] mb-10 max-w-md mx-auto leading-relaxed">
          Oops! It looks like this page wandered off. The content you're looking for might have been moved or doesn't exist.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/" 
            className="w-full sm:w-auto px-8 py-3.5 text-base font-medium rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 transition-all shadow-lg shadow-[var(--primary)]/25 hover:shadow-xl hover:shadow-[var(--primary)]/30 hover:-translate-y-0.5"
          >
            Go to home
          </Link>
          <Link 
            href="/dashboard" 
            className="w-full sm:w-auto px-8 py-3.5 text-base font-medium rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--surface-1)] transition-all"
          >
            Dashboard
          </Link>
        </div>

        {/* Decorative element */}
        <div className="mt-16 flex justify-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]/40"></span>
          <span className="h-1.5 w-8 rounded-full bg-[var(--primary)]"></span>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]/40"></span>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 py-6 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">
          © {new Date().getFullYear()} Kogno. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
