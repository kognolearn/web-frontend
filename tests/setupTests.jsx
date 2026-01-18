import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
