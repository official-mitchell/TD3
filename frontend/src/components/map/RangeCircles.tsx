/**
 * 2km and 5km range circles around platform. Per Implementation Plan 7.5.
 */
import React from 'react';
import { Circle } from 'react-leaflet';
import type { IWeaponPlatform } from '@td3/shared-types';

export const RangeCircles: React.FC<{ platform: IWeaponPlatform }> = ({ platform }) => {
  const center: [number, number] = [platform.position.lat, platform.position.lng];

  return (
    <>
      <Circle
        center={center}
        radius={2000}
        pathOptions={{
          color: '#00C853',
          fillColor: '#00C853',
          fillOpacity: 0.04,
          weight: 1.5,
        }}
      />
      <Circle
        center={center}
        radius={5000}
        pathOptions={{
          color: '#FFB300',
          fillColor: '#FFB300',
          fillOpacity: 0.02,
          weight: 1,
          dashArray: '6 4',
        }}
      />
    </>
  );
};
