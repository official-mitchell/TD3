/**
 * WebSocket hook — Socket.IO connection, event routing to stores, heartbeat lifecycle.
 * Per Implementation Plan 4.2, 4.3. Step 14 saveTelemetry stubbed until offline storage exists.
 */
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDroneStore } from '../store/droneStore';
import { usePlatformStore } from '../store/platformStore';
import { useConnectionStore } from '../store/connectionStore';
import { useEngagementLogStore } from '../store/engagementLogStore';
import type { IDrone, IWeaponPlatform, IEngagementRecord } from '@td3/shared-types';

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
      droneStore.removeDrone(payload.droneId);
    });

    socket.on('drone:hit', (payload: { droneId: string; timestamp?: string }) => {
      const drone = droneStore.drones.get(payload.droneId);
      const record: IEngagementRecord = {
        droneId: payload.droneId,
        droneType: drone?.droneType ?? 'Unknown',
        timestamp: payload.timestamp ?? new Date().toISOString(),
        outcome: 'Hit',
        distanceAtEngagement: 0,
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
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return socketRef;
};
