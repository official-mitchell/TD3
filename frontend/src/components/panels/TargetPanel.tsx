/**
 * Target panel. Per Implementation Plan 9.1. Target details consolidated to TelemetryOverlay on map.
 * PriorityTargetList only. Slim footer when targets exist but none selected.
 */
import React from 'react';
import { PriorityTargetList } from '@components/platform/PriorityTargetList';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { useTargetStore } from '../../store/targetStore';

export const TargetPanel: React.FC = () => {
  const selectedDroneId = useTargetStore((s) => s.selectedDroneId);
  const drones = useDroneStore((s) => s.drones);
  const platform = usePlatformStore((s) => s.platform);
  const center = platform?.position ?? { lat: 25.905310475056915, lng: 51.543824178558054 };
  const targets = platform ? useDroneStore.getState().getSortedByDistance(center.lat, center.lng) : [];
  const hasTargets = targets.length > 0;
  const selectedDrone = selectedDroneId ? drones.get(selectedDroneId) ?? null : null;
  const needsSelection = hasTargets && (!selectedDroneId || !selectedDrone);

  return (
    <div className="h-full flex flex-col gap-4 p-4 min-w-0 overflow-x-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        <PriorityTargetList />
      </div>
      {needsSelection && (
        <div className="flex-shrink-0 py-2 text-center text-sm text-slate-500">
          Select a target from the list above
        </div>
      )}
    </div>
  );
};
