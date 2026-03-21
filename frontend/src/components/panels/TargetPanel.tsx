/**
 * Target panel. Per Implementation Plan 9.1, 9.3.1. Target details consolidated to TelemetryOverlay on map.
 * PriorityTargetList only. useHighlight('target-panel') for cross-link from Systems View.
 */
import React from 'react';
import { PriorityTargetList } from '@components/platform/PriorityTargetList';
import { useHighlight } from '../../hooks/useHighlight';

export const TargetPanel: React.FC = () => {
  const { isHighlighted } = useHighlight('target-panel');

  return (
    <div
      className={`h-full flex flex-col gap-4 p-4 min-w-0 overflow-x-hidden ${
        isHighlighted ? 'highlight-pulse rounded-lg' : ''
      }`}
      style={isHighlighted ? { outline: '2px solid #FFA726', boxShadow: '0 0 12px rgba(255,167,38,0.4)' } : undefined}
    >
      <div className="flex-1 min-h-0 overflow-hidden">
        <PriorityTargetList />
      </div>
    </div>
  );
};
