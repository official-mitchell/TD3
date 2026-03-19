/**
 * WebSocket hook — Socket.IO connection, event routing to stores, heartbeat lifecycle.
 * Per Implementation Plan 4.2, 4.3. Step 14 saveTelemetry stubbed until offline storage exists.
 * drones:replace: full replace of drone list (after create/clear), clears selection if needed.
 */
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDroneStore } from '../store/droneStore';
import { usePlatformStore } from '../store/platformStore';
import { useTargetStore } from '../store/targetStore';
import { useConnectionStore } from '../store/connectionStore';
import { useEngagementLogStore } from '../store/engagementLogStore';
import type { IDrone, IWeaponPlatform, IEngagementRecord } from '@td3/shared-types';
import { setSocketRef } from '../lib/socketRef';
import { playHitSound, playRichochetSounds } from '../lib/sounds';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3333';

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
      // TODO Step 14: saveTelemetry(payload) when offline storage exists
    });

    socket.on('drone:update', (payload: IDrone) => {
      droneStore.updateDrone(payload);
      // TODO Step 14: saveTelemetry(payload) when offline storage exists
    });

    socket.on('platform:status', (payload: IWeaponPlatform) => {
      platformStore.updatePlatform(payload);
    });

    socket.on('drone:destroyed', (payload: { droneId: string }) => {
      playHitSound();
      playRichochetSounds();
      const drone = droneStore.drones.get(payload.droneId);
      if (drone) {
        engagementLogStore.appendLog({
          droneId: payload.droneId,
          droneType: drone.droneType,
          timestamp: new Date().toISOString(),
          outcome: 'Destroyed',
          distanceAtEngagement: 0,
          hitPointsRemaining: 0,
        });
        droneStore.addDyingDrone(drone);
      }
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

    socket.on('drone:hit', (payload: { droneId: string; timestamp?: string; hitPointsRemaining?: number }) => {
      playHitSound();
      playRichochetSounds();
      const drone = droneStore.drones.get(payload.droneId);
      const record: IEngagementRecord = {
        droneId: payload.droneId,
        droneType: drone?.droneType ?? 'Unknown',
        timestamp: payload.timestamp ?? new Date().toISOString(),
        outcome: 'Hit',
        distanceAtEngagement: 0,
        hitPointsRemaining: payload.hitPointsRemaining,
      };
      engagementLogStore.appendLog(record);
    });

    socket.on('drone:missed', (payload: { droneId: string; timestamp?: string }) => {
      const drone = droneStore.drones.get(payload.droneId);
      const record: IEngagementRecord = {
        droneId: payload.droneId,
        droneType: drone?.droneType ?? 'Unknown',
        timestamp: payload.timestamp ?? new Date().toISOString(),
        outcome: 'Missed',
        distanceAtEngagement: 0,
      };
      engagementLogStore.appendLog(record);
    });

    socket.on('heartbeat:pong', () => {
      if (watchdogTimeout) {
        clearTimeout(watchdogTimeout);
        watchdogTimeout = null;
      }
      connectionStore.recordHeartbeat();
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
