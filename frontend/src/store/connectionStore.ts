/**
 * Connection status store. Per Implementation Plan 3.5.
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ConnectionStatus } from '@td3/shared-types';

interface ConnectionState {
  status: ConnectionStatus;
  lastHeartbeat: number | null;
  setStatus: (status: ConnectionStatus) => void;
  recordHeartbeat: () => void;
}

export const useConnectionStore = create<ConnectionState>()(
  devtools(
    (set) => ({
      status: 'Offline',
      lastHeartbeat: null,

      setStatus: (status) => set({ status }),

      recordHeartbeat: () =>
        set({ lastHeartbeat: Date.now(), status: 'Connected' }),
    }),
    { name: 'Connection Store' }
  )
);
