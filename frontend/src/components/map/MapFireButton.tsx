/**
 * Fire button centered at bottom of map. Per Frontend Fixes 695–698.
 * Cmd+Enter (Mac) / Ctrl+Enter (PC). Glowing bg, grow/shrink idle, recoil on press.
 * Ammo count removed from button label. Firing continues until hit (backend 200/min).
 * Left/Right arrow keys switch target (prev/next by distance).
 * Uses firingDroneIdRef so ENGAGING resets on drone:destroyed even if selectedDroneId changes first.
 * Resets ENGAGING when user changes target (selectedDroneId !== firing target).
 * Resets ENGAGING when target drone status is no longer Engagement Ready or Hit (e.g. reverted to Confirmed).
 * Resets on drone:missed immediately (backend fires ~300ms/round; miss = reset right away).
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { useTargetStore } from '../../store/targetStore';
import { getSocket } from '../../lib/socketRef';
import { playFireSound, playSwivelSound } from '../../lib/sounds';
import { PLATFORM_CONSTANTS, TURRET_SWIVEL_MS_PER_360 } from '../../utils/constants';
import { calculateBearing, calculateElevationAngle } from '../../utils/calculations';

/** Mac: ⌘↵, PC: Ctrl+↵ */
const getFireShortcutLabel = (): string =>
  typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)
    ? '⌘↵'
    : 'Ctrl+↵';

