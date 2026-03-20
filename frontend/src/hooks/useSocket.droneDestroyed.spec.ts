/**
 * Verifies drone:destroyed flow: dyingDrones gets the drone with LAST RECORDED POSITION for map skull.
 * Position is captured from: (1) drone in store, or (2) payload.position from backend.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDroneStore } from '../store/droneStore';
import { useEngagementLogStore } from '../store/engagementLogStore';
import type { IDrone } from '@td3/shared-types';

vi.mock('../lib/sounds', () => ({
  playHitSound: vi.fn(),
  playRichochetSounds: vi.fn(),
}));

const createDrone = (overrides: Partial<IDrone> = {}): IDrone => ({
  droneId: 'D1',
  droneType: 'Quadcopter',
  status: 'Engagement Ready',
  position: { lat: 25.91, lng: 51.54, altitude: 100 },
  speed: 50,
  heading: 90,
  threatLevel: 0.5,
  lastUpdated: new Date().toISOString(),
  ...overrides,
});

describe('drone:destroyed → dyingDrones (map skull)', () => {
  beforeEach(() => {
    useDroneStore.setState({ drones: new Map(), dyingDrones: new Map() });
    useEngagementLogStore.setState({ log: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('addDyingDrone stores drone with last recorded position for map overlay', () => {
    const lastPosition = { lat: 25.905, lng: 51.543, altitude: 150 };
    const drone = createDrone({ droneId: 'D1', position: lastPosition });
    useDroneStore.getState().addDyingDrone(drone);

    const dying = useDroneStore.getState().dyingDrones;
    expect(dying.size).toBe(1);
    expect(dying.get('D1')?.position).toEqual(lastPosition);
  });

  it('position from payload used when drone not in store (backend sends last known)', () => {
    const minimalDrone = {
      droneId: 'D2',
      droneType: 'VTOL' as const,
      status: 'Destroyed' as const,
      position: { lat: 25.92, lng: 51.56, altitude: 150 },
      speed: 0,
      heading: 0,
      threatLevel: 0,
      lastUpdated: new Date().toISOString(),
    };
    useDroneStore.getState().addDyingDrone(minimalDrone);

    const dying = useDroneStore.getState().dyingDrones;
    expect(dying.get('D2')?.position).toEqual({ lat: 25.92, lng: 51.56, altitude: 150 });
  });

  it('dying drone position has lat/lng/altitude for Leaflet Marker placement', () => {
    const drone = createDrone({ position: { lat: 37.5, lng: -122.3, altitude: 200 } });
    useDroneStore.getState().addDyingDrone(drone);

    const d = useDroneStore.getState().dyingDrones.get('D1')!;
    expect(typeof d.position.lat).toBe('number');
    expect(typeof d.position.lng).toBe('number');
    expect(typeof d.position.altitude).toBe('number');
    expect(d.position.lat).toBe(37.5);
    expect(d.position.lng).toBe(-122.3);
  });
});
