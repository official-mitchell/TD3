/**
 * Polyline from platform to selected target. Per Implementation Plan 7.6.
 * Shows distance (m) on the line, rotated parallel to the line, never upside down.
 */
import React from 'react';
import { Polyline, Tooltip } from 'react-leaflet';
import { calculateDistance, calculateBearing } from '../../utils/calculations';
import type { IWeaponPlatform } from '@td3/shared-types';
import type { IDrone } from '@td3/shared-types';

/**
 * Text rotation: parallel to line (bearing+90 for CSS convention), flip when upside down.
 * CSS rotate(0)=horizontal, rotate(90)=vertical. Line at bearing B needs rotation (B+90)%360 for parallel.
 * When that falls in (90,270), flip by +180 so text stays readable.
 */
export function textRotation(bearingDeg: number): number {
  const b = ((bearingDeg % 360) + 360) % 360;
  let r = (b + 90) % 360;
  if (r > 90 && r < 270) r = (r + 180) % 360;
  return r;
}

export const LineOfFire: React.FC<{
  platform: IWeaponPlatform;
  targetDrone: IDrone | null;
}> = ({ platform, targetDrone }) => {
  if (!targetDrone) return null;

  const positions: [number, number][] = [
    [platform.position.lat, platform.position.lng],
    [targetDrone.position.lat, targetDrone.position.lng],
  ];

  const distanceM = Math.round(
    calculateDistance(platform.position, targetDrone.position)
  );
  const { degrees: bearing } = calculateBearing(platform.position, targetDrone.position);
  const rotation = textRotation(bearing);

  return (
    <Polyline
      key={targetDrone.droneId}
      positions={positions}
      pathOptions={{
        color: '#EF4444',
        weight: 2,
        dashArray: '8 4',
      }}
    >
      <Tooltip permanent direction="center" className="line-of-fire-distance">
        <span
          style={{
            display: 'inline-block',
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center center',
          }}
        >
          {distanceM} m
        </span>
      </Tooltip>
    </Polyline>
  );
};
