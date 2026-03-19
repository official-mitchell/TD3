/**
 * Drone detail panel. Per Implementation Plan 9.2.
 * Selection persists across drone:update (9.2.4).
 * Shows selected drone or NO TARGET SELECTED. Altitude/speed formatted to prevent overflow.
 */
import React from 'react';
import { format } from 'date-fns';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { useTargetStore } from '../../store/targetStore';
import { calculateDistance, calculateBearing } from '../../utils/calculations';
import { formatAltitude, formatSpeed } from '../../utils/formatters';
import type { IDrone } from '@td3/shared-types';

const STATUS_COLORS: Record<string, string> = {
  Detected: '#6B7280',
  Identified: '#EAB308',
  Confirmed: '#F97316',
  'Engagement Ready': '#EF4444',
  Hit: '#374151',
  Destroyed: '#374151',
};

export const DroneDetailPanel: React.FC = () => {
  const selectedDroneId = useTargetStore((s) => s.selectedDroneId);
  const drones = useDroneStore((s) => s.drones);
  const platform = usePlatformStore((s) => s.platform);

  const drone = selectedDroneId ? drones.get(selectedDroneId) ?? null : null;

  if (!drone) {
    return (
      <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700 flex items-center justify-center min-h-[120px]">
        <p className="text-slate-500 font-medium">NO TARGET SELECTED</p>
      </div>
    );
  }

  const center = platform?.position ?? { lat: 25.905310475056915, lng: 51.543824178558054 };
  const distKm = calculateDistance(center, drone.position) / 1000;
  const { degrees, cardinal } = calculateBearing(center, drone.position);
  const threatPct = Math.round((drone.threatLevel ?? 0) * 100);
  const statusColor = STATUS_COLORS[drone.status] ?? '#6B7280';

  let lastUpdatedStr = '—';
  try {
    lastUpdatedStr = format(new Date(drone.lastUpdated), 'PPpp');
  } catch {
    lastUpdatedStr = drone.lastUpdated;
  }

  return (
    <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700 min-w-0 overflow-hidden">
      <h2 className="text-lg font-bold mb-3">Target Detail</h2>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold">{drone.droneId}</span>
          <span className="text-slate-400">{drone.droneType}</span>
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: `${statusColor}33`, color: statusColor }}
          >
            {drone.status}
          </span>
        </div>
        {drone.status === 'Engagement Ready' && (
          <div className="text-green-400 font-medium">✓ WITHIN ENGAGEMENT RANGE</div>
        )}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300 min-w-0">
          <span className="truncate" title={`Distance: ${distKm.toFixed(2)}km`}>Distance: {distKm.toFixed(2)}km</span>
          <span className="truncate" title={`Bearing: ${degrees.toFixed(1)}° (${cardinal})`}>Bearing: {degrees.toFixed(1)}° ({cardinal})</span>
          <span className="truncate" title={`Altitude: ${formatAltitude(drone.position.altitude)}`}>Altitude: {formatAltitude(drone.position.altitude)}</span>
          <span className="truncate" title={`Speed: ${formatSpeed(drone.speed)}`}>Speed: {formatSpeed(drone.speed)}</span>
          <span className="truncate">Threat: {threatPct}%</span>
        </div>
        <div className="text-slate-400">
          Position: {drone.position.lat.toFixed(4)}, {drone.position.lng.toFixed(4)}
        </div>
        <div className="text-slate-400">Last updated: {lastUpdatedStr}</div>
      </div>
    </div>
  );
};
