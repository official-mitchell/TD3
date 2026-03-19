import { format } from 'date-fns';
import type { DroneType, DroneStatus } from '@td3/shared-types';

export const formatDistance = (meters: number): string => {
  return `${(meters / 1000).toFixed(2)}km`;
};

/** Altitude in meters, 1 decimal max (e.g. 119.9m). Prevents long floats from overflowing. */
export const formatAltitude = (meters: number): string => {
  return `${Number(meters.toFixed(1))}m`;
};

/** Speed in km/h, 1 decimal max (e.g. 0.0 km/h). Prevents long floats from overflowing. */
export const formatSpeed = (kmh: number): string => {
  return `${Number(kmh.toFixed(1))} km/h`;
};

export const formatBearing = (degrees: number, cardinal: string): string => {
  return `${degrees.toFixed(1)}° (${cardinal})`;
};

export const formatDroneType = (type: DroneType): string => {
  // You could add icons or colors here too
  return type.charAt(0).toUpperCase() + type.slice(1);
};

export const formatTimestamp = (date: Date): string => {
  return format(new Date(date), 'HH:mm:ss');
};

export const formatStatus = (
  status: DroneStatus
): {
  label: string;
  color: string;
} => {
  const statusMap: Record<DroneStatus, { label: string; color: string }> = {
    Detected: { label: 'Detected', color: '#fff3cd' },
    Identified: { label: 'Identified', color: '#cce5ff' },
    Confirmed: { label: 'Confirmed', color: '#d4edda' },
    'Engagement Ready': { label: 'Ready', color: '#dc3545' },
    Hit: { label: 'Hit', color: '#f8d7da' },
    Destroyed: { label: 'Destroyed', color: '#721c24' },
  };

  return statusMap[status];
};

export const formatThreatLevel = (
  level: number
): {
  label: string;
  color: string;
} => {
  const threatColors = [
    '#28a745', // Low - Green
    '#ffc107', // Medium-Low - Yellow
    '#fd7e14', // Medium - Orange
    '#dc3545', // Medium-High - Light Red
    '#721c24', // High - Dark Red
  ];

  return {
    label: '🔴'.repeat(level),
    color: threatColors[level - 1] || threatColors[0],
  };
};
