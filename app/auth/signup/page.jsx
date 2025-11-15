import SignUpForm from "@/components/auth/SignUpForm";
import Link from "next/link";

export const metadata = {
  title: "Sign Up | Ed Platform",
  description: "Create your account to get started",
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4 text-[var(--foreground)] transition-colors relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 rounded-full opacity-15 blur-3xl" 
             style={{background: 'var(--gradient-primary)'}}></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 rounded-full opacity-15 blur-3xl" 
             style={{background: 'var(--gradient-accent)'}}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3">
            <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
              Create Account
            </span>
          </h1>
          <p className="text-[var(--muted-foreground)] text-base">
            Join thousands of students using AI for smarter studying.
          </p>
        </div>

        <div className="mb-8 card rounded-2xl p-4 text-center text-sm italic text-[var(--muted-foreground)]">
          "EdTech Planner helped me ace my finals with less stress!"<br />
          <span className="not-italic font-semibold text-[var(--foreground)]">- Alex, University sophomore</span>
        </div>

        {/* Sign Up Form */}
        <div className="card rounded-2xl p-8">
          <SignUpForm />

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              Already have an account?{" "}
              <Link
                href="/auth/signin"
                className="font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-center text-xs text-[var(--muted-foreground)] mt-6">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
