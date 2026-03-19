import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { IDrone, IEngagementRecord } from '@td3/shared-types';

interface DroneState {
  drones: Map<string, IDrone>;
  selectedTargets: Set<string>;
  killLog: IEngagementRecord[];
  actions: {
    addDrone: (drone: IDrone) => void;
    updateDrone: (drone: IDrone) => void;
    selectTarget: (droneId: string) => void;
    addKill: (kill: IEngagementRecord) => void;
    clearSelected: () => void;
  };
}

export const useDroneStore = create<DroneState>()(
  devtools(
    (set) => ({
      drones: new Map(),
      selectedTargets: new Set(),
      killLog: [],
      actions: {
        addDrone: (drone) =>
          set((state) => ({
            drones: new Map(state.drones).set(drone.droneId, drone),
          })),
        updateDrone: (drone) =>
          set((state) => ({
            drones: new Map(state.drones).set(drone.droneId, drone),
          })),
        selectTarget: (droneId) =>
          set((state) => {
            const newSelected = new Set(state.selectedTargets);
            if (newSelected.has(droneId)) {
              newSelected.delete(droneId);
            } else {
              newSelected.add(droneId);
            }
            return { selectedTargets: newSelected };
          }),
        addKill: (kill) =>
          set((state) => ({
            killLog: [kill, ...state.killLog],
          })),
        clearSelected: () => set({ selectedTargets: new Set() }),
      },
    }),
    { name: 'Drone Store' }
  )
);
