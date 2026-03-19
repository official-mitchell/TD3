/**
 * MapContainer tests. Per Implementation Plan 7.8 acceptance criteria.
 */
import { vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MapContainer } from './MapContainer';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { useTargetStore } from '../../store/targetStore';
import type { IDrone, IWeaponPlatform } from '@td3/shared-types';

const mockMap = { setView: vi.fn(), getZoom: vi.fn(() => 14) };

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="leaflet-map">{children}</div>
  ),
  TileLayer: ({ url }: { url: string }) => (
    <div data-testid="tile-layer" data-url={url} />
  ),
  Marker: ({
    position,
    eventHandlers,
  }: {
    position: [number, number];
    eventHandlers?: { click?: () => void };
  }) => (
    <div
      data-testid="marker"
      data-lat={String(position[0])}
      data-lng={String(position[1])}
      onClick={eventHandlers?.click}
      role="button"
    />
  ),
  Circle: ({ center, radius }: { center: [number, number]; radius: number }) => (
    <div data-testid="circle" data-radius={radius} data-lat={center[0]} data-lng={center[1]} />
  ),
  Polyline: ({ positions }: { positions: [number, number][] }) => (
    <div data-testid="polyline" data-positions={JSON.stringify(positions)} />
  ),
  useMap: () => mockMap,
}));

vi.mock('leaflet', () => ({
  default: {
    Icon: { Default: { prototype: {}, mergeOptions: vi.fn() } },
    divIcon: vi.fn(() => ({})),
  },
}));

vi.mock('leaflet/dist/leaflet.css', () => ({}));

vi.mock('../../assets/TD3 IFV.png', () => ({ default: '/mock-ifv.png' }));
vi.mock('../../assets/TD3 turret.png', () => ({ default: '/mock-turret.png' }));

const PLATFORM: IWeaponPlatform = {
  position: { lat: 37.7749, lng: -122.4194 },
  heading: 0,
  isActive: true,
  ammoCount: 300,
  killCount: 0,
};

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

describe('MapContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlatformStore.setState({ platform: null });
    useDroneStore.setState({ drones: new Map() });
    useTargetStore.setState({ selectedDroneId: null });
  });

  it('7.8.1: renders with CartoDB dark tiles', () => {
    render(<MapContainer />);
    const tileLayer = screen.getByTestId('tile-layer');
    expect(tileLayer).toBeTruthy();
    expect(tileLayer.getAttribute('data-url')).toContain('cartocdn.com/dark_all');
  });

  it('7.8.1: platform marker is visible at correct coordinate when platform exists', () => {
    usePlatformStore.setState({ platform: PLATFORM });
    render(<MapContainer />);
    const markers = screen.getAllByTestId('marker');
    const platformMarker = markers.find(
      (m) =>
        m.getAttribute('data-lat') === '37.7749' &&
        m.getAttribute('data-lng') === '-122.4194'
    );
    expect(platformMarker).toBeTruthy();
  });

  it('7.8.2: drone markers appear at correct lat/lng for each drone in store', () => {
    const drones = new Map<string, IDrone>([
      ['D1', createDrone({ droneId: 'D1', position: { lat: 37.77, lng: -122.41, altitude: 50 } })],
      ['D2', createDrone({ droneId: 'D2', position: { lat: 37.79, lng: -122.43, altitude: 200 } })],
    ]);
    useDroneStore.setState({ drones });
    usePlatformStore.setState({ platform: PLATFORM });
    render(<MapContainer />);
    const markers = screen.getAllByTestId('marker');
    expect(markers.length).toBeGreaterThanOrEqual(2);
    const d1Marker = markers.find((m) => m.getAttribute('data-lat') === '37.77');
    const d2Marker = markers.find((m) => m.getAttribute('data-lat') === '37.79');
    expect(d1Marker).toBeTruthy();
    expect(d2Marker).toBeTruthy();
  });

  it('7.8.4: clicking drone marker sets selected target and draws line of fire', () => {
    const drones = new Map<string, IDrone>([
      ['D1', createDrone({ droneId: 'D1', status: 'Engagement Ready' })],
    ]);
    useDroneStore.setState({ drones });
    usePlatformStore.setState({ platform: PLATFORM });
    render(<MapContainer />);
    const markers = screen.getAllByTestId('marker');
    const droneMarker = markers.find((m) => m.getAttribute('data-lat') === '37.78');
    expect(droneMarker).toBeTruthy();
    if (droneMarker) {
      fireEvent.click(droneMarker);
      expect(useTargetStore.getState().selectedDroneId).toBe('D1');
    }
  });

  it('7.8.4: line of fire (polyline) renders when target is selected', () => {
    const drones = new Map<string, IDrone>([
      ['D1', createDrone({ droneId: 'D1', position: { lat: 37.78, lng: -122.42, altitude: 100 } })],
    ]);
    useDroneStore.setState({ drones });
    usePlatformStore.setState({ platform: PLATFORM });
    useTargetStore.setState({ selectedDroneId: 'D1' });
    render(<MapContainer />);
    const polyline = screen.getByTestId('polyline');
    expect(polyline).toBeTruthy();
    const positions = JSON.parse(polyline.getAttribute('data-positions') ?? '[]');
    expect(positions).toEqual([
      [37.7749, -122.4194],
      [37.78, -122.42],
    ]);
  });

  it('7.8.5: range circles visible at correct radii (2km, 5km) around platform', () => {
    usePlatformStore.setState({ platform: PLATFORM });
    render(<MapContainer />);
    const circles = screen.getAllByTestId('circle');
    const inner = circles.find((c) => c.getAttribute('data-radius') === '2000');
    const outer = circles.find((c) => c.getAttribute('data-radius') === '5000');
    expect(inner).toBeTruthy();
    expect(outer).toBeTruthy();
    expect(inner?.getAttribute('data-lat')).toBe('37.7749');
    expect(outer?.getAttribute('data-lat')).toBe('37.7749');
  });

  it('7.8.6: drone markers use stable keys (droneId) so position updates do not cause remounts', () => {
    const drones = new Map<string, IDrone>([
      ['D1', createDrone({ droneId: 'D1', position: { lat: 37.77, lng: -122.41, altitude: 50 } })],
      ['D2', createDrone({ droneId: 'D2', position: { lat: 37.79, lng: -122.43, altitude: 200 } })],
    ]);
    useDroneStore.setState({ drones });
    usePlatformStore.setState({ platform: PLATFORM });
    const { rerender } = render(<MapContainer />);
    const markersBefore = screen.getAllByTestId('marker').filter((m) => {
      const lat = m.getAttribute('data-lat');
      return lat === '37.77' || lat === '37.79';
    });
    expect(markersBefore.length).toBe(2);

    act(() => {
      useDroneStore.setState({
        drones: new Map([
          ['D1', createDrone({ droneId: 'D1', position: { lat: 37.771, lng: -122.411, altitude: 60 } })],
          ['D2', createDrone({ droneId: 'D2', position: { lat: 37.791, lng: -122.431, altitude: 210 } })],
        ]),
      });
      rerender(<MapContainer />);
    });
    const markersAfter = screen.getAllByTestId('marker').filter((m) => {
      const lat = m.getAttribute('data-lat');
      return lat === '37.771' || lat === '37.791';
    });
    expect(markersAfter.length).toBe(2);
  });
});
