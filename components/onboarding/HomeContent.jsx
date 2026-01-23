'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import SimplifiedOnboardingChat from '@/components/onboarding/SimplifiedOnboardingChat';

const REFERRAL_STORAGE_KEY = 'kogno_ref';

export default function HomeContent({ variant = 'page' }) {
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');

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

  return <SimplifiedOnboardingChat variant={variant} />;
}
