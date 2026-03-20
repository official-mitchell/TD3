/**
 * Drone store — Map<string, IDrone> keyed by droneId.
 * Phase 3.2: Immer middleware, updateDrone, removeDrone, clearDrones, getSortedByDistance.
 * Per Implementation Plan 3.2. enableMapSet() required for Immer Map support.
 * getEngageableTargets: Engagement Ready only, altitude <= 500m, not friendly, sorted by threat descending.
 * dyingDrones: drones just destroyed, shown with skull + float animation for 3s.
 * droneTrails: position history per drone for flight path display (dotted line when selected).
 */
import { enableMapSet } from 'immer';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

enableMapSet();
import type { IDrone } from '@td3/shared-types';
import { calculateDistance } from '../utils/calculations';
import { PLATFORM_CONSTANTS } from '../utils/constants';

const DYING_DRONE_DURATION_MS = 3000;
const MAX_TRAIL_POINTS = 150;

export type TrailPoint = { lat: number; lng: number };

interface DroneState {
  drones: Map<string, IDrone>;
  dyingDrones: Map<string, IDrone>;
  droneTrails: Map<string, TrailPoint[]>;
  updateDrone: (drone: IDrone) => void;
  removeDrone: (droneId: string) => void;
  addDyingDrone: (drone: IDrone) => void;
  removeDyingDrone: (droneId: string) => void;
  clearDrones: () => void;
  getSortedByDistance: (platformLat: number, platformLng: number) => IDrone[];
  getEngageableTargets: (platformLat: number, platformLng: number) => IDrone[];
  getTrail: (droneId: string) => TrailPoint[];
}

const platformPos = (lat: number, lng: number) => ({ lat, lng });

export const useDroneStore = create<DroneState>()(
  devtools(
    immer((set, get) => ({
      drones: new Map(),
      dyingDrones: new Map(),
      droneTrails: new Map(),

      updateDrone: (drone) =>
        set((state) => {
          state.drones.set(drone.droneId, drone);
          const pos = drone.position;
          if (pos && typeof pos.lat === 'number' && typeof pos.lng === 'number') {
            let trail = state.droneTrails.get(drone.droneId);
            if (!trail) {
              trail = [];
              state.droneTrails.set(drone.droneId, trail);
            }
            const last = trail[trail.length - 1];
            if (!last || last.lat !== pos.lat || last.lng !== pos.lng) {
              trail.push({ lat: pos.lat, lng: pos.lng });
              if (trail.length > MAX_TRAIL_POINTS) trail.shift();
            }
          }
        }),

      removeDrone: (droneId) =>
        set((state) => {
          state.drones.delete(droneId);
          state.droneTrails.delete(droneId);
        }),

      addDyingDrone: (drone) =>
        set((state) => {
          state.dyingDrones.set(drone.droneId, drone);
          setTimeout(() => {
            get().removeDyingDrone(drone.droneId);
          }, DYING_DRONE_DURATION_MS);
        }),

      removeDyingDrone: (droneId) =>
        set((state) => {
          state.dyingDrones.delete(droneId);
        }),

      clearDrones: () =>
        set((state) => {
          state.drones.clear();
          state.dyingDrones.clear();
          state.droneTrails.clear();
        }),

      getTrail: (droneId) => get().droneTrails.get(droneId) ?? [],

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
