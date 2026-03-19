/**
 * Log panel. Engagement Log grouped by drone.
 * Per Implementation Plan 8.1.4, 10.5, 715–716.
 * Drone header with hits/misses list underneath. Collapsible. Skull + darken when defeated.
 * Format: "• Hit || Miss - TIME", hits show remaining HP. Unknown droneType hidden.
 */
import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useEngagementLogStore } from '../../store/engagementLogStore';
import type { IEngagementRecord } from '@td3/shared-types';

const EngagementHitMissRow: React.FC<{ entry: IEngagementRecord }> = ({ entry }) => {
  let timeStr = '--:--:--';
  try {
    timeStr = format(new Date(entry.timestamp), 'HH:mm:ss');
  } catch {
    // ignore
  }
  const isHit = entry.outcome === 'Hit' || entry.outcome === 'Destroyed';
  const hp = entry.hitPointsRemaining;

  return (
    <div className="flex items-center justify-between text-xs py-1 px-2 rounded">
      {isHit ? (
        <span className="text-green-400">
          • Hit{hp != null ? ` (${hp} HP)` : ''}
        </span>
      ) : (
        <span className="text-red-400">• Miss</span>
      )}
      <span className="text-slate-400">{timeStr}</span>
    </div>
  );
};

const EngagementDroneGroup: React.FC<{
  droneId: string;
  droneType: string;
  entries: IEngagementRecord[];
}> = ({ droneId, droneType, entries }) => {
  const [expanded, setExpanded] = useState(true);
  const isDefeated = entries.some((e) => e.outcome === 'Destroyed');
  const sortedEntries = useMemo(
    () =>
      [...entries]
        .filter((e) => e.outcome !== 'Destroyed')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [entries]
  );

  return (
    <div
      className={`rounded-lg mb-3 overflow-hidden transition-colors ${
        isDefeated ? 'bg-slate-800/90' : 'bg-slate-700/50'
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 p-3 border-b border-slate-600/50 text-left hover:bg-slate-600/30 cursor-pointer"
      >
        {isDefeated && (
          <span className="text-amber-400 flex-shrink-0 inline-flex" title="Destroyed" aria-label="Destroyed">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400">
              <path d="M12 2C8.5 2 6 4.5 6 8c0 2 1 3.5 2 4.5-.5 1-1 2-1 3.5 0 2.5 1.5 4 4 4s4-1.5 4-4c0-1.5-.5-2.5-1-3.5 1-1 2-2.5 2-4.5 0-3.5-2.5-6-6-6zm0 2c2.2 0 4 1.8 4 4 0 1.5-.8 2.8-1.5 3.5-.3.3-.5.7-.5 1.2v.3c0 .5.2 1 .5 1.3.5.5 1 1.2 1 2.2 0 1.4-.9 2.5-2.5 2.5s-2.5-1.1-2.5-2.5c0-1 .5-1.7 1-2.2.3-.3.5-.8.5-1.3v-.3c0-.5-.2-.9-.5-1.2C8.8 8.8 8 7.5 8 6c0-2.2 1.8-4 4-4zM9 10c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zm6 0c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zM7 16l-2 4h14l-2-4H7z"/>
            </svg>
          </span>
        )}
        <span className="font-medium">{droneId}</span>
        <span className="ml-auto text-slate-500 text-sm">
          {expanded ? '▼' : '▶'}
        </span>
      </button>
      {expanded && (
        <div className="max-h-32 overflow-y-auto space-y-0.5 py-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
          {sortedEntries.length === 0 ? (
            <p className="text-xs text-slate-500 px-3 py-1">No rounds yet</p>
          ) : (
            sortedEntries.map((entry) => (
              <EngagementHitMissRow key={`${entry.timestamp}-${entry.outcome}`} entry={entry} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export const LogPanel: React.FC = () => {
  const log = useEngagementLogStore((s) => s.log);

  const groups = useMemo(() => {
    const byDrone = new Map<string, IEngagementRecord[]>();
    for (const entry of log) {
      const list = byDrone.get(entry.droneId) ?? [];
      list.push(entry);
      byDrone.set(entry.droneId, list);
    }
    return Array.from(byDrone.entries())
      .map(([droneId, entries]) => ({ droneId, entries }))
      .sort((a, b) => {
        const aLatest = Math.max(...a.entries.map((e) => new Date(e.timestamp).getTime()));
        const bLatest = Math.max(...b.entries.map((e) => new Date(e.timestamp).getTime()));
        return bLatest - aLatest;
      });
  }, [log]);

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col h-full bg-slate-800/80 rounded-lg p-4 border border-slate-700 overflow-hidden">
          <h2 className="text-lg font-bold mb-4 flex-shrink-0">Engagement Log</h2>
          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
            {groups.length === 0 ? (
              <p className="text-sm text-slate-500">No engagements yet</p>
            ) : (
              groups.map((g) => (
                <EngagementDroneGroup
                  key={g.droneId}
                  droneId={g.droneId}
                  entries={g.entries}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
