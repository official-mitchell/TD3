/**
 * Log panel. Engagement Log grouped by drone. Per Implementation Plan 8.1.4, 10.5, 715–716, 9.3.5.
 * useHighlight('engagement-log') for cross-link from Systems View.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useEngagementLogStore } from '../../store/engagementLogStore';
import { useHighlight } from '../../hooks/useHighlight';
import type { IEngagementRecord } from '@td3/shared-types';

const EngagementHitMissRow: React.FC<{ entry: IEngagementRecord; roundNumber: number }> = ({ entry, roundNumber }) => {
  let timeStr = '--:--:--';
  try {
    timeStr = format(new Date(entry.timestamp), 'HH:mm:ss');
  } catch {
    // ignore
  }
  const isDestroyed = entry.outcome === 'Destroyed';
  const isHit = entry.outcome === 'Hit' || isDestroyed;
  const hp = entry.hitPointsRemaining;

  return (
    <div className="flex items-center justify-between text-xs py-1 px-2 rounded">
      {isDestroyed ? (
        <span className="text-amber-400 font-medium">{roundNumber} ☠️ Destroyed</span>
      ) : isHit ? (
        <span className="text-green-400">
          {roundNumber} Hit{hp != null ? ` (${hp} HP)` : ''}
        </span>
      ) : (
        <span className="text-red-400">{roundNumber} Miss</span>
      )}
      <span className="text-slate-400">{timeStr}</span>
    </div>
  );
};

const EngagementDroneGroup: React.FC<{
  droneId: string;
  droneType: string;
  entries: IEngagementRecord[];
}> = ({ droneId, entries }) => {
  const isDefeated = entries.some((e) => e.outcome === 'Destroyed');
  const [expanded, setExpanded] = useState(!isDefeated);
  useEffect(() => {
    if (isDefeated) setExpanded(false);
  }, [isDefeated]);
  const sortedEntries = useMemo(
    () =>
      [...entries]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [entries]
  );

  return (
    <div
      className={`rounded-lg mb-3 overflow-hidden transition-colors ${
        isDefeated ? 'bg-slate-900/95' : 'bg-slate-700/50'
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 p-3 border-b border-slate-600/50 text-left hover:bg-slate-600/30 cursor-pointer"
      >
        {isDefeated && (
          <span className="text-amber-400 flex-shrink-0" title="Destroyed" aria-label="Destroyed">☠️</span>
        )}
        <span className={`font-medium ${isDefeated ? 'text-red-500' : ''}`}>{droneId}</span>
        <span className="ml-auto text-slate-500 text-sm">
          {expanded ? '▼' : '▶'}
        </span>
      </button>
      {expanded && (
        <div className="max-h-32 overflow-y-auto space-y-0.5 py-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
          {sortedEntries.length === 0 ? (
            <p className="text-xs text-slate-500 px-3 py-1">No rounds yet</p>
          ) : (
            sortedEntries.map((entry, idx) => (
              <EngagementHitMissRow
                key={`${entry.timestamp}-${entry.outcome}-${idx}`}
                entry={entry}
                roundNumber={sortedEntries.length - idx}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export const LogPanel: React.FC = () => {
  const log = useEngagementLogStore((s) => s.log);
  const { isHighlighted } = useHighlight('engagement-log');

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
        <div
          className={`flex flex-col h-full bg-slate-800/80 rounded-lg p-4 border border-slate-700 overflow-hidden ${
            isHighlighted ? 'highlight-pulse' : ''
          }`}
          style={isHighlighted ? { outline: '2px solid #FFA726', boxShadow: '0 0 12px rgba(255,167,38,0.4)' } : undefined}
          data-testid="engagement-log"
        >
          <h2 className="text-lg font-bold mb-4 flex-shrink-0">Engagement Log</h2>
          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
            {groups.length === 0 ? (
              <p className="text-sm text-slate-500">No engagements yet</p>
            ) : (
              groups.map((g) => (
                <EngagementDroneGroup
                  key={g.droneId}
                  droneId={g.droneId}
                  droneType={g.entries[0]?.droneType ?? 'Unknown'}
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
