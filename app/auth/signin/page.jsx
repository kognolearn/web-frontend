import SignInForm from "@/components/auth/SignInForm";
import Link from "next/link";
import { Suspense } from "react";

export const metadata = {
  title: "Sign In | Ed Platform",
  description: "Access your courses and continue learning",
};

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4 text-[var(--foreground)] transition-colors">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-[var(--foreground)] mb-2">
            Welcome Back
          </h1>
          <p className="text-[var(--muted-foreground)] text-sm">
            Sign in to access your dashboard
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-1)] p-8 shadow-sm">
          <Suspense fallback={<SignInFormSkeleton />}>
            <SignInForm />
          </Suspense>
        </div>

        <div className="text-center text-xs text-[var(--muted-foreground)] mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

function SignInFormSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-10 rounded-lg bg-[var(--surface-2)]"></div>
      <div className="h-10 rounded-lg bg-[var(--surface-2)]"></div>
      <div className="h-12 rounded-lg bg-[var(--surface-muted)] mt-6"></div>
    </div>
  );
}
