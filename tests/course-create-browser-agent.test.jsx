import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: () => null,
  }),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: {
            user: {
              id: 'user-123',
              is_anonymous: false,
              user_metadata: {},
            },
          },
        })
      ),
    },
  },
}));

vi.mock('@/lib/api', () => ({
  authFetch: vi.fn(),
  getAccessToken: vi.fn(),
}));

vi.mock('@/components/ui/OnboardingTooltip', () => ({
  default: ({ children }) => <>{children}</>,
}));

vi.mock('@/components/ui/OnboardingProvider', () => ({
  useOnboarding: () => ({
    userSettings: {},
    updateUserSettings: vi.fn(),
  }),
}));

vi.mock('@/components/tour', () => ({
  useGuidedTour: () => ({
    startTour: vi.fn(),
    isTourActive: false,
    currentTour: null,
    endTour: vi.fn(),
  }),
}));

vi.mock('@/components/browser', async () => {
  const actual = await vi.importActual('@/components/browser');
  return {
    ...actual,
    BrowserViewer: ({ sessionId }) => (
      <div data-testid="browser-viewer">{sessionId}</div>
    ),
  };
});

vi.mock('@/utils/asyncJobs', async () => {
  const actual = await vi.importActual('@/utils/asyncJobs');
  return {
    ...actual,
    resolveAsyncJobResponse: vi.fn(),
  };
});

import { resolveAsyncJobResponse } from '@/utils/asyncJobs';
import { authFetch, getAccessToken } from '@/lib/api';
import CreateCoursePage from '@/app/courses/create/page';

beforeAll(() => {
  global.IntersectionObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  };

  global.ResizeObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  };
});

beforeEach(() => {
  localStorage.setItem('kogno_course_create_ui_mode', 'wizard');
  authFetch.mockClear();
  getAccessToken.mockReset();
  resolveAsyncJobResponse.mockReset();

  getAccessToken.mockResolvedValue('token-abc');
  authFetch.mockImplementation(async (url) => {
    if (url === '/api/admin/status') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ isAdmin: false }),
      };
    }

    if (url === '/api/courses/topics') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          browserSession: {
            sessionId: 'sess-1',
            streamUrl: '/api/browser-stream/sess-1',
          },
        }),
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({}),
    };
  });
});

it('shows the browser viewer and sends browser flags when browser agent is enabled', async () => {
  resolveAsyncJobResponse.mockResolvedValue({
    result: {
      overviewTopics: [
        {
          id: 'overview-1',
          title: 'Intro',
          description: '',
          likelyOnExam: true,
          subtopics: [
            {
              id: 'sub-1',
              title: 'Basics',
              description: '',
              difficulty: 'easy',
              likelyOnExam: true,
              familiarity: 0.5,
            },
          ],
        },
      ],
    },
  });

  const user = userEvent.setup();
  render(<CreateCoursePage />);

  await screen.findByRole('heading', { name: 'Course Details' });

  await user.type(screen.getByPlaceholderText('MIT'), 'MIT');
  await user.type(
    screen.getByPlaceholderText('Introduction to Machine Learning'),
    'ML 101'
  );
  await user.click(
    screen.getByRole('button', { name: /Next: Course Materials/i })
  );

  await screen.findByRole('heading', { name: 'Course Materials' });
  await user.click(screen.getByRole('button', { name: /Next: Generate Topics/i }));

  await screen.findByRole('heading', { name: 'Build Study Topics' });
  const switches = screen.getAllByRole('switch');
  await user.click(switches[1]);

  await user.click(screen.getByRole('button', { name: /Build Topics/i }));

  await waitFor(() => {
    expect(screen.getByTestId('browser-viewer')).toHaveTextContent('sess-1');
  });

  const topicsCall = authFetch.mock.calls.find(
    ([url]) => url === '/api/courses/topics'
  );
  expect(topicsCall).toBeTruthy();
  const [, options] = topicsCall;
  const body = JSON.parse(options.body);
  expect(body.agentSearchEnabled).toBe(true);
  expect(body.browserAgentEnabled).toBe(true);
});
