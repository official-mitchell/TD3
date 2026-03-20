/**
 * WebSocket hook — Socket.IO connection, event routing to stores, heartbeat lifecycle.
 * Per Implementation Plan 4.2, 4.3, 14.5.3. saveTelemetry writes drone updates to IndexedDB for offline.
 * drones:replace: full replace of drone list (after create/clear), clears selection if needed.
 * drone:destroyed: always append Destroyed to engagement log; addDyingDrone with last recorded position.
 * Position from: (1) drone in store, or (2) payload.position (backend sends last known from DB).
 * Use getState() in handlers to avoid stale closure (drones loaded after socket connects).
 * simulation:rate: updates connectionStore.simulationRate for droneUpdate events/sec monitoring.
 */
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDroneStore } from '../store/droneStore';
import { usePlatformStore } from '../store/platformStore';
import { useTargetStore } from '../store/targetStore';
import { useConnectionStore } from '../store/connectionStore';
import { useEngagementLogStore } from '../store/engagementLogStore';
import { useTracerStore } from '../store/tracerStore';
import type { IDrone, IWeaponPlatform, IEngagementRecord } from '@td3/shared-types';
import { setSocketRef } from '../lib/socketRef';
import { playHitSound, playRichochetSounds } from '../lib/sounds';
import { saveTelemetry } from '../lib/offlineStorage';
import { getApiBaseUrl } from '../utils/constants';

const SOCKET_URL = getApiBaseUrl();

/** Fallback when platform not yet loaded - Ras Laffan default */
const FALLBACK_PLATFORM_POS = { lat: 25.905310475056915, lng: 51.543824178558054 };

