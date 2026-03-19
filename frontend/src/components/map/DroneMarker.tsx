/**
 * Drone marker with SVG arrow, color by status, rotates to heading. Per Implementation Plan 7.4.
 * When isSelected, applies TargetLockRing overlay. onClick calls targetStore.setSelected.
 * When isDying: skull icon, float-up + fade animation over 3s.
 */
import React, { useMemo } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { useTargetStore } from '../../store/targetStore';
import { useUIStore } from '../../store/uiStore';
import { playSwivelSound } from '../../lib/sounds';
import type { IDrone } from '@td3/shared-types';
import { PULSE_RING_HTML } from './TargetLockRing';

const BASE_SIZE = 24;
const STATUS_COLORS: Record<string, string> = {
  Detected: '#6B7280',
  Identified: '#EAB308',
  Confirmed: '#F97316',
  'Engagement Ready': '#EF4444',
  Hit: '#374151',
  Destroyed: '#374151',
};

export const DroneMarker: React.FC<{
  drone: IDrone;
  isSelected: boolean;
  isDying?: boolean;
}> = ({ drone, isSelected, isDying = false }) => {
  const selectedDroneId = useTargetStore((s) => s.selectedDroneId);
  const setSelected = useTargetStore((s) => s.setSelected);
  const droneSize = useUIStore((s) => s.droneSize);
  const size = Math.round(BASE_SIZE * droneSize);

  const icon = useMemo(
    () => {
      const color = STATUS_COLORS[drone.status] ?? '#6B7280';
      const animClass = isDying ? ' drone-marker-dying' : '';
      const content = isDying
        ? `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="#fbbf24" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));">
            <path d="M12 2C8.5 2 6 4.5 6 8c0 2 1 3.5 2 4.5-.5 1-1 2-1 3.5 0 2.5 1.5 4 4 4s4-1.5 4-4c0-1.5-.5-2.5-1-3.5 1-1 2-2.5 2-4.5 0-3.5-2.5-6-6-6zm0 2c2.2 0 4 1.8 4 4 0 1.5-.8 2.8-1.5 3.5-.3.3-.5.7-.5 1.2v.3c0 .5.2 1 .5 1.3.5.5 1 1.2 1 2.2 0 1.4-.9 2.5-2.5 2.5s-2.5-1.1-2.5-2.5c0-1 .5-1.7 1-2.2.3-.3.5-.8.5-1.3v-.3c0-.5-.2-.9-.5-1.2C8.8 8.8 8 7.5 8 6c0-2.2 1.8-4 4-4zM9 10c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zm6 0c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zM7 16l-2 4h14l-2-4H7z"/>
          </svg>
        `
        : `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" style="
            transform: rotate(${drone.heading}deg);
            filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
          ">
            <path d="M12 2 L22 12 L12 8 L2 12 Z" fill="${color}" stroke="#fff" stroke-width="1"/>
          </svg>
        `;
      return L.divIcon({
        className: `td3-drone-marker${animClass}`,
        html: `
          <div style="position: relative; cursor: ${isDying ? 'default' : 'pointer'};">
            ${!isDying && isSelected ? PULSE_RING_HTML : ''}
            ${content}
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
    },
    [drone.status, drone.heading, isSelected, isDying, size]
  );

  const pos: [number, number] = [drone.position.lat, drone.position.lng];

  return (
    <Marker
      position={pos}
      icon={icon}
      zIndexOffset={isDying ? 1000 : undefined}
      eventHandlers={
        isDying
          ? {}
          : {
              click: () => {
                if (selectedDroneId !== drone.droneId) playSwivelSound();
                setSelected(drone.droneId);
              },
            }
      }
    />
  );
};
