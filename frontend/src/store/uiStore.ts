/**
 * UI preferences store. Marker sizes for weapons system and drones.
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIState {
  weaponSize: number; // 0.5–2, default 1
  droneSize: number; // 0.5–2, default 1
  setWeaponSize: (v: number) => void;
  setDroneSize: (v: number) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      weaponSize: 1,
      droneSize: 1,
      setWeaponSize: (v) => set({ weaponSize: Math.max(0.5, Math.min(2, v)) }),
      setDroneSize: (v) => set({ droneSize: Math.max(0.5, Math.min(2, v)) }),
    }),
    { name: 'UI Store' }
  )
);
