/**
 * Drone marker with SVG arrow, color by status, rotates to heading. Per Implementation Plan 7.4.
 * When isSelected, applies TargetLockRing overlay. onClick calls targetStore.setSelected.
 * When isDying: skull icon (64px), float-up + fade animation over 3s.
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
/** Skull size when drone is destroyed - big so it's obvious */
const DYING_SKULL_SIZE = 64;
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
  const size = isDying ? DYING_SKULL_SIZE : Math.round(BASE_SIZE * droneSize);

  const icon = useMemo(
    () => {
      const color = STATUS_COLORS[drone.status] ?? '#6B7280';
      const animClass = isDying ? ' drone-marker-dying' : '';
      const content = isDying
        ? `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5))"><span style="font-size:${Math.round(size * 0.85)}px;line-height:1">☠️</span></div>`
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
