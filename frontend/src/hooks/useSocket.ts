/**
 * WebSocket hook — Socket.IO connection, event routing to stores, heartbeat lifecycle.
 * Per Implementation Plan 4.2, 4.3, 14.5.3, 18.3.2. saveTelemetry writes drone updates to IndexedDB for offline.
 * Phase 18.3.2: log socket.connected, socket.disconnected, socket.reconnecting, engagement.result, pwa.offline, pwa.restored.
 * Per Implementation Plan Presentation 2.4: debugStore recordEvent, setSocketMeta, recordHeartbeat, setPendingFire, setLastOutcome.
 */
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDroneStore } from '../store/droneStore';
import { log } from '../lib/logger';
import { usePlatformStore } from '../store/platformStore';
import { useTargetStore } from '../store/targetStore';
import { useConnectionStore } from '../store/connectionStore';
import { useEngagementLogStore } from '../store/engagementLogStore';
import { useTracerStore } from '../store/tracerStore';
import { useDebugStore } from '../store/debugStore';
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
  const prevStatusRef = useRef<string>('Offline');

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
    const debugStore = useDebugStore.getState();

    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    let watchdogTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastPingAt = 0;

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
        lastPingAt = Date.now();
        socket.emit('heartbeat:ping');
        watchdogTimeout = setTimeout(() => {
          connectionStore.setStatus('Degraded');
        }, WATCHDOG_TIMEOUT_MS);
      }, HEARTBEAT_INTERVAL_MS);
    };

    socket.on('connect', () => {
      log('socket.connected');
      if (prevStatusRef.current === 'Offline') {
        log('pwa.restored');
      }
      prevStatusRef.current = 'Connected';
      setSocketRef(socket);
      connectionStore.setStatus('Connected');
      debugStore.setSocketMeta(socket.id ?? '', 0);
      startHeartbeat();
    });

    socket.on('disconnect', (reason) => {
      log('socket.disconnected', { reason });
      prevStatusRef.current = 'Offline';
      connectionStore.setStatus('Offline');
      log('pwa.offline');
      clearHeartbeat();
    });

    socket.on('reconnect_attempt', (attempt: number) => {
      log('socket.reconnecting', { attempt });
      connectionStore.incrementReconnect();
      debugStore.recordEvent('reconnect_attempt', { attempt });
      debugStore.setSocketMeta(socket.id ?? 'reconnecting', useConnectionStore.getState().reconnectAttempts);
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
      debugStore.recordEvent('droneUpdate', payload);
      droneStore.updateDrone(payload);
      saveTelemetry(payload).catch(() => {});
    });

    socket.on('drone:update', (payload: IDrone) => {
      debugStore.recordEvent('drone:update', payload);
      droneStore.updateDrone(payload);
      saveTelemetry(payload).catch(() => {});
    });

    socket.on('drone:status', (payload: { droneId: string; status: IDrone['status'] }) => {
      debugStore.recordEvent('drone:status', payload);
      const drone = useDroneStore.getState().drones.get(payload.droneId);
      if (drone) {
        useDroneStore.getState().updateDrone({ ...drone, status: payload.status });
      }
    });

    socket.on('platform:status', (payload: IWeaponPlatform) => {
      debugStore.recordEvent('platform:status', payload);
      platformStore.updatePlatform(payload);
    });

    socket.on('drone:destroyed', (payload: { droneId: string; position?: { lat: number; lng: number; altitude: number }; droneType?: string }) => {
      debugStore.recordEvent('drone:destroyed', payload);
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
        useTargetStore.getState().resetToAuto();
      }
    });

    socket.on('drone:hit', (payload: { droneId: string; timestamp?: string; hitPointsRemaining?: number; landingPosition?: { lat: number; lng: number } }) => {
      debugStore.recordEvent('drone:hit', payload);
      debugStore.setPendingFire(false);
      debugStore.setLastOutcome('Hit');
      log('engagement.result', { outcome: 'Hit', droneId: payload.droneId });
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
      log('engagement.result', { outcome: 'Missed', droneId: payload.droneId });
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
      const latency = lastPingAt > 0 ? Date.now() - lastPingAt : 0;
      connectionStore.recordHeartbeat();
      connectionStore.recordLatency(latency);
      debugStore.recordHeartbeat(latency);
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
