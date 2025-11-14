import SignInForm from "@/components/auth/SignInForm";
import { Suspense } from "react";

export const metadata = {
  title: "Sign In | Kogno",
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
            Keep learning with personalized AI study tools.
          </p>
        </div>

        <div className="gradient-border rounded-2xl">
          <div className="card-shell rounded-2xl p-8">
          <Suspense fallback={<SignInFormSkeleton />}>
            <SignInForm />
          </Suspense>
          </div>
        </div>

        <div className="text-center text-xs text-[var(--muted-foreground)] mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
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
