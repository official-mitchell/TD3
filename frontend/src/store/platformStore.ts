/**
 * Platform store. Per Implementation Plan 3.4.
 * Holds platform: IWeaponPlatform | null, updatePlatform only.
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { IWeaponPlatform } from '@td3/shared-types';

interface PlatformState {
  platform: IWeaponPlatform | null;
  updatePlatform: (platform: IWeaponPlatform) => void;
}

export const usePlatformStore = create<PlatformState>()(
  devtools(
    (set) => ({
      platform: null,

      updatePlatform: (platform) => set({ platform }),
    }),
    { name: 'Platform Store' }
  )
);
