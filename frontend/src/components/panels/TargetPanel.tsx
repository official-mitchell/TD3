/**
 * Target panel. Per Implementation Plan 9.1. Target details consolidated to TelemetryOverlay on map.
 * PriorityTargetList only. Select-a-target hint moved to header tooltip.
 */
import React from 'react';
import { PriorityTargetList } from '@components/platform/PriorityTargetList';

export const TargetPanel: React.FC = () => {
  return (
    <div className="h-full flex flex-col gap-4 p-4 min-w-0 overflow-x-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        <PriorityTargetList />
      </div>
    </div>
  );
};
