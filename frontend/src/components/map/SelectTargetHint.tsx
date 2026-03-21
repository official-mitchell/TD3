/**
 * SelectTargetHint. Single prominent message when user has not selected a target.
 * Shown when: no target selected (not clicked on map, Create Targets, or Priority List).
 * Message varies: no targets → prompt to create; targets exist → prompt to select.
 *
 * --- Changelog ---
 * 2025-03-20: Initial implementation. Consolidates select-a-target messaging.
 */
import React, { useMemo } from 'react';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { useTargetStore } from '../../store/targetStore';

const DEFAULT_CENTER = { lat: 25.905310475056915, lng: 51.543824178558054 };

export const SelectTargetHint: React.FC = () => {
  const selectedDroneId = useTargetStore((s) => s.selectedDroneId);
  const platform = usePlatformStore((s) => s.platform);
  const drones = useDroneStore((s) => s.drones);
  const getEngageableTargets = useDroneStore((s) => s.getEngageableTargets);

  const message = useMemo(() => {
    if (selectedDroneId) return null;
    const center = platform?.position ?? DEFAULT_CENTER;
    const targets = platform ? getEngageableTargets(center.lat, center.lng) : [];
    if (targets.length === 0) {
      return 'Tap Create Targets to spawn test drones, then select one from the map or Priority Targets list.';
    }
    return 'Select a target: tap a drone on the map or choose from the Priority Targets list.';
  }, [selectedDroneId, platform, drones, getEngageableTargets]);

  if (!message) return null;

  return (
    <div
      data-testid="select-target-hint"
      className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[550] pointer-events-none px-4 max-w-md"
    >
      <p className="text-center text-sm text-slate-400 bg-[#0F1929]/90 border border-[#1A3A5C] rounded-lg py-3 px-4">
        {message}
      </p>
    </div>
  );
};
