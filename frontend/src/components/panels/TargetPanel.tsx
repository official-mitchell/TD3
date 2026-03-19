/**
 * Target panel. Per Implementation Plan 9.1–9.2, 12.5.
 * Contains PriorityTargetList, DroneDetailPanel, and TelemetryGauges (when drone selected).
 */
import React from 'react';
import { PriorityTargetList } from '@components/platform/PriorityTargetList';
import { DroneDetailPanel } from '@components/platform/DroneDetailPanel';
import { TelemetryGauges } from '@components/gauges/TelemetryGauges';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { useTargetStore } from '../../store/targetStore';

export const TargetPanel: React.FC = () => {
  const selectedDroneId = useTargetStore((s) => s.selectedDroneId);
  const drones = useDroneStore((s) => s.drones);
  const platform = usePlatformStore((s) => s.platform);

  const drone = selectedDroneId ? drones.get(selectedDroneId) ?? null : null;
  const platformPosition = platform?.position ?? { lat: 25.905310475056915, lng: 51.543824178558054 };

  return (
    <div className="h-full flex flex-col gap-4 p-4 min-w-0 overflow-x-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        <PriorityTargetList />
      </div>
      <div className="flex-shrink-0 min-h-0">
        <DroneDetailPanel />
      </div>
      {/* 12.5.1 Gauges at bottom, visible only when selectedDroneId is non-null */}
      {drone && (
        <div className="flex-shrink-0">
          <TelemetryGauges drone={drone} platformPosition={platformPosition} />
        </div>
      )}
    </div>
  );
};
