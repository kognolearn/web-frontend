import React from 'react';
import { render, screen } from '@testing-library/react';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import SubscriptionBadge from '@/components/ui/SubscriptionBadge';

it('renders UpgradePrompt with free tier messaging', () => {
  render(<UpgradePrompt resourceType="courses" current={1} limit={1} />);
  expect(screen.getByText('Continue Pricing Negotiation')).toBeInTheDocument();
  const link = screen.getByRole('link', { name: /Resume Pricing Chat/i });
  expect(link).toBeInTheDocument();
  expect(link.getAttribute('href')).toBe('/?continueNegotiation=1');
});

it('renders SubscriptionBadge for paid plan', () => {
  render(<SubscriptionBadge planLevel="paid" showLink={false} />);
  expect(screen.getByText('Pro')).toBeInTheDocument();
});

it('renders SubscriptionBadge for free plan', () => {
  render(<SubscriptionBadge planLevel="free" showLink={false} />);
  expect(screen.getByText('Free')).toBeInTheDocument();
});
