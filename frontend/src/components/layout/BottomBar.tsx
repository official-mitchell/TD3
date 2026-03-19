/**
 * Bottom bar. Per Implementation Plan 10.1–10.5.
 * PREV/NEXT target nav, FIRE button with states, engagement log feed.
 */
import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { useTargetStore } from '../../store/targetStore';
import { useEngagementLogStore } from '../../store/engagementLogStore';
import { getSocket } from '../../lib/socketRef';

const LOG_DISPLAY_COUNT = 10;

export const BottomBar: React.FC = () => {
  const drones = useDroneStore((s) => s.drones);
  const platform = usePlatformStore((s) => s.platform);
  const selectedDroneId = useTargetStore((s) => s.selectedDroneId);
  const nextTarget = useTargetStore((s) => s.nextTarget);
  const prevTarget = useTargetStore((s) => s.prevTarget);
  const log = useEngagementLogStore((s) => s.log);
  const [firing, setFiring] = useState(false);

  const center = platform?.position ?? { lat: 37.7749, lng: -122.4194 };
  const sortedIds = useMemo(
    () => useDroneStore.getState().getSortedByDistance(center.lat, center.lng).map((d) => d.droneId),
    [drones, platform]
  );
  const selectedDrone = selectedDroneId ? drones.get(selectedDroneId) : null;

  const canFire =
    selectedDrone?.status === 'Engagement Ready' &&
    !firing &&
    (platform?.isActive ?? false) === true;

  const ammoCount = platform?.ammoCount ?? 0;
  const logEntries = useMemo(() => log.slice(0, LOG_DISPLAY_COUNT), [log]);

  const handleFire = () => {
    if (!canFire || !selectedDroneId) return;
    const socket = getSocket();
    if (!socket) return;
    setFiring(true);
    socket.emit('engagement:fire', { droneId: selectedDroneId, timestamp: new Date().toISOString() });
    setTimeout(() => setFiring(false), 350);
  };

  const navDisabled = sortedIds.length < 2;

  return (
    <footer className="flex-shrink-0 w-full border-t border-[#1A3A5C] bg-[#0F1929]">
      <div className="flex items-center justify-between px-4 py-2 gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => prevTarget(sortedIds)}
            disabled={navDisabled}
            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
          >
            ← PREV
          </button>
          <span className="text-sm text-[#7B9BB5] font-mono min-w-[120px]">
            {selectedDrone ? `${selectedDrone.droneId} (${selectedDrone.status})` : 'NO TARGET'}
          </span>
          <button
            onClick={() => nextTarget(sortedIds)}
            disabled={navDisabled}
            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
          >
            NEXT →
          </button>
        </div>
        <button
          onClick={handleFire}
          disabled={!canFire || firing}
          className={`
            px-4 py-2 rounded font-medium text-sm min-w-[100px]
            ${firing ? 'bg-amber-600 text-white cursor-not-allowed' : ''}
            ${canFire && !firing ? 'fire-pulse bg-red-600 hover:bg-red-700 text-white' : ''}
            ${!canFire && !firing ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : ''}
          `}
        >
          {firing ? 'ENGAGING…' : canFire ? `FIRE (${ammoCount})` : 'NO TARGET'}
        </button>
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
