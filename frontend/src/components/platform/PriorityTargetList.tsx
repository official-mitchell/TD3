/**
 * Priority target list. Per Implementation Plan 9.1.
 * Engagement Ready only (engageable: altitude <= 500m, not friendly), sorted by threat level descending.
 * Header tooltip explains criteria; stats (DIST/BRG/ALT/SPD) removed; no bounce on reorder.
 */
import React, { useMemo } from 'react';
import Tooltip from '@mui/material/Tooltip';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { useTargetStore } from '../../store/targetStore';
import { playSwivelSound } from '../../lib/sounds';
import type { IDrone } from '@td3/shared-types';

const PRIORITY_TARGETS_TOOLTIP =
  'Engageable only (sorted by threat). Select a target from the list above.';

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
}> = ({ drone, index, selected, onSelect }) => {
  const threatPct = Math.round((drone.threatLevel ?? 0) * 100);
  const threatColor = getThreatBarColor(threatPct);
  const statusColor = STATUS_COLORS[drone.status] ?? '#6B7280';

  return (
    <div
      onClick={onSelect}
      className={`
        p-4 rounded-lg cursor-pointer min-w-0
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
            {drone.hitPoints != null && (
              <span className="text-amber-400 text-xs font-medium">HP:{drone.hitPoints}</span>
            )}
          </div>
          <div className="text-sm text-slate-400">{drone.droneType}</div>
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
    () => (platform ? useDroneStore.getState().getEngageableTargets(center.lat, center.lng) : []),
    [drones, platform]
  );

  return (
    <div className="bg-slate-800/80 rounded-lg p-4 flex flex-col h-full border border-slate-700">
      <div className="mb-4 flex-shrink-0 flex items-center gap-1.5">
        <h2 className="text-lg font-bold">Priority Targets</h2>
        <Tooltip title={PRIORITY_TARGETS_TOOLTIP} arrow placement="top">
          <HelpOutlineIcon className="text-slate-400 text-base cursor-help" fontSize="small" />
        </Tooltip>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto min-w-0 [overflow-anchor:none]">
        {targets.length === 0 ? (
          <p className="text-sm text-slate-500">No engageable targets</p>
        ) : (
          targets.map((drone, index) => (
            <TargetCard
              key={drone.droneId}
              drone={drone}
              index={index}
              selected={selectedDroneId === drone.droneId}
              onSelect={() => {
                if (selectedDroneId !== drone.droneId) playSwivelSound();
                setSelected(drone.droneId);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};
