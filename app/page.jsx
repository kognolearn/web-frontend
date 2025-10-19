import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--foreground)] px-4 transition-colors">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-[var(--foreground)] mb-4">
          Welcome to Ed Platform
        </h1>
        <p className="text-[var(--muted-foreground)] mb-8">
          Get started by signing up for an account
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/signup"
            className="bg-primary hover:bg-primary-hover text-gray-900 font-medium py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Sign Up
          </Link>
          <Link
            href="/auth/signin"
            className="bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--foreground)] font-medium py-3 px-6 rounded-lg border border-[var(--border-muted)] transition-colors duration-200"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
