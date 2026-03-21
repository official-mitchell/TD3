/**
 * Fire button centered at bottom of map. Per Frontend Fixes 695–698.
 * Cmd+Enter (Mac) / Ctrl+Enter (PC). Glowing bg, grow/shrink idle, recoil on press.
 * Ammo count removed from button label. Firing continues until hit (backend 200/min).
 * Left/Right arrow keys switch target (prev/next by distance).
 * D key: instantly destroy selected drone (for testing downing animation).
 * Uses firingDroneIdRef so ENGAGING resets on drone:destroyed even if selectedDroneId changes first.
 * Resets ENGAGING when user changes target (selectedDroneId !== firing target).
 * Resets ENGAGING when target drone status is no longer Engagement Ready or Hit (e.g. reverted to Confirmed).
 * Resets on drone:missed immediately (backend fires ~300ms/round; miss = reset right away).
 * Throttled display updates (150ms) to reduce jitter. Button and description centered with flex.
 * Optimistic tracers: add tracer immediately on fire and every 300ms during burst for instant feedback.
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useDroneStore } from '../../store/droneStore';
import { usePlatformStore } from '../../store/platformStore';
import { useTargetStore } from '../../store/targetStore';
import { useTracerStore } from '../../store/tracerStore';
import { getSocket } from '../../lib/socketRef';
import { log } from '../../lib/logger';
import { playFireSound, playSwivelSound } from '../../lib/sounds';
import { calculateBearing } from '../../utils/calculations';
import { PLATFORM_CONSTANTS } from '../../utils/constants';

/** Engagement cone half-angle (deg). Target must be within ±CONE_HALF_ANGLE of turret heading. */
const CONE_HALF_ANGLE_DEG = 4;

const FALLBACK_PLATFORM_POS = { lat: 25.905310475056915, lng: 51.543824178558054 };

/** Mac: ⌘↵, PC: Ctrl+↵ */
const getFireShortcutLabel = (): string =>
  typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)
    ? '⌘↵'
    : 'Ctrl+↵';

