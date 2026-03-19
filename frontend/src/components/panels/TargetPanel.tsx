/**
 * Target panel. Per Implementation Plan 9.1–9.2.
 * Contains PriorityTargetList and DroneDetailPanel. Telemetry renders over map (TelemetryOverlay).
 */
import React from 'react';
import { PriorityTargetList } from '@components/platform/PriorityTargetList';
import { DroneDetailPanel } from '@components/platform/DroneDetailPanel';

export const TargetPanel: React.FC = () => {
  return (
    <div className="h-full flex flex-col gap-4 p-4 min-w-0 overflow-x-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        <PriorityTargetList />
      </div>
      <div className="flex-shrink-0 min-h-0">
        <DroneDetailPanel />
      </div>
    </div>
  );
};
