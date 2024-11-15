import { useCallback, useEffect } from 'react';
import { usePlatformStore, usePlatformActions } from '../store/platformStore';
import { useDroneStore } from '../store/droneStore';
import { calculateBearing } from '../utils/calculations';
// import { Platform, Position } from '../types';

export const usePlatform = () => {
  // State Access - Get required state from our stores
  const {
    platform, // Current platform state (position, heading, etc.)
    turretStatus, // Current turret status (IDLE, TARGETING, FIRING)
    currentTarget, // Currently targeted drone ID
  } = usePlatformStore();

  // Get actions to modify platform state
  const { updatePlatform, setTurretStatus, setCurrentTarget, updateHeading } =
    usePlatformActions();

  // Get drone data from drone store
  const drones = useDroneStore((state) => state.drones);

  // Platform Initialization, fetch initial platform data
  useEffect(() => {
    // Fetch initial platform data from backend
    const initPlatform = async () => {
      try {
        const response = await fetch('http://localhost:3333/api/platform/test');
        const data = await response.json();
        if (data.platform) {
          updatePlatform(data.platform);
        }
      } catch (error) {
        console.error('Failed to initialize platform:', error);
      }
    };

    initPlatform();
  }, [updatePlatform]);

  // Auto-track highest threat target when idle
  useEffect(() => {
    if (turretStatus === 'IDLE') {
      const trackHighestThreat = setInterval(() => {
        // Find highest threat drone that isn't destroyed/hit
        const highestThreatDrone = Array.from(drones.values())
          .filter(
            (drone) => drone.status !== 'Destroyed' && drone.status !== 'Hit'
          )
          .sort((a, b) => b.threatLevel - a.threatLevel)[0];

        if (highestThreatDrone) {
          updateTurretHeading(highestThreatDrone.droneId);
        }
      }, 2000);

      // Cleanup interval on unmount or status change
      return () => clearInterval(trackHighestThreat);
    }
    return () => {};
  }, [turretStatus, drones]);

  // Handle turret rotation animation and updates
  const updateTurretHeading = useCallback(
    (targetDroneId: string | null) => {
      const targetDrone = targetDroneId ? drones.get(targetDroneId) : null;

      if (targetDrone && platform) {
        // Calculate bearing to target
        const bearing = calculateBearing(
          platform.position,
          targetDrone.position
        );
        animateHeading(bearing.degrees);
        setCurrentTarget(targetDroneId);
      }
    },
    [platform, drones, setCurrentTarget]
  );

  // Heading Animation System
  const animateHeading = useCallback(
    (newHeading: number) => {
      const currentHeading = platform.heading;
      const duration = 1000; // 1 second rotation
      const startTime = Date.now();

      // Calculate shortest rotation direction
      let delta = ((newHeading - currentHeading + 540) % 360) - 180;

      // Animation frame loop
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        if (progress < 1) {
          const currentRotation = currentHeading + delta * progress;
          updateHeading(currentRotation);
          requestAnimationFrame(animate);
        } else {
          updateHeading(newHeading);
        }
      };

      requestAnimationFrame(animate);
    },
    [platform.heading, updateHeading]
  );

  // Engage target sequence
  const engageTarget = useCallback(
    async (targetDroneId: string) => {
      const targetDrone = drones.get(targetDroneId);
      if (!targetDrone) return;

      // Engagement sequence
      // Step 1: Target acquisition
      setTurretStatus('TARGETING');
      updateTurretHeading(targetDroneId);
      await new Promise((r) => setTimeout(r, 1000));

      // Step 2: Firing sequence
      setTurretStatus('FIRING');
      await new Promise((r) => setTimeout(r, 500));

      // Step 3: Hit confirmation
      try {
        await fetch(`http://localhost:3333/api/drones/${targetDroneId}/hit`, {
          method: 'POST',
        });
        console.log(`Hit confirmed on ${targetDroneId}`);
      } catch (error) {
        console.error(`Failed to engage ${targetDroneId}:`, error);
      }

      // Step 4: Cleanup, reset to idle state
      await new Promise((r) => setTimeout(r, 1000));
      setTurretStatus('IDLE');
      setCurrentTarget(null);
      updateTurretHeading(null);
    },
    [drones, setTurretStatus, setCurrentTarget, updateTurretHeading]
  );

  // Return platform state and actions
  return {
    // Direct state access
    platform,
    turretStatus,
    currentTarget,

    // Actions to modify state
    updateTurretHeading,
    engageTarget,

    // Computed properties
    isReady: turretStatus === 'IDLE',
    isTargeting: turretStatus === 'TARGETING',
    isFiring: turretStatus === 'FIRING',
  };
};

// Specialized Sub-Hooks
// Smaller Hook for just rotation functionality
export const useTurretRotation = () => {
  const { platform, updateTurretHeading } = usePlatform();
  return {
    heading: platform.heading,
    updateHeading: updateTurretHeading,
  };
};

// Hook for just engagement functionality
export const useEngagement = () => {
  const { turretStatus, currentTarget, engageTarget } = usePlatform();
  return {
    turretStatus,
    currentTarget,
    engageTarget,
    isEngaging: turretStatus !== 'IDLE',
  };
};
