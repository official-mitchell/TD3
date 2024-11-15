import { useCallback } from 'react';
import { useDroneStore } from '../store/droneStore';
import { calculateDistance } from '../utils/calculations';
import { usePlatformStore } from '../store/platformStore';

export const useDrones = () => {
  const { drones, selectedTargets } = useDroneStore();
  const { actions } = useDroneStore();
  const platformPosition = usePlatformStore((state) => state.platform.position);

  const EFFECTIVE_RANGE = 2000; // 2km range

  // Get drones within engagement range
  const getTargetableDrones = useCallback(() => {
    return Array.from(drones.values())
      .filter((drone) => {
        const distance = calculateDistance(drone.position, platformPosition);
        return (
          distance <= EFFECTIVE_RANGE &&
          !['Destroyed', 'Hit'].includes(drone.status)
        );
      })
      .sort((a, b) => b.threatLevel - a.threatLevel);
  }, [drones, platformPosition]);

  // Handle target selection
  const toggleTarget = useCallback(
    (droneId: string) => {
      actions.selectTarget(droneId);
    },
    [actions]
  );

  return {
    drones,
    selectedTargets,
    getTargetableDrones,
    toggleTarget,
    hasSelectedTargets: selectedTargets.size > 0,
  };
};
