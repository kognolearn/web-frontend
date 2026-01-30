'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import GoogleSignInButton from './GoogleSignInButton';
import { clearOnboardingGateCourseId } from '@/lib/onboarding';

const OTP_FLOW_STORAGE_KEY = 'kogno_otp_flow';
const REFERRAL_STORAGE_KEY = 'kogno_ref';
const REFERRAL_BONUS_SEEDS = 50;

/**
 * BlurredCourseGate - Shows a blurred course preview with sign-up modal
 * The sidebar with module list is visible but not interactable
 * Main content is blurred until user signs up
 */
export default function BlurredCourseGate({
  courseId,
  courseName,
  studyPlan,
  onAuthSuccess
}) {
  const router = useRouter();
  const redirectTo = courseId ? `/courses/${courseId}` : '/dashboard';

  const [authMode, setAuthMode] = useState('signup'); // 'signup' | 'signin'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    referralCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isSignIn = authMode === 'signin';

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user;
        if (user && !user.is_anonymous) {
          clearOnboardingGateCourseId();
          if (typeof onAuthSuccess === 'function') {
            onAuthSuccess();
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [onAuthSuccess]);

  useEffect(() => {
    try {
      const storedRefRaw = localStorage.getItem(REFERRAL_STORAGE_KEY);
      if (!storedRefRaw) return;
      const storedRef = JSON.parse(storedRefRaw);
      if (storedRef?.code) {
        setFormData((prev) => (
          prev.referralCode ? prev : { ...prev, referralCode: storedRef.code }
        ));
      }
    } catch (err) {
      console.error('Failed to read referral code:', err);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    if (error) setError('');
    if (name === 'referralCode') {
      try {
        const trimmed = value.trim();
        if (trimmed) {
          localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify({
            code: trimmed,
            timestamp: Date.now(),
          }));
        } else {
          localStorage.removeItem(REFERRAL_STORAGE_KEY);
        }
      } catch (err) {
        console.error('Failed to store referral code:', err);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (authMode === 'signup') {
      // Validate .edu email for signup
      if (!formData.email.toLowerCase().endsWith('.edu')) {
        setError('Use a student email address (.edu)');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            fullName: formData.name,
            mode: 'signup',
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(payload?.error || 'Unable to send verification code.');
          setLoading(false);
          return;
        }

        try {
          localStorage.setItem(OTP_FLOW_STORAGE_KEY, JSON.stringify({
            email: formData.email,
            verificationType: payload?.verificationType || 'signup',
            timestamp: Date.now(),
          }));
          if (redirectTo) {
            localStorage.setItem('kogno_signup_redirect', JSON.stringify({
              redirectTo,
              timestamp: Date.now(),
            }));
          }
        } catch (err) {
          console.error('Failed to store OTP flow info:', err);
        }

        const confirmUrl = `/auth/confirm-email?email=${encodeURIComponent(formData.email)}&redirectTo=${encodeURIComponent(redirectTo)}`;
        router.push(confirmUrl);
      } catch (err) {
        setError('An unexpected error occurred. Please try again.');
        setLoading(false);
      }
    } else {
      // Sign in mode
      try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (signInError) {
          setError(signInError.message);
          setLoading(false);
          return;
        }

        // Auth state change listener will handle the redirect
      } catch (err) {
        setError('An unexpected error occurred. Please try again.');
        setLoading(false);
      }
    }
  };

  // Get visible modules from study plan
  const modules = studyPlan?.modules || [];

  return (
    <div className="fixed inset-0 z-[200] w-full overflow-hidden bg-[var(--background)]">
      {/* Blurred background course preview */}
      <div className="absolute inset-0 flex pointer-events-none select-none">
        {/* Sidebar preview - visible but not interactable */}
        <div className="w-72 flex-shrink-0 border-r border-white/10 bg-[var(--surface-1)]/90 p-4">
          {/* Course title */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)] truncate">
              {courseName || 'Your Course'}
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              {modules.length} module{modules.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Module list preview */}
          <div className="space-y-2">
            {modules.slice(0, 8).map((module, idx) => (
              <div
                key={module.id || idx}
                className="rounded-xl bg-[var(--surface-2)] p-3 border border-white/5"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[var(--primary)]/20 flex items-center justify-center">
                    <span className="text-xs font-medium text-[var(--primary)]">
                      {idx + 1}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-[var(--foreground)] truncate flex-1">
                    {module.title || `Module ${idx + 1}`}
                  </span>
                </div>
                {module.lessons && module.lessons.length > 0 && (
                  <div className="mt-2 ml-8 space-y-1">
                    {module.lessons.slice(0, 3).map((lesson, lessonIdx) => (
                      <div
                        key={lesson.id || lessonIdx}
                        className="text-xs text-[var(--muted-foreground)] truncate flex items-center gap-1.5"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--muted-foreground)]/30" />
                        {lesson.title || `Lesson ${lessonIdx + 1}`}
                      </div>
                    ))}
                    {module.lessons.length > 3 && (
                      <div className="text-xs text-[var(--muted-foreground)]/60">
                        +{module.lessons.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {modules.length > 8 && (
              <div className="text-center text-xs text-[var(--muted-foreground)]">
                +{modules.length - 8} more modules
              </div>
            )}
          </div>
        </div>

        {/* Main content area - heavily blurred */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 blur-lg opacity-50 bg-[var(--surface-1)]">
            {/* Fake content blocks */}
            <div className="p-8 space-y-6">
              <div className="h-8 bg-[var(--surface-2)] rounded-lg w-2/3" />
              <div className="space-y-3">
                <div className="h-4 bg-[var(--surface-2)] rounded w-full" />
                <div className="h-4 bg-[var(--surface-2)] rounded w-5/6" />
                <div className="h-4 bg-[var(--surface-2)] rounded w-4/5" />
                <div className="h-4 bg-[var(--surface-2)] rounded w-full" />
                <div className="h-4 bg-[var(--surface-2)] rounded w-3/4" />
              </div>
              <div className="h-48 bg-[var(--surface-2)] rounded-xl w-full" />
              <div className="space-y-3">
                <div className="h-4 bg-[var(--surface-2)] rounded w-full" />
                <div className="h-4 bg-[var(--surface-2)] rounded w-2/3" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {/* Auth Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`relative w-full rounded-2xl border border-white/10 bg-[var(--surface-2)] shadow-2xl max-h-[90dvh] overflow-y-auto ${
            isSignIn ? 'max-w-sm p-5 sm:p-6' : 'max-w-md p-6'
          }`}
        >
          {/* Header */}
          <div className={isSignIn ? 'mb-4' : 'mb-6'}>
            <h2 className={`font-semibold text-[var(--foreground)] ${isSignIn ? 'text-lg' : 'text-xl'}`}>
              {authMode === 'signup' ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              {authMode === 'signup'
                ? 'Sign up to save your course and track progress'
                : 'Sign in to continue learning'}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className={isSignIn ? 'space-y-3' : 'space-y-4'}>
            {authMode === 'signup' && (
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-[var(--muted-foreground)]"
                >
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[var(--surface-1)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-transparent transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Your name"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-[var(--muted-foreground)]"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[var(--surface-1)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-transparent transition-all disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={authMode === 'signup' ? 'you@university.edu' : 'you@example.com'}
              />
              {authMode === 'signup' && (
                <p className="mt-1.5 text-xs text-[var(--muted-foreground)]/70">
                  Must be a .edu email address
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-[var(--muted-foreground)]"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                minLength={6}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[var(--surface-1)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-transparent transition-all disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="••••••••"
              />
              {authMode === 'signup' && (
                <p className="mt-1.5 text-xs text-[var(--muted-foreground)]/70">
                  Minimum 6 characters
                </p>
              )}
            </div>

            {authMode === 'signup' && (
              <div>
                <label
                  htmlFor="referralCode"
                  className="mb-2 block text-sm font-medium text-[var(--muted-foreground)]"
                >
                  Referral code (optional)
                </label>
                <input
                  type="text"
                  id="referralCode"
                  name="referralCode"
                  value={formData.referralCode}
                  onChange={handleChange}
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[var(--surface-1)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-transparent transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="ABC123"
                />
                <p className="mt-1.5 text-xs text-[var(--muted-foreground)]/70">
                  Get {REFERRAL_BONUS_SEEDS} seeds if someone referred you. You'll also earn seeds by referring others.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:ring-offset-2 focus:ring-offset-[var(--background)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[var(--primary)]/20"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {authMode === 'signup' ? 'Creating account...' : 'Signing in...'}
                </span>
              ) : (
                authMode === 'signup' ? 'Get started' : 'Sign in'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className={isSignIn ? 'relative my-5' : 'relative my-6'}>
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[var(--surface-2)] text-[var(--muted-foreground)]">
                or
              </span>
            </div>
          </div>

          {/* Google Sign In */}
          <GoogleSignInButton
            mode={authMode}
            redirectTo={redirectTo}
            disabled={loading}
          />

          {authMode === 'signup' && (
            <p className="mt-3 text-xs text-center text-[var(--muted-foreground)]/70">
              Google sign-up requires a .edu email
            </p>
          )}

          {/* Toggle auth mode */}
          <div className={isSignIn ? 'mt-4 text-center' : 'mt-6 text-center'}>
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'signup' ? 'signin' : 'signup');
                setError('');
              }}
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              {authMode === 'signup'
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
