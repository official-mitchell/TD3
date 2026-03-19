/**
 * Priority target panel. Uses droneStore, platformStore, targetStore.
 * Shows Confirmed/Engagement Ready drones; FIRE emits engagement:fire via socket.
 */
import React, { useState, useMemo } from 'react';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { useTargetStore } from '../../store/targetStore';
import { getSocket } from '../../lib/socketRef';
import { calculateDistance } from '../../utils/calculations';
import type { IDrone } from '@td3/shared-types';

const TargetCard: React.FC<{
  drone: IDrone;
  index: number;
  selected: boolean;
  onSelect: () => void;
}> = ({ drone, index, selected, onSelect }) => {
  const platform = usePlatformStore((s) => s.platform);
  const center = platform?.position ?? { lat: 37.7749, lng: -122.4194 };
  const distKm = calculateDistance(center, drone.position) / 1000;
  const threatStars = Math.min(5, Math.ceil(drone.threatLevel * 5));

  return (
    <div
      onClick={onSelect}
      className={`
        p-4 rounded-lg cursor-pointer transition-all
        ${selected ? 'bg-slate-700 border-l-4 border-blue-500' : 'bg-slate-800 hover:bg-slate-700'}
      `}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-blue-400">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium truncate">{drone.droneId}</span>
            <div className="flex flex-shrink-0">
              {[...Array(5)].map((_, i) => (
                <span key={i} className={`text-sm ${i < threatStars ? 'text-yellow-400' : 'text-slate-600'}`}>
                  ★
                </span>
              ))}
            </div>
          </div>
          <div className="text-sm text-slate-400">{drone.droneType}</div>
          <div className="text-sm text-slate-500 mt-1">
            {drone.status} • {distKm.toFixed(2)}km
          </div>
        </div>
      </div>
    </div>
  );
};

export const PriorityTargetPanel: React.FC = () => {
  const drones = useDroneStore((s) => s.drones);
  const platform = usePlatformStore((s) => s.platform);
  const selectedDroneId = useTargetStore((s) => s.selectedDroneId);
  const setSelected = useTargetStore((s) => s.setSelected);
  const [firing, setFiring] = useState(false);

  const center = platform?.position ?? { lat: 37.7749, lng: -122.4194 };
  const targets = useMemo(
    () => useDroneStore.getState().getSortedByDistance(center.lat, center.lng),
    [drones, platform]
  );
  const canFire = selectedDroneId && targets.some((d) => d.droneId === selectedDroneId);
  const selectedDrone = selectedDroneId ? drones.get(selectedDroneId) : null;
  const isEngagementReady = selectedDrone?.status === 'Engagement Ready';

  const handleFire = async () => {
    if (!selectedDroneId || !isEngagementReady || firing) return;
    const socket = getSocket();
    if (!socket) return;
    setFiring(true);
    socket.emit('engagement:fire', { droneId: selectedDroneId, timestamp: new Date().toISOString() });
    setTimeout(() => setFiring(false), 500);
  };

  return (
    <div className="bg-slate-800/80 rounded-lg p-4 flex flex-col h-full border border-slate-700">
      <div className="mb-4">
        <h2 className="text-lg font-bold">Priority Targets</h2>
        <p className="text-sm text-slate-400">
          Select a target; FIRE when Engagement Ready
        </p>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto min-w-0">
        {targets.length === 0 ? (
          <p className="text-sm text-slate-500">No targets (Confirmed or Engagement Ready)</p>
        ) : (
          targets.map((drone, index) => (
            <TargetCard
              key={drone.droneId}
              drone={drone}
              index={index}
              selected={selectedDroneId === drone.droneId}
              onSelect={() => setSelected(selectedDroneId === drone.droneId ? null : drone.droneId)}
            />
          ))
        )}
      </div>

      <button
        onClick={handleFire}
        disabled={!canFire || !isEngagementReady || firing}
        className="w-full mt-4 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
      >
        {firing ? 'FIRING…' : isEngagementReady ? 'FIRE' : 'FIRE (select Engagement Ready)'}
      </button>
    </div>
  );
};
