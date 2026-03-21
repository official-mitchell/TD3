/**
 * Drone store tests. Per Implementation Plan 16.2.2.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useDroneStore } from './droneStore';
import type { IDrone } from '@td3/shared-types';

const createDrone = (overrides: Partial<IDrone> = {}): IDrone => ({
  droneId: 'D1',
  droneType: 'Quadcopter',
  status: 'Detected',
  position: { lat: 25.9, lng: 51.5, altitude: 100 },
  speed: 50,
  heading: 90,
  threatLevel: 0.5,
  lastUpdated: new Date().toISOString(),
  ...overrides,
});

describe('droneStore', () => {
  beforeEach(() => {
    useDroneStore.setState({ drones: new Map(), dyingDrones: new Map(), droneTrails: new Map() });
  });

  it('updateDrone adds a new drone', () => {
    const drone = createDrone({ droneId: 'D1' });
    useDroneStore.getState().updateDrone(drone);
    expect(useDroneStore.getState().drones.get('D1')).toEqual(drone);
  });

  it('updating an existing drone replaces it without creating duplicates', () => {
    const drone1 = createDrone({ droneId: 'D1', status: 'Detected' });
    const drone2 = createDrone({ droneId: 'D1', status: 'Engagement Ready' });
    useDroneStore.getState().updateDrone(drone1);
    useDroneStore.getState().updateDrone(drone2);
    const drones = useDroneStore.getState().drones;
    expect(drones.size).toBe(1);
    expect(drones.get('D1')?.status).toBe('Engagement Ready');
  });

  it('removeDrone removes the correct drone', () => {
    useDroneStore.getState().updateDrone(createDrone({ droneId: 'D1' }));
    useDroneStore.getState().updateDrone(createDrone({ droneId: 'D2' }));
    useDroneStore.getState().removeDrone('D1');
    expect(useDroneStore.getState().drones.has('D1')).toBe(false);
    expect(useDroneStore.getState().drones.has('D2')).toBe(true);
  });

  it('getSortedByDistance returns only Confirmed and Engagement Ready drones, sorted by ascending distance', () => {
    const platformLat = 25.905;
    const platformLng = 51.543;
    useDroneStore.getState().updateDrone(
      createDrone({
        droneId: 'D1',
        status: 'Engagement Ready',
        position: { lat: 25.91, lng: 51.543, altitude: 100 },
      })
    );
    useDroneStore.getState().updateDrone(
      createDrone({
        droneId: 'D2',
        status: 'Confirmed',
        position: { lat: 25.92, lng: 51.543, altitude: 100 },
      })
    );
    useDroneStore.getState().updateDrone(
      createDrone({
        droneId: 'D3',
        status: 'Detected',
        position: { lat: 25.93, lng: 51.543, altitude: 100 },
      })
    );
    const sorted = useDroneStore.getState().getSortedByDistance(platformLat, platformLng);
    expect(sorted.length).toBe(2);
    expect(sorted.map((d) => d.droneId)).toEqual(['D1', 'D2']);
    expect(sorted[0].droneId).toBe('D1');
  });
});
