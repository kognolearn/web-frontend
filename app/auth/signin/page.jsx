import SignInForm from "@/components/auth/SignInForm";
import { Suspense } from "react";

export const metadata = {
  title: "Sign In | Ed Platform",
  description: "Access your courses and continue learning",
};

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4 text-[var(--foreground)] transition-colors relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 rounded-full opacity-15 blur-3xl" 
             style={{background: 'var(--gradient-secondary)'}}></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 rounded-full opacity-15 blur-3xl" 
             style={{background: 'var(--gradient-accent)'}}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3">
            <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent">
              Welcome Back
            </span>
          </h1>
          <p className="text-[var(--muted-foreground)] text-base">
            Keep learning with personalized AI study tools.
          </p>
        </div>

        <div className="card rounded-2xl p-8">
        <Suspense fallback={<SignInFormSkeleton />}>
          <SignInForm />
        </Suspense>
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
