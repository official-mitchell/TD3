/**
 * Tracer rounds store. Holds recent hit/miss entries for TracerOverlay.
 * Populated by: (1) MapFireButton optimistically on fire + burst interval; (2) useSocket on drone:hit and drone:missed.
 * Entries auto-expire after TRACER_FADE_MS (2.5s).
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface TracerEntry {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  outcome: 'Hit' | 'Missed';
  timestamp: number;
}

const TRACER_FADE_MS = 2500;

interface TracerState {
  tracers: TracerEntry[];
  addTracer: (entry: Omit<TracerEntry, 'id' | 'timestamp'>) => void;
  pruneExpired: () => void;
}

export const useTracerStore = create<TracerState>()(
  devtools(
    (set) => ({
      tracers: [],

      addTracer: (entry) =>
        set((state) => ({
          tracers: [
            ...state.tracers,
            {
              ...entry,
              id: `${entry.outcome}-${Date.now()}-${Math.random()}`,
              timestamp: Date.now(),
            },
          ],
        })),

      pruneExpired: () => {
        const now = Date.now();
        set((state) => ({
          tracers: state.tracers.filter((t) => now - t.timestamp < TRACER_FADE_MS),
        }));
      },
    }),
    { name: 'Tracer Store' }
  )
);

/* --- Changelog ---
 * 2025-03-19: Document optimistic tracer population from MapFireButton.
 */
