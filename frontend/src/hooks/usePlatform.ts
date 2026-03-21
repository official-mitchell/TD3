/**
 * usePlatform — platform state, turret heading, engagement. Uses platformStore, targetStore.
 */
import { useCallback, useEffect, useState } from 'react';
import { usePlatformStore } from '../store/platformStore';
import { useTargetStore } from '../store/targetStore';
import { useDroneStore } from '../store/droneStore';
import { calculateBearing } from '../utils/calculations';
import { error as logError } from '../lib/logger';

type TurretStatus = 'IDLE' | 'TARGETING' | 'FIRING';

export const usePlatform = () => {
  const platform = usePlatformStore((state) => state.platform);
  const updatePlatform = usePlatformStore((state) => state.updatePlatform);
  const selectedDroneId = useTargetStore((state) => state.selectedDroneId);
  const setSelected = useTargetStore((state) => state.setSelected);
  const drones = useDroneStore((state) => state.drones);

  const [turretStatus, setTurretStatus] = useState<TurretStatus>('IDLE');

  useEffect(() => {
    const initPlatform = async () => {
      try {
        const response = await fetch('http://localhost:3333/api/platform/test');
        const data = await response.json();
        if (data.platform) {
          updatePlatform(data.platform);
        }
      } catch (error) {
        logError('platform.init.failed', { error: (error as Error).message });
      }
    };
    initPlatform();
  }, [updatePlatform]);

  const updateHeading = useCallback(
    (heading: number) => {
      if (platform) {
        updatePlatform({ ...platform, heading });
      }
    },
    [platform, updatePlatform]
  );

  const animateHeading = useCallback(
    (newHeading: number) => {
      if (!platform) return;
      const currentHeading = platform.heading;
      const duration = 1000;
      const startTime = Date.now();
      const delta = ((newHeading - currentHeading + 540) % 360) - 180;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        if (progress < 1) {
          updateHeading(currentHeading + delta * progress);
          requestAnimationFrame(animate);
        } else {
          updateHeading(newHeading);
        }
      };
      requestAnimationFrame(animate);
    },
    [platform, updateHeading]
  );

  const updateTurretHeading = useCallback(
    (targetDroneId: string | null) => {
      const targetDrone = targetDroneId ? drones.get(targetDroneId) : null;
      if (targetDrone && platform) {
        const bearing = calculateBearing(platform.position, targetDrone.position);
        animateHeading(bearing.degrees);
        setSelected(targetDroneId);
      } else {
        setSelected(null);
      }
    },
    [platform, drones, setSelected, animateHeading]
  );

  useEffect(() => {
    if (turretStatus === 'IDLE') {
      const trackHighestThreat = setInterval(() => {
        const highestThreatDrone = Array.from(drones.values())
          .filter((d) => !['Destroyed', 'Hit'].includes(d.status))
          .sort((a, b) => b.threatLevel - a.threatLevel)[0];
        if (highestThreatDrone) {
          updateTurretHeading(highestThreatDrone.droneId);
        }
      }, 2000);
      return () => clearInterval(trackHighestThreat);
    }
    return () => {};
  }, [turretStatus, drones, updateTurretHeading]);

  const engageTarget = useCallback(
    async (targetDroneId: string) => {
      const targetDrone = drones.get(targetDroneId);
      if (!targetDrone) return;

      setTurretStatus('TARGETING');
      updateTurretHeading(targetDroneId);
      await new Promise((r) => setTimeout(r, 1000));

      setTurretStatus('FIRING');
      await new Promise((r) => setTimeout(r, 500));

      // TODO: Emit engagement:fire via socket when Step 4 is implemented
      try {
        await fetch(`http://localhost:3333/api/drones/${targetDroneId}/hit`, {
          method: 'POST',
        });
      } catch {
        // POST /hit removed in Phase 2.1; engagement:fire via socket pending
      }

      await new Promise((r) => setTimeout(r, 1000));
      setTurretStatus('IDLE');
      setSelected(null);
      updateTurretHeading(null);
    },
    [drones, updateTurretHeading, setSelected]
  );

  return {
    platform,
    turretStatus,
    currentTarget: selectedDroneId,
    updateTurretHeading,
    engageTarget,
    isReady: turretStatus === 'IDLE',
    isTargeting: turretStatus === 'TARGETING',
    isFiring: turretStatus === 'FIRING',
  };
};

export const useTurretRotation = () => {
  const { platform, updateTurretHeading } = usePlatform();
  return {
    heading: platform?.heading ?? 0,
    updateHeading: updateTurretHeading,
  };
};

export const useEngagement = () => {
  const { turretStatus, currentTarget, engageTarget } = usePlatform();
  return {
    turretStatus,
    currentTarget,
    engageTarget,
    isEngaging: turretStatus !== 'IDLE',
  };
};
