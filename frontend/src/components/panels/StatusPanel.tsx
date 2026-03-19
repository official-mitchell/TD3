/**
 * Status panel (right sidebar). Per Implementation Plan 6.2.2.
 * Contains StatusCards and LogPanel. 352px width. overflow-x-hidden to prevent horizontal scrollbar.
 */
import React from 'react';
import { StatusCards } from '@components/platform/StatusCards';
import { LogPanel } from '@components/logs/LogPanel';

export const StatusPanel: React.FC = () => {
  return (
    <div className="flex flex-col h-full gap-4 p-4 overflow-y-auto overflow-x-hidden min-w-0">
      <div className="flex-shrink-0 min-w-0">
        <StatusCards />
      </div>
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
        <LogPanel />
      </div>
    </div>
  );
};
