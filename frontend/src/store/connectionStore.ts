/**
 * Connection status store. Per Implementation Plan 3.5.
 * simulationRate: droneUpdate events/sec from backend (simulation:rate).
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ConnectionStatus } from '@td3/shared-types';

interface ConnectionState {
  status: ConnectionStatus;
  lastHeartbeat: number | null;
  /** droneUpdate events/sec from backend (simulation:rate) */
  simulationRate: number;
  setStatus: (status: ConnectionStatus) => void;
  recordHeartbeat: () => void;
  setSimulationRate: (rate: number) => void;
}

export const useConnectionStore = create<ConnectionState>()(
  devtools(
    (set) => ({
      status: 'Offline',
      lastHeartbeat: null,
      simulationRate: 0,

      setStatus: (status) => set({ status }),

      recordHeartbeat: () =>
        set({ lastHeartbeat: Date.now(), status: 'Connected' }),

      setSimulationRate: (rate) => set({ simulationRate: rate }),
    }),
    { name: 'Connection Store' }
  )
);
