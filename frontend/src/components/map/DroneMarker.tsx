/**
 * Drone marker with SVG arrow, color by status, rotates to heading. Per Implementation Plan 7.4.
 * When isSelected, applies TargetLockRing overlay. onClick calls targetStore.setSelected.
 */
import React, { useMemo } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { useTargetStore } from '../../store/targetStore';
import type { IDrone } from '@td3/shared-types';
import { PULSE_RING_HTML } from './TargetLockRing';

const STATUS_COLORS: Record<string, string> = {
  Detected: '#6B7280',
  Identified: '#EAB308',
  Confirmed: '#F97316',
  'Engagement Ready': '#EF4444',
  Hit: '#374151',
  Destroyed: '#374151',
};

export const DroneMarker: React.FC<{ drone: IDrone; isSelected: boolean }> = ({
  drone,
  isSelected,
}) => {
  const setSelected = useTargetStore((s) => s.setSelected);

  const icon = useMemo(
    () => {
      const color = STATUS_COLORS[drone.status] ?? '#6B7280';
      return L.divIcon({
        className: 'td3-drone-marker',
        html: `
          <div style="position: relative; cursor: pointer;">
            ${isSelected ? PULSE_RING_HTML : ''}
            <svg width="24" height="24" viewBox="0 0 24 24" style="
              transform: rotate(${drone.heading}deg);
              filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
            ">
              <path d="M12 2 L22 12 L12 8 L2 12 Z" fill="${color}" stroke="#fff" stroke-width="1"/>
            </svg>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
    },
    [drone.status, drone.heading, isSelected]
  );

  const pos: [number, number] = [drone.position.lat, drone.position.lng];

  return (
    <Marker
      position={pos}
      icon={icon}
      eventHandlers={{
        click: () => setSelected(drone.droneId),
      }}
    />
  );
};
