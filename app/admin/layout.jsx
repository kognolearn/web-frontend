import AdminGuard from "@/components/admin/AdminGuard";
import ThemeToggle from "@/components/theme/ThemeToggle";
import Link from "next/link";

export default function AdminLayout({ children }) {
    return (
        <AdminGuard>
            <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors">
                {/* Background effects */}
                <div className="pointer-events-none fixed inset-0 overflow-hidden">
                    <div 
                        className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full blur-3xl animate-pulse" 
                        style={{ animationDuration: '8s', background: `radial-gradient(circle, rgba(var(--primary-rgb), var(--grid-glow-opacity)) 0%, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.25)) 100%)` }} 
                    />
                    <div 
                        className="absolute top-1/2 -left-40 h-[400px] w-[400px] rounded-full blur-3xl animate-pulse" 
                        style={{ animationDuration: '10s', animationDelay: '2s', background: `radial-gradient(circle, rgba(var(--primary-rgb), calc(var(--grid-glow-opacity) * 0.75)) 0%, transparent 100%)` }} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--background)]/50 to-[var(--background)]" />
                    <div 
                        className="absolute inset-0"
                        style={{ 
                            backgroundImage: `linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)`,
                            backgroundSize: '60px 60px'
                        }}
                    />
                </div>

                <nav className="relative border-b border-[var(--border)] bg-[var(--surface-1)]/80 backdrop-blur-xl px-6 py-4">
                    <div className="mx-auto max-w-7xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/" className="text-2xl font-bold text-[var(--primary)]">
                                Kogno
                            </Link>
                            <span className="badge">Admin</span>
                        </div>
                        <Link href="/dashboard" className="btn btn-ghost btn-sm">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Dashboard
                        </Link>
                    </div>
                </nav>
                <main className="relative mx-auto max-w-7xl p-6">{children}</main>
                <ThemeToggle />
            </div>
        </AdminGuard>
    );
}
