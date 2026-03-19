/**
 * Drone store — Map<string, IDrone> keyed by droneId.
 * Phase 3.2: Immer middleware, updateDrone, removeDrone, clearDrones, getSortedByDistance.
 * Per Implementation Plan 3.2. enableMapSet() required for Immer Map support.
 * getEngageableTargets: Engagement Ready only, altitude <= 500m, not friendly, sorted by threat descending.
 */
import { enableMapSet } from 'immer';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

enableMapSet();
import type { IDrone } from '@td3/shared-types';
import { calculateDistance } from '../utils/calculations';
import { PLATFORM_CONSTANTS } from '../utils/constants';

interface DroneState {
  drones: Map<string, IDrone>;
  updateDrone: (drone: IDrone) => void;
  removeDrone: (droneId: string) => void;
  clearDrones: () => void;
  getSortedByDistance: (platformLat: number, platformLng: number) => IDrone[];
  getEngageableTargets: (platformLat: number, platformLng: number) => IDrone[];
}

const platformPos = (lat: number, lng: number) => ({ lat, lng });

export const useDroneStore = create<DroneState>()(
  devtools(
    immer((set, get) => ({
      drones: new Map(),

      updateDrone: (drone) =>
        set((state) => {
          state.drones.set(drone.droneId, drone);
        }),

      removeDrone: (droneId) =>
        set((state) => {
          state.drones.delete(droneId);
        }),

      clearDrones: () =>
        set((state) => {
          state.drones.clear();
        }),

      getSortedByDistance: (platformLat, platformLng) => {
        const { drones } = get();
        const pos = platformPos(platformLat, platformLng);
        return Array.from(drones.values())
          .filter(
            (d) =>
              d.status === 'Confirmed' || d.status === 'Engagement Ready'
          )
          .sort(
            (a, b) =>
              calculateDistance(pos, a.position) -
              calculateDistance(pos, b.position)
          );
      },

      getEngageableTargets: (platformLat, platformLng) => {
        const { drones } = get();
        return Array.from(drones.values())
          .filter((d) => {
            if (d.status !== 'Engagement Ready') return false;
            if (d.position.altitude > PLATFORM_CONSTANTS.MAX_ENGAGEMENT_ALTITUDE_M) return false;
            const friendly = 'isFriendly' in d && (d as IDrone & { isFriendly?: boolean }).isFriendly;
            if (friendly) return false;
            return true;
          })
          .sort((a, b) => (b.threatLevel ?? 0) - (a.threatLevel ?? 0));
      },
    })),
    { name: 'Drone Store' }
  )
);