export const MapFireButton: React.FC = () => {
  const drones = useDroneStore((s) => s.drones);
  const platform = usePlatformStore((s) => s.platform);
  const selectedDroneId = useTargetStore((s) => s.selectedDroneId);
  const nextTarget = useTargetStore((s) => s.nextTarget);
  const prevTarget = useTargetStore((s) => s.prevTarget);
  const [firing, setFiring] = useState(false);
  const [recoiling, setRecoiling] = useState(false);
  const [barrelHeightReady, setBarrelHeightReady] = useState(false);
  const barrelHeightTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const center = platform?.position ?? { lat: 25.905310475056915, lng: 51.543824178558054 };
  const sortedIds = useMemo(
    () => useDroneStore.getState().getEngageableTargets(center.lat, center.lng).map((d) => d.droneId),
    [drones, platform]
  );
  const selectedDrone = selectedDroneId ? drones.get(selectedDroneId) : null;
  const currentTurretHeading = usePlatformStore((s) => s.currentTurretHeading);

  const targetBearing = useMemo(() => {
    if (!platform || !selectedDrone) return null;
    const { degrees } = calculateBearing(platform.position, selectedDrone.position);
    return degrees;
  }, [platform, selectedDrone]);

  const turretAligned = (() => {
    if (targetBearing == null) return true;
    let d = (currentTurretHeading - targetBearing + 360) % 360;
    if (d > 180) d -= 360;
    return Math.abs(d) < 2;
  })();

  const elevationAngle = useMemo(() => {
    if (!platform || !selectedDrone) return 0;
    return calculateElevationAngle(platform.position, selectedDrone.position);
  }, [platform, selectedDrone]);

  useEffect(() => {
    if (barrelHeightTimerRef.current) clearTimeout(barrelHeightTimerRef.current);
    barrelHeightTimerRef.current = null;
    setBarrelHeightReady(false);

    if (!selectedDrone || !turretAligned || !platform) return;

    const delayMs = Math.max(400, (Math.abs(elevationAngle) / 360) * TURRET_SWIVEL_MS_PER_360);
    barrelHeightTimerRef.current = setTimeout(() => {
      barrelHeightTimerRef.current = null;
      setBarrelHeightReady(true);
    }, delayMs);

    return () => {
      if (barrelHeightTimerRef.current) clearTimeout(barrelHeightTimerRef.current);
    };
  }, [selectedDroneId, turretAligned, platform]);

  const canFire =
    selectedDrone?.status === 'Engagement Ready' &&
    !firing &&
    turretAligned &&
    barrelHeightReady &&
    (platform?.isActive ?? false) === true;

  const firingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const firingDroneIdRef = React.useRef<string | null>(null);

  const handleFire = useCallback(() => {
    if (!canFire || !selectedDroneId) return;
    const socket = getSocket();
    if (!socket) return;
    if (firingTimeoutRef.current) clearTimeout(firingTimeoutRef.current);
    firingDroneIdRef.current = selectedDroneId;
    setFiring(true);
    setRecoiling(true);
    usePlatformStore.getState().setTurretRecoiling(true);
    playFireSound();
    socket.emit('engagement:fire', { droneId: selectedDroneId, timestamp: new Date().toISOString() });
    setTimeout(() => {
      setRecoiling(false);
      usePlatformStore.getState().setTurretRecoiling(false);
    }, 180);
    const fireSoundReplayRef = setTimeout(() => {
      if (firingDroneIdRef.current === selectedDroneId) playFireSound();
    }, 1000);
    firingTimeoutRef.current = setTimeout(() => {
      clearTimeout(fireSoundReplayRef);
      if (firingDroneIdRef.current === selectedDroneId) {
        firingDroneIdRef.current = null;
        setFiring(false);
      }
    }, 2000);
  }, [canFire, selectedDroneId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onDestroyed = (payload: { droneId: string }) => {
      if (payload.droneId === firingDroneIdRef.current) {
        if (firingTimeoutRef.current) clearTimeout(firingTimeoutRef.current);
        firingDroneIdRef.current = null;
        setFiring(false);
      }
    };
    const onMissed = (payload: { droneId: string }) => {
      if (payload.droneId === firingDroneIdRef.current) {
        if (firingTimeoutRef.current) clearTimeout(firingTimeoutRef.current);
        firingDroneIdRef.current = null;
        setFiring(false);
      }
    };
    socket.on('drone:destroyed', onDestroyed);
    socket.on('drone:missed', onMissed);
    return () => {
      socket.off('drone:destroyed', onDestroyed);
      socket.off('drone:missed', onMissed);
      if (firingTimeoutRef.current) clearTimeout(firingTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (firingDroneIdRef.current != null && selectedDroneId !== firingDroneIdRef.current) {
      if (firingTimeoutRef.current) clearTimeout(firingTimeoutRef.current);
      firingDroneIdRef.current = null;
      setFiring(false);
    }
  }, [selectedDroneId]);

  useEffect(() => {
    if (!firing || firingDroneIdRef.current == null) return;
    const targetDrone = firingDroneIdRef.current === selectedDroneId ? selectedDrone : drones.get(firingDroneIdRef.current);
    const status = targetDrone?.status;
    if (status !== 'Engagement Ready' && status !== 'Hit') {
      if (firingTimeoutRef.current) clearTimeout(firingTimeoutRef.current);
      firingDroneIdRef.current = null;
      setFiring(false);
    }
  }, [firing, selectedDroneId, selectedDrone, drones]);


  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowLeft') {
        if (sortedIds.length > 0) {
          e.preventDefault();
          playSwivelSound();
          prevTarget(sortedIds);
        }
        return;
      }
      if (e.key === 'ArrowRight') {
        if (sortedIds.length > 0) {
          e.preventDefault();
          playSwivelSound();
          nextTarget(sortedIds);
        }
        return;
      }

      if (e.key !== 'Enter') return;
      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;
      e.preventDefault();
      handleFire();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleFire, sortedIds, nextTarget, prevTarget]);

  const shortcut = getFireShortcutLabel();
  const buttonLabel = firing
    ? 'Firing'
    : canFire
      ? `FIRE ${shortcut}`
      : selectedDrone && selectedDrone.status === 'Engagement Ready' && platform?.isActive
        ? !turretAligned
          ? 'Rotating…'
          : !barrelHeightReady
            ? 'Adjusting Barrel Height…'
            : `NO TARGET ${shortcut}`
        : `NO TARGET ${shortcut}`;

  const noFireReason =
    !canFire && !firing
      ? !selectedDroneId
        ? 'Turret heading or altitude does not match selected drone target'
        : !(platform?.isActive ?? false)
          ? 'Platform offline'
          : selectedDrone && selectedDrone.status !== 'Engagement Ready'
            ? (() => {
                const altTooHigh =
                  selectedDrone.position.altitude > PLATFORM_CONSTANTS.MAX_ENGAGEMENT_ALTITUDE_M;
                const isFriendly =
                  'isFriendly' in selectedDrone && (selectedDrone as { isFriendly?: boolean }).isFriendly;
                const reasons: string[] = [];
                if (altTooHigh) reasons.push('Altitude too high');
                if (isFriendly) reasons.push('Friendly drone');
                return reasons.length > 0 ? reasons.join(' · ') : 'Target must be Engagement Ready';
              })()
            : selectedDrone && !turretAligned
              ? 'Turret rotating to target'
              : selectedDrone && !barrelHeightReady
                ? 'Adjusting barrel height'
                : null
      : null;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-[600] pointer-events-none"
      data-testid="map-fire-button"
    >
      <button
        onClick={handleFire}
        disabled={!canFire || firing}
        className={`
          absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto
          px-6 py-3 rounded-lg font-bold text-base min-w-[140px] transition-transform duration-75
            ${canFire && !firing ? 'fire-pulse' : ''}
            ${recoiling ? 'fire-recoil' : 'fire-breathe'}
            ${firing ? 'bg-amber-600 text-white cursor-not-allowed' : ''}
            ${canFire && !firing ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
            ${!canFire && !firing ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : ''}
          `}
        >
          {buttonLabel}
        </button>
      {noFireReason && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center text-[10px] text-slate-500 whitespace-nowrap pointer-events-none">
          {noFireReason}
        </div>
      )}
    </div>
  );
};
