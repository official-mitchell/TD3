/**
 * Platform store. Per Implementation Plan 3.4, 712.
 * Holds platform: IWeaponPlatform | null, updatePlatform only.
 * lastFiredAmmo: used by AmmoOverlay for live depletion animation.
 * currentTurretHeading: gates fire button; updated by PlatformMarker.
 * turretRecoiling: triggers recoil animation on PlatformMarker.
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { IWeaponPlatform } from '@td3/shared-types';

interface PlatformState {
  platform: IWeaponPlatform | null;
  lastFiredAmmo: number | null;
  currentTurretHeading: number;
  turretRecoiling: boolean;
  updatePlatform: (platform: IWeaponPlatform) => void;
  setLastFired: (ammo: number) => void;
  clearLastFired: () => void;
  setTurretHeading: (deg: number) => void;
  setTurretRecoiling: (v: boolean) => void;
}

export const usePlatformStore = create<PlatformState>()(
  devtools(
    (set) => ({
      platform: null,
      lastFiredAmmo: null,
      currentTurretHeading: 0,
      turretRecoiling: false,

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
      setTurretRecoiling: (v) => set({ turretRecoiling: v }),
    }),
    { name: 'Platform Store' }
  )
);
