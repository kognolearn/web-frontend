import SignUpForm from "@/components/auth/SignUpForm";
import Link from "next/link";

export const metadata = {
  title: "Sign Up | Kogno",
  description: "Create your account to get started",
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4 text-[var(--foreground)] transition-colors">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-[var(--foreground)] mb-2">
            Create Account
          </h1>
          <p className="text-[var(--muted-foreground)] text-sm">
            Join thousands of students using AI for smarter studying.
          </p>
        </div>

        <div className="mb-8 text-center text-sm italic text-[var(--muted-foreground)]">
          "Kogno helped me ace my finals with less stress!"<br />
          <span className="not-italic">- Alex, University sophomore</span>
        </div>

        {/* Sign Up Form */}
        <div className="gradient-border rounded-2xl">
          <div className="card-shell rounded-2xl p-8">
            <SignUpForm />

            {/* Sign In Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">
                Already have an account?{" "}
                <Link
                  href="/auth/signin"
                  className="font-medium text-[var(--foreground)] hover:text-primary transition-colors"
                >
                  Sign In
                </Link>
              </p>
            </div>
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
