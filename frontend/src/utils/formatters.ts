import { format } from 'date-fns';
import { DroneType, DroneStatus } from '../types';

export const formatDistance = (meters: number): string => {
  return `${(meters / 1000).toFixed(2)}km`;
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
