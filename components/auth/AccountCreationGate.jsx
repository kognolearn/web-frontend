'use client';

import { useRouter } from 'next/navigation';
import SignUpForm from '@/components/auth/SignUpForm';

export default function AccountCreationGate({ courseId }) {
  const router = useRouter();
  const redirectTo = courseId ? `/courses/${courseId}` : '/dashboard';

  const handleSignIn = () => {
    router.push(`/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[var(--surface-2)] px-6 py-6 shadow-2xl">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-[var(--foreground)]">
            Create your account to save this course
          </h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Your first module is ready. Sign up to keep progress and access the full course.
          </p>
        </div>

        <div className="mt-5">
          <SignUpForm variant="embedded" redirectTo={redirectTo} />
          <button
            type="button"
            onClick={handleSignIn}
            className="mt-4 w-full text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            Already have an account? Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
