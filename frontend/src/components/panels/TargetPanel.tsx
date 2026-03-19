/**
 * Target panel (left sidebar). Per Implementation Plan 6.2.4.
 * Contains PriorityTargetPanel. 280px width, overflow-y auto.
 */
import React from 'react';
import { PriorityTargetPanel } from '@components/platform/PriorityTargetPanel';

export const TargetPanel: React.FC = () => {
  return (
    <div className="h-full p-4 min-w-0 overflow-x-hidden">
      <PriorityTargetPanel />
    </div>
  );
};
