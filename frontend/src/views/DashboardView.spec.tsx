/**
 * DashboardView tests. Ensures sidebars have overflow-x-hidden and no horizontal scrollbar.
 */
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardView } from './DashboardView';

vi.mock('@components/map/MapContainer', () => ({
  MapContainer: () => <div data-testid="map-container">Map</div>,
}));

vi.mock('@mui/material/useMediaQuery', () => ({
  default: () => false,
}));

describe('DashboardView', () => {
  it('should render without crashing', () => {
    render(<DashboardView />);
    expect(screen.getByTestId('map-container')).toBeTruthy();
  });

  it('sidebars should have overflow-x-hidden to prevent horizontal scrollbar', () => {
    const { container } = render(<DashboardView />);
    const sidebarsWithOverflowHidden = container.querySelectorAll('.overflow-x-hidden');
    expect(sidebarsWithOverflowHidden.length).toBeGreaterThanOrEqual(1);
  });

  it('sidebars should have flex-shrink-0 to prevent shrinking and overflow', () => {
    const { container } = render(<DashboardView />);
    const flexShrinkElements = container.querySelectorAll('.flex-shrink-0');
    expect(flexShrinkElements.length).toBeGreaterThan(0);
  });
});
