/**
 * Ammo overlay: top right of map. Turret (minigun) image + ammo count in a row.
 * Depletion at 200 rounds/min (1 round per 300ms). Animate only during firing.
 */
import React, { useEffect, useState, useRef } from 'react';
import { usePlatformStore } from '../../store/platformStore';
import { MINIGUN_STATS } from '../../utils/constants';

import minigunImg from '../../assets/TD3 minigun mock.png';

const MAX_AMMO_DISPLAY = 2000;
/** 200 rounds/min = 1 round every 300ms */
const MS_PER_ROUND = 60000 / MINIGUN_STATS.RATE_OF_FIRE_SHOTS_PER_MIN;

export const AmmoOverlay: React.FC = () => {
  const platform = usePlatformStore((s) => s.platform);
  const ammoCount = platform?.ammoCount ?? 0;
  const [displayAmmo, setDisplayAmmo] = useState(ammoCount);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ammoCountRef = useRef(ammoCount);
  ammoCountRef.current = ammoCount;

  useEffect(() => {
    if (ammoCount > displayAmmo) {
      setDisplayAmmo(ammoCount);
      return;
    }
    if (ammoCount >= displayAmmo) return;

    intervalRef.current = setInterval(() => {
      setDisplayAmmo((prev) => {
        const target = ammoCountRef.current;
        if (prev <= target) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return target;
        }
        return prev - 1;
      });
    }, MS_PER_ROUND);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [ammoCount]);

  const isAnimating = displayAmmo > ammoCount;
  const depletionPct = 1 - Math.min(displayAmmo, MAX_AMMO_DISPLAY) / MAX_AMMO_DISPLAY;
  const displayStr = String(Math.min(displayAmmo, MAX_AMMO_DISPLAY)).padStart(4, '0');

  return (
    <div
      className={`absolute top-4 right-4 z-[600] pointer-events-none flex flex-row items-center gap-2 ${isAnimating ? 'fire-breathe' : ''}`}
      data-testid="ammo-overlay"
    >
      <div className="relative w-24 h-16 flex-shrink-0">
        <img
          src={minigunImg}
          alt="Turret"
          className="w-full h-full object-contain object-center"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#0F1929] to-transparent pointer-events-none transition-opacity duration-300"
          style={{ opacity: depletionPct }}
        />
      </div>
      <span
        className="font-mono font-bold text-lg text-cyan-400 tracking-wider"
        style={{ minWidth: '4ch' }}
      >
        {displayStr}
      </span>
    </div>
  );
};
