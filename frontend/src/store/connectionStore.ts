/**
 * Connection status store. Per Implementation Plan 3.5.
 * simulationRate: droneUpdate events/sec from backend (simulation:rate).
 * Per Implementation Plan Presentation 0.2.7–0.2.11: reconnectAttempts, latencyMs, incrementReconnect,
 * recordLatency, recordHeartbeat resets reconnectAttempts.
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ConnectionStatus } from '@td3/shared-types';

interface ConnectionState {
  status: ConnectionStatus;
  lastHeartbeat: number | null;
  /** droneUpdate events/sec from backend (simulation:rate) */
  simulationRate: number;
  reconnectAttempts: number;
  latencyMs: number | null;
  setStatus: (status: ConnectionStatus) => void;
  recordHeartbeat: () => void;
  setSimulationRate: (rate: number) => void;
  incrementReconnect: () => void;
  recordLatency: (ms: number) => void;
}

export const useConnectionStore = create<ConnectionState>()(
  devtools(
    (set) => ({
      status: 'Offline',
      lastHeartbeat: null,
      simulationRate: 0,
      reconnectAttempts: 0,
      latencyMs: null,

      setStatus: (status) => set({ status }),

      recordHeartbeat: () =>
        set({ lastHeartbeat: Date.now(), status: 'Connected', reconnectAttempts: 0 }),

      setSimulationRate: (rate) => set({ simulationRate: rate }),

      incrementReconnect: () =>
        set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 })),

      recordLatency: (ms) => set({ latencyMs: ms }),
    }),
    { name: 'Connection Store' }
  )
);
