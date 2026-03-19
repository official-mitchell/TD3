/**
 * useDrones — uses droneStore.getEngageableTargets and targetStore for selection.
 */
import { useCallback } from 'react';
import { useDroneStore } from '../store/droneStore';
import { useTargetStore } from '../store/targetStore';
import { usePlatformStore } from '../store/platformStore';

export const useDrones = () => {
  const drones = useDroneStore((state) => state.drones);
  const getEngageableTargets = useDroneStore((state) => state.getEngageableTargets);
  const selectedDroneId = useTargetStore((state) => state.selectedDroneId);
  const setSelected = useTargetStore((state) => state.setSelected);
  const platform = usePlatformStore((state) => state.platform);

  const getTargetableDrones = useCallback(() => {
    if (!platform) return [];
    return getEngageableTargets(platform.position.lat, platform.position.lng);
  }, [platform, getEngageableTargets]);

  const toggleTarget = useCallback(
    (droneId: string) => {
      setSelected(selectedDroneId === droneId ? null : droneId);
    },
    [selectedDroneId, setSelected]
  );

  return {
    drones,
    selectedDroneId,
    getTargetableDrones,
    toggleTarget,
    hasSelectedTarget: selectedDroneId !== null,
  };
};
