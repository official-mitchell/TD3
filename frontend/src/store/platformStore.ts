/**
 * Platform store. Per Implementation Plan 3.4.
 * Holds platform: IWeaponPlatform | null, updatePlatform only.
 * lastFiredAmmo: used by AmmoOverlay for live depletion animation.
 * currentTurretHeading: gates fire button; updated by PlatformMarker.
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { IWeaponPlatform } from '@td3/shared-types';

interface PlatformState {
  platform: IWeaponPlatform | null;
  lastFiredAmmo: number | null;
  currentTurretHeading: number;
  updatePlatform: (platform: IWeaponPlatform) => void;
  setLastFired: (ammo: number) => void;
  clearLastFired: () => void;
  setTurretHeading: (deg: number) => void;
}

export const usePlatformStore = create<PlatformState>()(
  devtools(
    (set) => ({
      platform: null,
      lastFiredAmmo: null,
      currentTurretHeading: 0,

      updatePlatform: (platform) =>
        set((state) => {
          const prevAmmo = state.platform?.ammoCount ?? 0;
          const isRefill = platform.ammoCount > prevAmmo;
          return {
            platform,
            lastFiredAmmo: isRefill ? null : state.lastFiredAmmo,
          };
        }),
      setLastFired: (ammo) => set({ lastFiredAmmo: ammo }),
      clearLastFired: () => set({ lastFiredAmmo: null }),
      setTurretHeading: (deg) => set({ currentTurretHeading: deg }),
    }),
    { name: 'Platform Store' }
  )
);
