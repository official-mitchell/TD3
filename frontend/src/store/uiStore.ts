/**
 * UI preferences store. Marker sizes for weapons system and drones.
 * Persists weaponSize/droneSize to localStorage. Defaults: vehicle +30%, drones +15%.
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UIState {
  weaponSize: number; // 0.5–2, default 1.3
  droneSize: number; // 0.5–2, default 1.15
  setWeaponSize: (v: number) => void;
  setDroneSize: (v: number) => void;
}

const DEFAULT_WEAPON_SIZE = 1.3; // vehicle 30% larger
const DEFAULT_DRONE_SIZE = 1.15; // drones 15% larger

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        weaponSize: DEFAULT_WEAPON_SIZE,
        droneSize: DEFAULT_DRONE_SIZE,
        setWeaponSize: (v) => set({ weaponSize: Math.max(0.5, Math.min(2, v)) }),
        setDroneSize: (v) => set({ droneSize: Math.max(0.5, Math.min(2, v)) }),
      }),
      {
        name: 'td3-ui-settings',
        partialize: (s) => ({ weaponSize: s.weaponSize, droneSize: s.droneSize }),
      }
    ),
    { name: 'UI Store' }
  )
);
