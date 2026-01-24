'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SimplifiedOnboardingChat from '@/components/onboarding/SimplifiedOnboardingChat';

const REFERRAL_STORAGE_KEY = 'kogno_ref';

export default function HomeContent({ variant = 'page' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');
  const authError = searchParams.get('authError');
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (!refCode) return;
    try {
      localStorage.setItem(
        REFERRAL_STORAGE_KEY,
        JSON.stringify({ code: refCode, timestamp: Date.now() })
      );
    } catch (err) {
      console.error('Failed to store referral code:', err);
    }
  }, [refCode]);

  useEffect(() => {
    if (authError !== 'account-not-found') return;
    setToastMessage('Account does not exist');

    const params = new URLSearchParams(searchParams.toString());
    params.delete('authError');
    const nextUrl = params.toString() ? `/?${params.toString()}` : '/';
    router.replace(nextUrl, { scroll: false });

    const timer = setTimeout(() => setToastMessage(''), 4000);
    return () => clearTimeout(timer);
  }, [authError, router, searchParams]);

  return (
    <>
      <SimplifiedOnboardingChat variant={variant} />
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {toastMessage}
            <button
              onClick={() => setToastMessage('')}
              className="ml-2 hover:text-white/80"
              type="button"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
