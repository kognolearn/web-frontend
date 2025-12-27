import AdminGuard from "@/components/admin/AdminGuard";
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
                        <div className="flex items-center gap-2">
                            <Link href="/admin/testing" className="btn btn-ghost btn-sm">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3v2.25m4.5-2.25v2.25M6 7.5h12m-9 4.5h6m-6 4.5h3m-6-9v10.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 18V7.5" />
                                </svg>
                                Testing
                            </Link>
                            <Link href="/dashboard" className="btn btn-ghost btn-sm">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to Dashboard
                            </Link>
                        </div>
                    </div>
                </nav>
                <main className="relative mx-auto max-w-7xl p-6">{children}</main>
            </div>
        </AdminGuard>
    );
}
