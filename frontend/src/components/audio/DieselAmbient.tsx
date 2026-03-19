/**
 * Diesel idle ambient. Loops when platform is active. Per Frontend Fix 699.
 */
import React, { useEffect } from 'react';
import { usePlatformStore } from '../../store/platformStore';
import { useUIStore } from '../../store/uiStore';
import { playDieselIdle, stopDieselIdle, setDieselVolume } from '../../lib/sounds';

export const DieselAmbient: React.FC = () => {
  const platform = usePlatformStore((s) => s.platform);
  const soundVolume = useUIStore((s) => s.soundVolume);

  useEffect(() => {
    if (platform?.isActive) {
      playDieselIdle();
    } else {
      stopDieselIdle();
    }
    return () => stopDieselIdle();
  }, [platform?.isActive]);

  useEffect(() => {
    setDieselVolume(soundVolume);
  }, [soundVolume]);

  return null;
};
