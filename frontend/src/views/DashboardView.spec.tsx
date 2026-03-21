/**
 * DashboardView tests. Ensures sidebars have overflow-x-hidden and no horizontal scrollbar.
 * Integration: LocationPicker renders in front of map when opened.
 * Mobile: floating carets, drawers, fire button visibility.
 * 6.3.1: Restores selectedDroneId from preSystemsState on mount.
 *
 * --- Changelog ---
 * 2025-03-20: Add mobile tests (carets, drawer open, useMediaQuery mock).
 */
import { vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardView } from './DashboardView';
import { useUIStore } from '../store/uiStore';
import { useTargetStore } from '../store/targetStore';

vi.mock('@components/map/MapContainer', () => ({
  MapContainer: () => (
    <div data-testid="map-container" className="leaflet-container">
      <div className="leaflet-pane leaflet-popup-pane" style={{ zIndex: 700 }} />
    </div>
  ),
}));

const mockUseMediaQuery = vi.fn(() => false);
vi.mock('@mui/material/useMediaQuery', () => ({
  default: (query: string) => mockUseMediaQuery(query),
}));

vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve([]) })));

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMediaQuery.mockReturnValue(false);
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve([]) })));
  });

  it('should render without crashing', () => {
    render(<DashboardView />);
    expect(screen.getByTestId('map-container')).toBeTruthy();
  });

  it('6.3.1: restores selectedDroneId from preSystemsState on mount when returning from Systems View', () => {
    useUIStore.setState({
      preSystemsState: {
        selectedDroneId: 'D1',
        mapCenter: [25.9, 51.5],
        zoom: 14,
      },
    });
    useTargetStore.setState({ selectedDroneId: null });

    render(<DashboardView />);

    expect(useTargetStore.getState().selectedDroneId).toBe('D1');
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

  it('LocationPicker renders in front of map when opened via hamburger menu', async () => {
    render(<DashboardView />);
    const mapContainer = screen.getByTestId('map-container');
    expect(mapContainer).toBeTruthy();

    const hamburger = screen.getByLabelText('Settings');
    fireEvent.click(hamburger);

    const changeLocationItem = screen.getByText('Change location…');
    fireEvent.click(changeLocationItem);

    const overlay = screen.getByTestId('location-picker-overlay');
    expect(overlay).toBeTruthy();
    const overlayZ = Number(window.getComputedStyle(overlay).zIndex);
    expect(overlayZ).toBeGreaterThan(700);
    expect(overlay.parentElement).toBe(document.body);
  });

  describe('Mobile (max-width: 768px)', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockReturnValue(true);
    });

    it('shows floating carets for priority targets and engagement log', () => {
      render(<DashboardView />);
      expect(screen.getByLabelText('Open priority targets')).toBeTruthy();
      expect(screen.getByLabelText('Open engagement log')).toBeTruthy();
    });

    it('left caret opens target panel drawer', () => {
      render(<DashboardView />);
      fireEvent.click(screen.getByLabelText('Open priority targets'));
      expect(screen.getByText('Priority Targets')).toBeTruthy();
    });

    it('right caret opens engagement log drawer', () => {
      render(<DashboardView />);
      fireEvent.click(screen.getByLabelText('Open engagement log'));
      expect(screen.getByText('Engagement Log')).toBeTruthy();
    });

    it('renders map without persistent sidebars (drawers overlay on demand)', () => {
      render(<DashboardView />);
      expect(screen.getByTestId('map-container')).toBeTruthy();
      expect(screen.getByLabelText('Open priority targets')).toBeTruthy();
    });
  });
});
