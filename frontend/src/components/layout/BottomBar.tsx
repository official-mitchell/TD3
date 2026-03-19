/**
 * Bottom bar. Per Implementation Plan 10.1–10.5, 715.
 * PREV/NEXT target nav only. Engagement log removed (right sidebar LogPanel).
 */
import React, { useMemo } from 'react';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { useTargetStore } from '../../store/targetStore';
import { playSwivelSound } from '../../lib/sounds';

export const BottomBar: React.FC = () => {
  const drones = useDroneStore((s) => s.drones);
  const platform = usePlatformStore((s) => s.platform);
  const selectedDroneId = useTargetStore((s) => s.selectedDroneId);
  const nextTarget = useTargetStore((s) => s.nextTarget);
  const prevTarget = useTargetStore((s) => s.prevTarget);

  const center = platform?.position ?? { lat: 25.905310475056915, lng: 51.543824178558054 };
  const sortedIds = useMemo(
    () => useDroneStore.getState().getEngageableTargets(center.lat, center.lng).map((d) => d.droneId),
    [drones, platform]
  );
  const selectedDrone = selectedDroneId ? drones.get(selectedDroneId) : null;
  const navDisabled = sortedIds.length < 2;

  return (
    <footer className="flex-shrink-0 w-full border-t border-[#1A3A5C] bg-[#0F1929] py-2">
      <div className="flex items-center justify-between px-4 gap-4">
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
    </footer>
  );
};