export const MapFireButton: React.FC = () => {
  const drones = useDroneStore((s) => s.drones);
  const platform = usePlatformStore((s) => s.platform);
  const currentTurretHeading = usePlatformStore((s) => s.currentTurretHeading);
  const selectedDroneId = useTargetStore((s) => s.selectedDroneId);
  const nextTarget = useTargetStore((s) => s.nextTarget);
  const prevTarget = useTargetStore((s) => s.prevTarget);
  const [firing, setFiring] = useState(false);
  const [recoiling, setRecoiling] = useState(false);

  const center = platform?.position ?? { lat: 25.905310475056915, lng: 51.543824178558054 };
  const sortedIds = useMemo(
    () => useDroneStore.getState().getEngageableTargets(center.lat, center.lng).map((d) => d.droneId),
    [drones, platform]
  );
  const selectedDrone = selectedDroneId ? drones.get(selectedDroneId) : null;

  const targetInCone = useMemo(() => {
    if (!selectedDrone || !platform?.position) return false;
    const bearing = calculateBearing(platform.position, selectedDrone.position).degrees;
    let diff = Math.abs(bearing - currentTurretHeading);
    if (diff > 180) diff = 360 - diff;
    return diff <= CONE_HALF_ANGLE_DEG;
  }, [selectedDrone, platform?.position, currentTurretHeading]);

  const canFire =
    selectedDrone?.status === 'Engagement Ready' &&
    targetInCone &&
    !firing &&
    (platform?.isActive ?? false) === true;

  const firingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const firingSoundIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const firingDroneIdRef = React.useRef<string | null>(null);

  const addOptimisticTracer = useCallback((droneId: string) => {
    const plat = usePlatformStore.getState().platform;
    const drone = useDroneStore.getState().drones.get(droneId);
    const start = plat?.position ?? FALLBACK_PLATFORM_POS;
    const end = drone?.position ?? start;
    useTracerStore.getState().addTracer({
      startLat: start.lat,
      startLng: start.lng,
      endLat: end.lat,
      endLng: end.lng,
      outcome: 'Hit',
    });
  }, []);

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
    addOptimisticTracer(selectedDroneId);
    log('engagement.fire.emitted', { droneId: selectedDroneId });
    socket.emit('engagement:fire', { droneId: selectedDroneId, timestamp: new Date().toISOString() });
    setTimeout(() => {
      setRecoiling(false);
      usePlatformStore.getState().setTurretRecoiling(false);
    }, 200);
    const ROUND_INTERVAL_MS = 300;
    if (firingSoundIntervalRef.current) clearInterval(firingSoundIntervalRef.current);
    firingSoundIntervalRef.current = setInterval(() => {
      if (firingDroneIdRef.current === selectedDroneId) {
        playFireSound();
        addOptimisticTracer(selectedDroneId);
      }
    }, ROUND_INTERVAL_MS);
    firingTimeoutRef.current = setTimeout(() => {
      if (firingSoundIntervalRef.current) {
        clearInterval(firingSoundIntervalRef.current);
        firingSoundIntervalRef.current = null;
      }
      if (firingDroneIdRef.current === selectedDroneId) {
        firingDroneIdRef.current = null;
        setFiring(false);
      }
    }, 2000);
  }, [canFire, selectedDroneId, addOptimisticTracer]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const stopFiring = () => {
      if (firingTimeoutRef.current) clearTimeout(firingTimeoutRef.current);
      if (firingSoundIntervalRef.current) {
        clearInterval(firingSoundIntervalRef.current);
        firingSoundIntervalRef.current = null;
      }
      firingDroneIdRef.current = null;
      setFiring(false);
    };
    const onDestroyed = (payload: { droneId: string }) => {
      if (payload.droneId === firingDroneIdRef.current) stopFiring();
    };
    const onMissed = (payload: { droneId: string }) => {
      if (payload.droneId === firingDroneIdRef.current) stopFiring();
    };
    socket.on('drone:destroyed', onDestroyed);
    socket.on('drone:missed', onMissed);
    return () => {
      socket.off('drone:destroyed', onDestroyed);
      socket.off('drone:missed', onMissed);
      if (firingTimeoutRef.current) clearTimeout(firingTimeoutRef.current);
      if (firingSoundIntervalRef.current) clearInterval(firingSoundIntervalRef.current);
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

      if (e.key === 'd' || e.key === 'D') {
        if (selectedDroneId && selectedDrone) {
          e.preventDefault();
          const socket = getSocket();
          if (socket) {
            socket.emit('engagement:destroy', {
              droneId: selectedDroneId,
              position: selectedDrone.position,
            });
          }
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
  }, [handleFire, sortedIds, nextTarget, prevTarget, selectedDroneId, selectedDrone]);

  const shortcut = getFireShortcutLabel();
  const buttonLabel = firing ? 'Firing' : canFire ? `FIRE ${shortcut}` : `NO TARGET ${shortcut}`;

  const noFireReason =
    !canFire && !firing && selectedDroneId
      ? !(platform?.isActive ?? false)
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
            : selectedDrone && selectedDrone.status === 'Engagement Ready' && !targetInCone
              ? 'Align turret to target'
              : null
      : null;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-[600] pointer-events-none flex flex-col items-center justify-end pb-10 sm:pb-2"
      data-testid="map-fire-button"
    >
      <button
        onClick={handleFire}
        disabled={!canFire || firing}
        className={`
          pointer-events-auto
          px-6 py-3 rounded-lg font-bold text-base min-w-[140px] transition-transform duration-75
            ${canFire && !firing ? 'fire-pulse' : ''}
            ${recoiling ? 'fire-recoil' : !firing ? 'fire-breathe' : ''}
            ${firing ? 'fire-firing bg-amber-600 text-white cursor-not-allowed' : ''}
            ${canFire && !firing ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
            ${!canFire && !firing ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : ''}
          `}
        >
          {buttonLabel}
        </button>
      {noFireReason && (
        <div className="text-center text-[10px] text-slate-500 whitespace-nowrap pointer-events-none mt-1">
          {noFireReason}
        </div>
      )}
    </div>
  );
};

/* --- Changelog ---
 * 2025-03-19: Add optimistic tracers on fire and every 300ms during burst for instant feedback (fixes tracer lag).
 * 2025-03-20: Mobile: increase bottom padding (pb-10) so fire button stays in viewport.
 * 2025-03-20: Remove "Select a target from the list" from noFireReason; SelectTargetHint shows instead.
 */
