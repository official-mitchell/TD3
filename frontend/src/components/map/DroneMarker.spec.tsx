/**
 * DroneMarker tests. Per Implementation Plan 7.8.3, 7.8.4.
 */
import { vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DroneMarker } from './DroneMarker';
import { useTargetStore } from '../../store/targetStore';
import type { IDrone } from '@td3/shared-types';
import L from 'leaflet';

vi.mock('react-leaflet', () => ({
  Marker: ({
    position,
    eventHandlers,
  }: {
    position: [number, number];
    eventHandlers?: { click?: () => void };
  }) => (
    <div
      data-testid="drone-marker"
      data-lat={String(position[0])}
      data-lng={String(position[1])}
      onClick={eventHandlers?.click}
      role="button"
    />
  ),
}));

vi.mock('leaflet', () => ({
  default: {
    divIcon: vi.fn((opts: { html?: string }) => {
      const html = opts?.html ?? '';
      return { options: opts, html };
    }),
  },
}));

const createDrone = (overrides: Partial<IDrone> = {}): IDrone => ({
  droneId: 'DRONE-001',
  droneType: 'Quadcopter',
  status: 'Detected',
  position: { lat: 37.78, lng: -122.42, altitude: 100 },
  speed: 50,
  heading: 90,
  threatLevel: 0.5,
  lastUpdated: new Date().toISOString(),
  ...overrides,
});

describe('DroneMarker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTargetStore.setState({ selectedDroneId: null });
  });

  it('7.8.3: Detected status uses gray color (#6B7280)', () => {
    const drone = createDrone({ status: 'Detected' });
    render(<DroneMarker drone={drone} isSelected={false} />);
    expect(screen.getByTestId('drone-marker')).toBeTruthy();
    expect(vi.mocked(L.divIcon)).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('#6B7280'),
      })
    );
  });

  it('7.8.3: Identified status uses amber color (#EAB308)', () => {
    const drone = createDrone({ status: 'Identified' });
    render(<DroneMarker drone={drone} isSelected={false} />);
    expect(vi.mocked(L.divIcon)).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('#EAB308'),
      })
    );
  });

  it('7.8.3: Engagement Ready status uses red color (#EF4444)', () => {
    const drone = createDrone({ status: 'Engagement Ready' });
    render(<DroneMarker drone={drone} isSelected={false} />);
    expect(vi.mocked(L.divIcon)).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('#EF4444'),
      })
    );
  });

  it('7.8.4: clicking marker calls targetStore.setSelected with droneId', () => {
    const drone = createDrone({ droneId: 'DRONE-42' });
    render(<DroneMarker drone={drone} isSelected={false} />);
    fireEvent.click(screen.getByTestId('drone-marker'));
    expect(useTargetStore.getState().selectedDroneId).toBe('DRONE-42');
  });
});
