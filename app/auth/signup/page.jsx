import SignUpForm from "@/components/auth/SignUpForm";
import Link from "next/link";

export const metadata = {
  title: "Sign Up | Ed Platform",
  description: "Create your account to get started",
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Create Account
          </h1>
          <p className="text-gray-600 text-sm">
            Join us to get started
          </p>
        </div>

        {/* Sign Up Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <SignUpForm />

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/auth/signin"
                className="text-gray-900 font-medium hover:text-primary-hover transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-center text-xs text-gray-500 mt-6">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
