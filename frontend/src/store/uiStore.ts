/**
 * UI preferences store. Marker sizes, sound volume.
 * Persists to localStorage. Defaults: vehicle +30%, drones +15%, sound 60%.
 * showDyingDrones: false = hide skull overlay for destroyed drones (default).
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UIState {
  weaponSize: number; // 0.5–2, default 1.3
  droneSize: number; // 0.5–2, default 1.15
  soundVolume: number; // 0–1, default 0.6
  showDyingDrones: boolean; // default true — show skull animation when drones destroyed
  setWeaponSize: (v: number) => void;
  setDroneSize: (v: number) => void;
  setSoundVolume: (v: number) => void;
  setShowDyingDrones: (v: boolean) => void;
}

const DEFAULT_WEAPON_SIZE = 1.3; // vehicle 30% larger
const DEFAULT_DRONE_SIZE = 1.15; // drones 15% larger
const DEFAULT_SOUND_VOLUME = 0.6;

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        weaponSize: DEFAULT_WEAPON_SIZE,
        droneSize: DEFAULT_DRONE_SIZE,
        soundVolume: DEFAULT_SOUND_VOLUME,
        showDyingDrones: true,
        setWeaponSize: (v) => set({ weaponSize: Math.max(0.5, Math.min(2, v)) }),
        setDroneSize: (v) => set({ droneSize: Math.max(0.5, Math.min(2, v)) }),
        setSoundVolume: (v) => set({ soundVolume: Math.max(0, Math.min(1, v)) }),
        setShowDyingDrones: (v) => set({ showDyingDrones: v }),
      }),
      {
        name: 'td3-ui-settings',
        partialize: (s) => ({
          weaponSize: s.weaponSize,
          droneSize: s.droneSize,
          soundVolume: s.soundVolume,
          showDyingDrones: s.showDyingDrones,
        }),
      }
    ),
    { name: 'UI Store' }
  )
);
