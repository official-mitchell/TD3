/**
 * Polyline from platform to selected target. Per Implementation Plan 7.6.
 */
import React from 'react';
import { Polyline } from 'react-leaflet';
import type { IWeaponPlatform } from '@td3/shared-types';
import type { IDrone } from '@td3/shared-types';

export const LineOfFire: React.FC<{
  platform: IWeaponPlatform;
  targetDrone: IDrone | null;
}> = ({ platform, targetDrone }) => {
  if (!targetDrone) return null;

  const positions: [number, number][] = [
    [platform.position.lat, platform.position.lng],
    [targetDrone.position.lat, targetDrone.position.lng],
  ];

  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color: '#EF4444',
        weight: 2,
        dashArray: '8 4',
      }}
    />
  );
};
