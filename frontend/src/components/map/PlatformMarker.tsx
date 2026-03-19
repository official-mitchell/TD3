/**
 * XM914E1 weapon platform marker with heading arrow. Per Implementation Plan 7.2.
 */
import React, { useMemo } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import type { IWeaponPlatform } from '@td3/shared-types';

export const PlatformMarker: React.FC<{ platform: IWeaponPlatform }> = ({ platform }) => {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: 'td3-platform-marker',
        html: `
          <div style="
            width: 32px; height: 32px;
            transform: rotate(${platform.heading}deg);
            cursor: default;
          ">
            <svg width="32" height="32" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="14" fill="#00C853" stroke="#fff" stroke-width="2"/>
              <path d="M16 6 L16 26 M14 8 L16 4 L18 8" stroke="#fff" stroke-width="2" fill="none"/>
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      }),
    [platform.heading]
  );

  const pos: [number, number] = [platform.position.lat, platform.position.lng];

  return <Marker position={pos} icon={icon} />;
};
