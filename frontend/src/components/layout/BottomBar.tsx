/**
 * Bottom bar. Per Implementation Plan 10.1–10.5.
 * PREV/NEXT target nav, engagement log feed. FIRE button moved to map (MapFireButton).
 */
import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { useTargetStore } from '../../store/targetStore';
import { useEngagementLogStore } from '../../store/engagementLogStore';
import { playSwivelSound } from '../../lib/sounds';

const LOG_DISPLAY_COUNT = 10;

export const BottomBar: React.FC = () => {
  const drones = useDroneStore((s) => s.drones);
  const platform = usePlatformStore((s) => s.platform);
  const selectedDroneId = useTargetStore((s) => s.selectedDroneId);
  const nextTarget = useTargetStore((s) => s.nextTarget);
  const prevTarget = useTargetStore((s) => s.prevTarget);
  const log = useEngagementLogStore((s) => s.log);

  const center = platform?.position ?? { lat: 25.905310475056915, lng: 51.543824178558054 };
  const sortedIds = useMemo(
    () => useDroneStore.getState().getEngageableTargets(center.lat, center.lng).map((d) => d.droneId),
    [drones, platform]
  );
  const selectedDrone = selectedDroneId ? drones.get(selectedDroneId) : null;

  const logEntries = useMemo(() => log.slice(0, LOG_DISPLAY_COUNT), [log]);
  const navDisabled = sortedIds.length < 2;

  return (
    <footer className="flex-shrink-0 w-full border-t border-[#1A3A5C] bg-[#0F1929]">
      <div className="flex items-center justify-between px-4 py-2 gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={() => {
              playSwivelSound();
              prevTarget(sortedIds);
            }}
            disabled={navDisabled}
            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
          >
            ← PREV
          </button>
          <span className="text-sm text-[#7B9BB5] font-mono min-w-[120px]">
            {selectedDrone ? `${selectedDrone.droneId} (${selectedDrone.status})` : 'NO TARGET'}
          </span>
          <button
            onClick={() => {
              playSwivelSound();
              nextTarget(sortedIds);
            }}
            disabled={navDisabled}
            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
          >
            NEXT →
          </button>
        </div>
      </div>
      <div className="h-16 px-4 pb-2 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 items-center h-full min-w-0 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
          {logEntries.length === 0 ? (
            <span className="text-xs text-slate-500">No engagements yet</span>
          ) : (
            logEntries.map((entry, i) => {
              let timeStr = '--:--:--';
              try {
                timeStr = format(new Date(entry.timestamp), 'HH:mm:ss');
              } catch {
                // ignore
              }
              const isHit = entry.outcome === 'Hit' || entry.outcome === 'Destroyed';
              return (
                <div
                  key={`${entry.droneId}-${entry.timestamp}-${i}`}
                  className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0 whitespace-nowrap"
                >
                  <span className="text-slate-500">{timeStr}</span>
                  <span>{entry.droneId}</span>
                  <span>→</span>
                  {isHit ? (
                    <span className="text-green-400">✓ {entry.outcome}</span>
                  ) : (
                    <span className="text-red-400">✗ {entry.outcome}</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </footer>
  );
};
