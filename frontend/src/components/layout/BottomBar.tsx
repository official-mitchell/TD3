/**
 * Bottom bar with PREV/NEXT target nav and FIRE. Per Implementation Plan 10.
 * FIRE emits engagement:fire when selected drone is Engagement Ready.
 */
import React, { useState, useMemo } from 'react';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { useTargetStore } from '../../store/targetStore';
import { getSocket } from '../../lib/socketRef';

export const BottomBar: React.FC = () => {
  const drones = useDroneStore((s) => s.drones);
  const platform = usePlatformStore((s) => s.platform);
  const selectedDroneId = useTargetStore((s) => s.selectedDroneId);
  const nextTarget = useTargetStore((s) => s.nextTarget);
  const prevTarget = useTargetStore((s) => s.prevTarget);
  const [firing, setFiring] = useState(false);

  const center = platform?.position ?? { lat: 37.7749, lng: -122.4194 };
  const sortedIds = useMemo(
    () => useDroneStore.getState().getSortedByDistance(center.lat, center.lng).map((d) => d.droneId),
    [drones, platform]
  );
  const selectedDrone = selectedDroneId ? drones.get(selectedDroneId) : null;
  const canFire = selectedDrone?.status === 'Engagement Ready';
  const ammoCount = platform?.ammoCount ?? 0;

  const handleFire = () => {
    if (!selectedDroneId || !canFire || firing) return;
    const socket = getSocket();
    if (!socket) return;
    setFiring(true);
    socket.emit('engagement:fire', { droneId: selectedDroneId, timestamp: new Date().toISOString() });
    setTimeout(() => setFiring(false), 350);
  };

  return (
    <footer className="h-12 flex-shrink-0 w-full border-t border-[#1A3A5C] bg-[#0F1929] flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => prevTarget(sortedIds)}
          disabled={sortedIds.length === 0}
          className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded"
        >
          ← PREV
        </button>
        <span className="text-sm text-[#7B9BB5] font-mono min-w-[120px]">
          {selectedDrone ? `${selectedDrone.droneId} (${selectedDrone.status})` : 'NO TARGET'}
        </span>
        <button
          onClick={() => nextTarget(sortedIds)}
          disabled={sortedIds.length === 0}
          className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded"
        >
          NEXT →
        </button>
      </div>
      <button
        onClick={handleFire}
        disabled={!canFire || firing}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded font-medium text-sm"
      >
        {firing ? 'ENGAGING…' : canFire ? `FIRE (${ammoCount})` : 'FIRE'}
      </button>
    </footer>
  );
};
