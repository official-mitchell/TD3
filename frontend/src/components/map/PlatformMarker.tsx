/**
 * XM914E1 weapon platform marker. IFV base + turret on top, rotates to face selected target.
 */
import React, { useMemo } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { useUIStore } from '../../store/uiStore';
import { calculateBearing } from '../../utils/calculations';
import type { IWeaponPlatform } from '@td3/shared-types';
import type { IDrone } from '@td3/shared-types';

import ifvImg from '../../assets/TD3 IFV.png';
import turretImg from '../../assets/TD3 turret.png';

const BASE_SIZE = 48;

export const PlatformMarker: React.FC<{
  platform: IWeaponPlatform;
  targetDrone?: IDrone | null;
}> = ({ platform, targetDrone }) => {
  const weaponSize = useUIStore((s) => s.weaponSize);
  const size = Math.round(BASE_SIZE * weaponSize);

  const turretHeading = useMemo(() => {
    if (targetDrone) {
      const { degrees } = calculateBearing(platform.position, targetDrone.position);
      return degrees;
    }
    return platform.heading;
  }, [platform, targetDrone]);

  const icon = useMemo(
    () =>
      L.divIcon({
        className: 'td3-platform-marker',
        html: `
          <div style="
            position: relative;
            width: ${size}px;
            height: ${size}px;
            cursor: default;
          ">
            <img
              src="${ifvImg}"
              alt="IFV"
              style="
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                object-fit: contain;
              "
            />
            <img
              src="${turretImg}"
              alt="Turret"
              style="
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                object-fit: contain;
                transform: rotate(${turretHeading}deg);
                transform-origin: center center;
              "
            />
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      }),
    [size, turretHeading]
  );

  const pos: [number, number] = [platform.position.lat, platform.position.lng];

  return <Marker position={pos} icon={icon} />;
};
