/**
 * Priority target list. Per Implementation Plan 9.1.
 * Client-side distance/bearing per 9.1.7.
 * Confirmed/Engagement Ready drones, sorted by distance. Client-side distance/bearing.
 */
import React, { useMemo } from 'react';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { useTargetStore } from '../../store/targetStore';
import { calculateDistance, calculateBearing } from '../../utils/calculations';
import { formatAltitude, formatSpeed } from '../../utils/formatters';
import { playSwivelSound } from '../../lib/sounds';
import type { IDrone } from '@td3/shared-types';

const STATUS_COLORS: Record<string, string> = {
  Detected: '#6B7280',
  Identified: '#EAB308',
  Confirmed: '#F97316',
  'Engagement Ready': '#EF4444',
  Hit: '#374151',
  Destroyed: '#374151',
};

const getThreatBarColor = (pct: number): string => {
  if (pct < 40) return '#00C853';
  if (pct < 70) return '#FFB300';
  return '#EF4444';
};

const TargetCard: React.FC<{
  drone: IDrone;
  index: number;
  selected: boolean;
  onSelect: () => void;
  distKm: number;
  bearingDeg: number;
}> = ({ drone, index, selected, onSelect, distKm, bearingDeg }) => {
  const threatPct = Math.round((drone.threatLevel ?? 0) * 100);
  const threatColor = getThreatBarColor(threatPct);
  const statusColor = STATUS_COLORS[drone.status] ?? '#6B7280';

  return (
    <div
      onClick={onSelect}
      className={`
        p-4 rounded-lg cursor-pointer transition-all min-w-0
        ${selected ? 'border-2 border-[#1E90FF]' : 'border border-slate-700'}
        ${selected ? 'bg-slate-700/80' : 'bg-slate-800 hover:bg-slate-700/80'}
      `}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg font-bold text-slate-400 flex-shrink-0">{index + 1}</span>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold truncate">{drone.droneId}</span>
            <span
              className="px-2 py-0.5 rounded text-xs font-medium flex-shrink-0"
              style={{ backgroundColor: `${statusColor}33`, color: statusColor }}
            >
              {drone.status}
            </span>
          </div>
          <div className="text-sm text-slate-400">{drone.droneType}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm text-slate-300 min-w-0">
            <span className="truncate">DIST: {distKm.toFixed(2)}km</span>
            <span className="truncate">BRG: {bearingDeg.toFixed(0)}°</span>
            <span className="truncate">ALT: {formatAltitude(drone.position.altitude)}</span>
            <span className="truncate">SPD: {formatSpeed(drone.speed)}</span>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">THREAT:</span>
              <span style={{ color: threatColor }}>{threatPct}%</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, threatPct)}%`, backgroundColor: threatColor }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PriorityTargetList: React.FC = () => {
  const platform = usePlatformStore((s) => s.platform);
  const drones = useDroneStore((s) => s.drones);
  const selectedDroneId = useTargetStore((s) => s.selectedDroneId);
  const setSelected = useTargetStore((s) => s.setSelected);

  const center = platform?.position ?? { lat: 25.905310475056915, lng: 51.543824178558054 };
  const targets = useMemo(
    () => (platform ? useDroneStore.getState().getSortedByDistance(center.lat, center.lng) : []),
    [drones, platform]
  );

  return (
    <div className="bg-slate-800/80 rounded-lg p-4 flex flex-col h-full border border-slate-700">
      <div className="mb-4 flex-shrink-0">
        <h2 className="text-lg font-bold">Priority Targets</h2>
        <p className="text-sm text-slate-400">Confirmed and Engagement Ready only</p>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto min-w-0">
        {targets.length === 0 ? (
          <p className="text-sm text-slate-500">No targets (Confirmed or Engagement Ready)</p>
        ) : (
          targets.map((drone, index) => {
            const distM = calculateDistance(center, drone.position);
            const distKm = distM / 1000;
            const { degrees } = calculateBearing(center, drone.position);
            return (
              <TargetCard
                key={drone.droneId}
                drone={drone}
                index={index}
                selected={selectedDroneId === drone.droneId}
                onSelect={() => {
                  if (selectedDroneId !== drone.droneId) playSwivelSound();
                  setSelected(drone.droneId);
                }}
                distKm={distKm}
                bearingDeg={degrees}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
