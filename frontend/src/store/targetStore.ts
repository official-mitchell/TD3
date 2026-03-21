/**
 * Target selection store. Per Implementation Plan 3.3.
 * selectedDroneId owned exclusively by user interaction. Never touched by telemetry/WebSocket.
 * Per Implementation Plan Presentation 0.2.3–0.2.6: selectionMode, resetToAuto on engagement resolution.
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { SelectionMode } from '@td3/shared-types';

interface TargetState {
  selectedDroneId: string | null;
  selectionMode: SelectionMode;
  setSelected: (droneId: string | null) => void;
  nextTarget: (sortedIds: string[]) => void;
  prevTarget: (sortedIds: string[]) => void;
  resetToAuto: () => void;
}

export const useTargetStore = create<TargetState>()(
  devtools(
    (set) => ({
      selectedDroneId: null,
      selectionMode: 'auto',

      setSelected: (droneId) => set({ selectedDroneId: droneId }),

      nextTarget: (sortedIds) =>
        set((state) => {
          if (sortedIds.length === 0) return state;
          const idx = state.selectedDroneId
            ? sortedIds.indexOf(state.selectedDroneId)
            : -1;
          const nextIdx = idx < 0 ? 0 : (idx + 1) % sortedIds.length;
          return { selectedDroneId: sortedIds[nextIdx], selectionMode: 'manual' };
        }),

      prevTarget: (sortedIds) =>
        set((state) => {
          if (sortedIds.length === 0) return state;
          const idx = state.selectedDroneId
            ? sortedIds.indexOf(state.selectedDroneId)
            : -1;
          const prevIdx =
            idx <= 0 ? sortedIds.length - 1 : (idx - 1 + sortedIds.length) % sortedIds.length;
          return { selectedDroneId: sortedIds[prevIdx], selectionMode: 'manual' };
        }),

      resetToAuto: () => set({ selectionMode: 'auto' }),
    }),
    { name: 'Target Store' }
  )
);
