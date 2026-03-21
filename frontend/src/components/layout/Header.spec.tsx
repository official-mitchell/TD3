/**
 * Header tests. Per Implementation Plan 11.1–11.3 acceptance criteria.
 * Connection badge removed per hamburger menu redesign.
 */
import { vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from './Header';

vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve([]) })));

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve([]) })));
  });

  describe('11.1 Layout', () => {
    it('renders TD3 logo and full title', () => {
      render(<Header />);
      expect(screen.getByTestId('td3-logo')).toBeTruthy();
      expect(screen.getByText(/TACTICAL DRONE DEFENSE DASHBOARD/i)).toBeTruthy();
    });

    it('renders Create Targets button in right zone', () => {
      render(<Header />);
      expect(screen.getByRole('button', { name: /CREATE TARGETS/i })).toBeTruthy();
    });
  });

  describe('11.3 Acceptance criteria', () => {
    it('11.3.1: Header renders across full viewport width', () => {
      const { container } = render(<Header />);
      const header = container.querySelector('header');
      expect(header).toBeTruthy();
      expect(header?.className).toContain('w-full');
    });

    it('11.3.3: Header renders on mobile (drawer toggles moved to DashboardView carets)', () => {
      render(<Header isMobile={true} />);
      expect(screen.getByRole('button', { name: /CREATE TARGETS/i })).toBeTruthy();
    });
  });
});