const HEARTBEAT_INTERVAL_MS = 5000;
const WATCHDOG_TIMEOUT_MS = 12000;
const RECONNECT_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 10000;

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: RECONNECT_DELAY_MS,
      reconnectionDelayMax: RECONNECT_MAX_DELAY_MS,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    const connectionStore = useConnectionStore.getState();
    const droneStore = useDroneStore.getState();
    const platformStore = usePlatformStore.getState();
    const engagementLogStore = useEngagementLogStore.getState();

    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    let watchdogTimeout: ReturnType<typeof setTimeout> | null = null;

    const clearHeartbeat = () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      if (watchdogTimeout) {
        clearTimeout(watchdogTimeout);
        watchdogTimeout = null;
      }
    };

    const startHeartbeat = () => {
      clearHeartbeat();
      heartbeatInterval = setInterval(() => {
        socket.emit('heartbeat:ping');
        watchdogTimeout = setTimeout(() => {
          connectionStore.setStatus('Degraded');
        }, WATCHDOG_TIMEOUT_MS);
      }, HEARTBEAT_INTERVAL_MS);
    };

    socket.on('connect', () => {
      setSocketRef(socket);
      connectionStore.setStatus('Connected');
      startHeartbeat();
    });

    socket.on('disconnect', () => {
      connectionStore.setStatus('Offline');
      clearHeartbeat();
    });

    socket.on('connect_error', () => {
      connectionStore.setStatus('Degraded');
    });

    socket.on('initialDroneData', (data: { drones: IDrone[] }) => {
      data.drones.forEach((drone) => droneStore.updateDrone(drone));
    });

    socket.on('drones:replace', (data: { drones: IDrone[] }) => {
      droneStore.clearDrones();
      data.drones.forEach((drone) => droneStore.updateDrone(drone));
      const selectedId = useTargetStore.getState().selectedDroneId;
      const ids = new Set(data.drones.map((d) => d.droneId));
      if (selectedId && !ids.has(selectedId)) {
        useTargetStore.getState().setSelected(null);
      }
    });

    socket.on('droneUpdate', (payload: IDrone) => {
      droneStore.updateDrone(payload);
      saveTelemetry(payload).catch(() => {});
    });

    socket.on('drone:update', (payload: IDrone) => {
      droneStore.updateDrone(payload);
      saveTelemetry(payload).catch(() => {});
    });

    socket.on('drone:status', (payload: { droneId: string; status: IDrone['status'] }) => {
      const drone = useDroneStore.getState().drones.get(payload.droneId);
      if (drone) {
        useDroneStore.getState().updateDrone({ ...drone, status: payload.status });
      }
    });

    socket.on('platform:status', (payload: IWeaponPlatform) => {
      platformStore.updatePlatform(payload);
    });

    socket.on('drone:destroyed', (payload: { droneId: string; position?: { lat: number; lng: number; altitude: number }; droneType?: string }) => {
      playHitSound();
      playRichochetSounds();
      const drone = useDroneStore.getState().drones.get(payload.droneId);
      const droneType = drone?.droneType ?? payload.droneType ?? 'Unknown';
      engagementLogStore.appendLog({
        droneId: payload.droneId,
        droneType: droneType as IEngagementRecord['droneType'],
        timestamp: new Date().toISOString(),
        outcome: 'Destroyed',
        distanceAtEngagement: 0,
        hitPointsRemaining: 0,
      });
      const pos = payload.position ?? drone?.position;
      if (!pos || typeof pos.lat !== 'number' || typeof pos.lng !== 'number') return;
      const dyingDrone: IDrone = {
        droneId: payload.droneId,
        droneType: droneType as IDrone['droneType'],
        status: 'Destroyed',
        position: { lat: pos.lat, lng: pos.lng, altitude: pos.altitude ?? 0 },
        speed: 0,
        heading: 0,
        threatLevel: 0,
        lastUpdated: new Date().toISOString(),
      };
      droneStore.addDyingDrone(dyingDrone);
      droneStore.removeDrone(payload.droneId);
      const selectedId = useTargetStore.getState().selectedDroneId;
      if (selectedId === payload.droneId) {
        const platform = platformStore.platform;
        const center = platform?.position ?? { lat: 25.905310475056915, lng: 51.543824178558054 };
        const sortedIds = useDroneStore
          .getState()
          .getEngageableTargets(center.lat, center.lng)
          .map((d) => d.droneId);
        if (sortedIds.length === 0) {
          useTargetStore.getState().setSelected(null);
        } else {
          useTargetStore.getState().nextTarget(sortedIds);
        }
      }
    });

    socket.on('drone:hit', (payload: { droneId: string; timestamp?: string; hitPointsRemaining?: number; landingPosition?: { lat: number; lng: number } }) => {
      playHitSound();
      playRichochetSounds();
      const drone = useDroneStore.getState().drones.get(payload.droneId);
      const record: IEngagementRecord = {
        droneId: payload.droneId,
        droneType: drone?.droneType ?? 'Unknown',
        timestamp: payload.timestamp ?? new Date().toISOString(),
        outcome: 'Hit',
        distanceAtEngagement: 0,
        hitPointsRemaining: payload.hitPointsRemaining,
      };
      engagementLogStore.appendLog(record);
      const plat = usePlatformStore.getState().platform;
      const start = plat?.position ?? FALLBACK_PLATFORM_POS;
      const pos = payload.landingPosition ?? { lat: start.lat, lng: start.lng };
      useTracerStore.getState().addTracer({
        startLat: start.lat,
        startLng: start.lng,
        endLat: pos.lat,
        endLng: pos.lng,
        outcome: 'Hit',
      });
    });

    socket.on('drone:missed', (payload: { droneId: string; timestamp?: string; landingPosition?: { lat: number; lng: number } }) => {
      const drone = useDroneStore.getState().drones.get(payload.droneId);
      const record: IEngagementRecord = {
        droneId: payload.droneId,
        droneType: drone?.droneType ?? 'Unknown',
        timestamp: payload.timestamp ?? new Date().toISOString(),
        outcome: 'Missed',
        distanceAtEngagement: 0,
      };
      engagementLogStore.appendLog(record);
      const plat = usePlatformStore.getState().platform;
      const start = plat?.position ?? FALLBACK_PLATFORM_POS;
      const pos = payload.landingPosition ?? { lat: start.lat, lng: start.lng };
      useTracerStore.getState().addTracer({
        startLat: start.lat,
        startLng: start.lng,
        endLat: pos.lat,
        endLng: pos.lng,
        outcome: 'Missed',
      });
    });

    socket.on('heartbeat:pong', () => {
      if (watchdogTimeout) {
        clearTimeout(watchdogTimeout);
        watchdogTimeout = null;
      }
      connectionStore.recordHeartbeat();
    });

    socket.on('simulation:rate', (payload: { eventsPerSec: number }) => {
      connectionStore.setSimulationRate(payload.eventsPerSec);
    });

    return () => {
      clearHeartbeat();
      setSocketRef(null);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return socketRef;
};
