/**
 * XM914E1 weapon platform marker. IFV base + turret on top, rotates to face selected target.
 * Swivel: 8+ seconds for 360° rotation. Turret image rotated +15° to align barrel with heading.
 * Recoil: subtle opposite-heading x/y translation on fire. Uses ref + requestAnimationFrame.
 */
import React, { useMemo, useRef, useEffect } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { useUIStore } from '../../store/uiStore';
import { usePlatformStore } from '../../store/platformStore';
import { calculateBearing } from '../../utils/calculations';
import { TURRET_SWIVEL_MS_PER_360 } from '../../utils/constants';
import type { IWeaponPlatform } from '@td3/shared-types';
import type { IDrone } from '@td3/shared-types';

import ifvImg from '../../assets/TD3 IFV.png';
import turretImg from '../../assets/TD3 turret.png';

const BASE_SIZE = 48;
const TURRET_SELECTOR = '.td3-turret-img';
/** Barrel alignment: image needs +22.5° clockwise to align with heading */
const TURRET_IMAGE_OFFSET_DEG = 22.5;

/** Normalize angle delta to shortest path (-180 to 180) */
function shortestAngle(from: number, to: number): number {
  let d = (to - from + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

/** Recoil magnitude in px, opposite to barrel direction */
const RECOIL_PX = 4;

export const PlatformMarker: React.FC<{
  platform: IWeaponPlatform;
  targetDrone?: IDrone | null;
}> = ({ platform, targetDrone }) => {
  const weaponSize = useUIStore((s) => s.weaponSize);
  const size = Math.round(BASE_SIZE * weaponSize);
  const currentRef = useRef(platform.heading);
  const rafRef = useRef<number | null>(null);
  const turretRecoiling = usePlatformStore((s) => s.turretRecoiling);

  const targetHeading = useMemo(() => {
    if (targetDrone) {
      const { degrees } = calculateBearing(platform.position, targetDrone.position);
      return degrees;
    }
    return currentRef.current;
  }, [platform, targetDrone]);

  const icon = useMemo(
    () =>
      L.divIcon({
        className: 'td3-platform-marker',
        html: `
          <div style="position: relative; width: ${size}px; height: ${size}px; cursor: default;">
            <img src="${ifvImg}" alt="IFV" style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; object-fit: contain;" />
            <img class="td3-turret-img" src="${turretImg}" alt="Turret" style="
              position: absolute; left: 0; top: 0; width: 100%; height: 100%;
              object-fit: contain; transform: rotate(${currentRef.current + TURRET_IMAGE_OFFSET_DEG}deg);
              transform-origin: center center;
            " />
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      }),
    [size]
  );

  const setTurretHeading = usePlatformStore((s) => s.setTurretHeading);

  useEffect(() => {
    setTurretHeading(currentRef.current);
  }, [setTurretHeading]);

  useEffect(() => {
    if (!targetDrone) return;
    let retries = 0;
    const findAndAnimate = () => {
      const el = document.querySelector(TURRET_SELECTOR) as HTMLImageElement | null;
      if (!el && retries++ < 60) {
        requestAnimationFrame(findAndAnimate);
        return;
      }
      if (!el) return;

      const from = currentRef.current;
      const delta = shortestAngle(from, targetHeading);
      if (Math.abs(delta) < 0.5) {
        currentRef.current = targetHeading;
        setTurretHeading(targetHeading);
        return;
      }

      const minDuration = 800;
      const duration = Math.max(minDuration, (Math.abs(delta) / 360) * TURRET_SWIVEL_MS_PER_360);
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        const eased = 1 - Math.pow(1 - t, 1.5);
        const current = from + delta * eased;
        currentRef.current = (current + 360) % 360;
        setTurretHeading(currentRef.current);
        el.style.transform = `rotate(${currentRef.current + TURRET_IMAGE_OFFSET_DEG}deg)`;
        if (t < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          currentRef.current = targetHeading;
          setTurretHeading(targetHeading);
        }
      };
      rafRef.current = requestAnimationFrame(animate);
    };
    requestAnimationFrame(findAndAnimate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [targetHeading, targetDrone, setTurretHeading]);

  useEffect(() => {
    if (!turretRecoiling) return;
    const el = document.querySelector(TURRET_SELECTOR) as HTMLImageElement | null;
    if (!el) return;
    const heading = currentRef.current + TURRET_IMAGE_OFFSET_DEG;
    const rad = ((heading + 180) * Math.PI) / 180;
    const tx = RECOIL_PX * Math.cos(rad);
    const ty = RECOIL_PX * Math.sin(rad);
    const baseRotate = `rotate(${currentRef.current + TURRET_IMAGE_OFFSET_DEG}deg)`;
    el.style.transform = `${baseRotate} translate(${tx}px, ${ty}px)`;
    const t = setTimeout(() => {
      el.style.transform = baseRotate;
    }, 180);
    return () => clearTimeout(t);
  }, [turretRecoiling]);

  const pos: [number, number] = [platform.position.lat, platform.position.lng];
  return <Marker position={pos} icon={icon} />;
};
