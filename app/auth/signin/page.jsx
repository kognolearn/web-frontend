import SignInForm from "@/components/auth/SignInForm";
import Link from "next/link";
import { Suspense } from "react";

export const metadata = {
  title: "Sign In | EdTech Platform",
  description: "Access your courses and continue learning",
};

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600 text-sm">
            Sign in to access your dashboard
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <Suspense fallback={<SignInFormSkeleton />}>
            <SignInForm />
          </Suspense>
        </div>

        <div className="text-center text-xs text-gray-500 mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
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
      <div className="h-10 bg-gray-200 rounded-lg"></div>
      <div className="h-10 bg-gray-200 rounded-lg"></div>
      <div className="h-12 bg-gray-300 rounded-lg mt-6"></div>
    </div>
  );
}
