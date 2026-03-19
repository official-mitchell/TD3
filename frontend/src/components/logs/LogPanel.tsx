/**
 * Log panel. Engagement Log from store; Update Log placeholder.
 * Per Implementation Plan 8.1.4, 10.5.
 */
import React from 'react';
import { format } from 'date-fns';
import { useEngagementLogStore } from '../../store/engagementLogStore';
import type { IEngagementRecord } from '@td3/shared-types';

const EngagementLogRow: React.FC<{ entry: IEngagementRecord }> = ({ entry }) => {
  let timeStr = '--:--:--';
  try {
    timeStr = format(new Date(entry.timestamp), 'HH:mm:ss');
  } catch {
    // ignore
  }
  const isHit = entry.outcome === 'Hit' || entry.outcome === 'Destroyed';

  return (
    <div className="p-3 bg-slate-700/50 rounded text-sm min-w-0">
      <div className="text-slate-400 text-xs">{timeStr}</div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium">{entry.droneId}</span>
        <span className="text-slate-400">{entry.droneType}</span>
        {isHit ? (
          <span className="text-green-400">✓ {entry.outcome}</span>
        ) : (
          <span className="text-red-400">✗ {entry.outcome}</span>
        )}
      </div>
      {entry.distanceAtEngagement > 0 && (
        <div className="text-slate-500 text-xs mt-1">
          {entry.distanceAtEngagement.toFixed(2)}km at engagement
        </div>
      )}
    </div>
  );
};

export const LogPanel: React.FC = () => {
  const log = useEngagementLogStore((s) => s.log);

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col h-full bg-slate-800/80 rounded-lg p-4 border border-slate-700 overflow-hidden">
          <h2 className="text-lg font-bold mb-4 flex-shrink-0">Engagement Log</h2>
          <div className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
            {log.length === 0 ? (
              <p className="text-sm text-slate-500">No engagements yet</p>
            ) : (
              log.map((entry, i) => (
                <EngagementLogRow key={`${entry.droneId}-${entry.timestamp}-${i}`} entry={entry} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
