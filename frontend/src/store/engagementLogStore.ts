/**
 * Engagement log store. Per Implementation Plan 3.6.
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { IEngagementRecord } from '@td3/shared-types';

const MAX_LOG_ENTRIES = 200;

interface EngagementLogState {
  log: IEngagementRecord[];
  appendLog: (record: IEngagementRecord) => void;
  clearLog: () => void;
}

export const useEngagementLogStore = create<EngagementLogState>()(
  devtools(
    (set) => ({
      log: [],

      appendLog: (record) =>
        set((state) => ({
          log: [record, ...state.log].slice(0, MAX_LOG_ENTRIES),
        })),

      clearLog: () => set({ log: [] }),
    }),
    { name: 'Engagement Log Store' }
  )
);
