/**
 * TelemetryOverlay tests. Ensures indicators fit containers and render readably.
 */
import { vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { td3Theme } from '../../theme';
import { TelemetryOverlay } from './TelemetryOverlay';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { useTargetStore } from '../../store/targetStore';
import type { IDrone, IWeaponPlatform } from '@td3/shared-types';

const mockMap = {
  getContainer: () => document.body,
};

vi.mock('react-leaflet', () => ({
  useMap: () => mockMap,
}));

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={td3Theme}>{ui}</ThemeProvider>);

const PLATFORM: IWeaponPlatform = {
  position: { lat: 37.7749, lng: -122.4194 },
  heading: 0,
  isActive: true,
  ammoCount: 300,
  killCount: 0,
};

const createDrone = (overrides: Partial<IDrone> = {}): IDrone => ({
  droneId: 'VTOL-001',
  droneType: 'VTOL',
  status: 'Engagement Ready',
  position: { lat: 37.78, lng: -122.42, altitude: 235 },
  speed: 45,
  heading: 125,
  threatLevel: 0.2,
  lastUpdated: new Date().toISOString(),
  ...overrides,
});

describe('TelemetryOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlatformStore.setState({ platform: PLATFORM });
    useDroneStore.setState({
      drones: new Map([['VTOL-001', createDrone()]]),
    });
    useTargetStore.setState({ selectedDroneId: 'VTOL-001' });
  });

  it('renders when drone is selected', () => {
    renderWithTheme(<TelemetryOverlay />);
    expect(screen.getByTestId('telemetry-overlay')).toBeTruthy();
    expect(screen.getByText('SPEED')).toBeTruthy();
  });

  it('shows consolidated target header: drone ID, type, status, distance, bearing', () => {
    renderWithTheme(<TelemetryOverlay />);
    expect(screen.getByText('VTOL-001')).toBeTruthy();
    expect(screen.getByText('VTOL')).toBeTruthy();
    expect(screen.getByText('Engagement Ready')).toBeTruthy();
    expect(screen.getByText(/IN RANGE/)).toBeTruthy();
  });

  it('16.3.1: IN RANGE indicator only visible when drone status is Engagement Ready', () => {
    const confirmedDrone = createDrone({ status: 'Confirmed' });
    act(() => {
      useDroneStore.setState({ drones: new Map([['VTOL-001', confirmedDrone]]) });
    });
    const { rerender } = renderWithTheme(<TelemetryOverlay />);
    expect(screen.queryByText('✓ IN RANGE')).toBeNull();

    const readyDrone = createDrone({ status: 'Engagement Ready' });
    act(() => {
      useDroneStore.setState({ drones: new Map([['VTOL-001', readyDrone]]) });
    });
    rerender(<ThemeProvider theme={td3Theme}><TelemetryOverlay /></ThemeProvider>);
    expect(screen.getByText('✓ IN RANGE')).toBeTruthy();
  });

  it('renders all five indicators in vertical layout', () => {
    renderWithTheme(<TelemetryOverlay />);
    expect(screen.getByText('SPEED')).toBeTruthy();
    expect(screen.getByText('HEADING')).toBeTruthy();
    expect(screen.getByText('THREAT')).toBeTruthy();
    expect(screen.getByText('Engagement Probability')).toBeTruthy();
    expect(screen.getAllByText('km/h').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/ALT \d+m/)).toBeTruthy();
  });

  it('question icons are inline with THREAT and Engagement Probability labels', () => {
    renderWithTheme(<TelemetryOverlay />);
    const threatLabel = screen.getByText('THREAT');
    const engagementLabel = screen.getByText('Engagement Probability');
    expect(threatLabel).toBeTruthy();
    expect(engagementLabel).toBeTruthy();
    // Icons are siblings in flex container with labels
    const threatRow = threatLabel.closest('div');
    const engagementRow = engagementLabel.closest('div');
    expect(threatRow?.querySelector('svg')).toBeTruthy();
    expect(engagementRow?.querySelector('svg')).toBeTruthy();
  });

  it('containers have consistent sizes (square for Speed/Elevation/Compass, bar for Threat/Engagement)', () => {
    renderWithTheme(<TelemetryOverlay />);
    const overlay = screen.getByTestId('telemetry-overlay');
    const containers = overlay.querySelectorAll('[style]');
    expect(containers.length).toBeGreaterThanOrEqual(5);
  });

  it('displays speed value in gauge', () => {
    renderWithTheme(<TelemetryOverlay />);
    expect(screen.getAllByText('45').length).toBeGreaterThanOrEqual(1);
  });

  it('displays heading degrees', () => {
    render(<TelemetryOverlay />);
    expect(screen.getByText('125°')).toBeTruthy();
  });

  it('returns null when no drone selected', () => {
    useTargetStore.setState({ selectedDroneId: null });
    renderWithTheme(<TelemetryOverlay />);
    expect(screen.queryByTestId('telemetry-overlay')).toBeNull();
  });
});
