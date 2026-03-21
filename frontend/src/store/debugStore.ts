/**
 * Debug store for presentation layer. Per Implementation Plan Presentation 2.1–2.3.
 * eventLog, eventRates, socket meta, heartbeat/latency, pendingFire, lastOutcome.
 * Rolling 10s event rate window; recordEvent severity: alert (hit/destroyed), warn (missed/reconnect), info (rest).
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { DebugLogEntry, DebugSeverity, EventRateMap } from '@td3/shared-types';

const MAX_LOG_ENTRIES = 50;
const RATE_WINDOW_MS = 10_000;
const PAYLOAD_TRUNCATE = 120;
const PRUNE_INTERVAL_MS = 10_000;

const ALERT_EVENTS = new Set(['drone:hit', 'drone:destroyed']);
const WARN_EVENTS = new Set(['drone:missed', 'reconnect_attempt']);

const eventTimestamps: Record<string, number[]> = {};

function getSeverity(event: string): DebugSeverity {
  if (ALERT_EVENTS.has(event)) return 'alert';
  if (WARN_EVENTS.has(event)) return 'warn';
  return 'info';
}

function truncatePayload(payload: object): string {
  const s = JSON.stringify(payload);
  return s.length > PAYLOAD_TRUNCATE ? s.slice(0, PAYLOAD_TRUNCATE) + '…' : s;
}

interface DebugState {
  eventLog: DebugLogEntry[];
  eventRates: EventRateMap;
  socketId: string | null;
  reconnectAttempts: number;
  lastHeartbeatAt: string | null;
  latencyMs: number | null;
  pendingFire: boolean;
  lastFireAt: string | null;
  lastOutcome: 'Hit' | 'Missed' | null;
  recordEvent: (event: string, payload: object) => void;
  clearLog: () => void;
  setSocketMeta: (id: string, attempts: number) => void;
  recordHeartbeat: (latencyMs: number) => void;
  setPendingFire: (pending: boolean) => void;
  setLastOutcome: (outcome: 'Hit' | 'Missed') => void;
}

export const useDebugStore = create<DebugState>()(
  devtools(
    (set, get) => {
      setInterval(() => {
        const now = Date.now();
        const cutoff = now - RATE_WINDOW_MS;
        const updates: EventRateMap = {};
        for (const key of Object.keys(eventTimestamps)) {
          eventTimestamps[key] = eventTimestamps[key].filter((t) => t > cutoff);
          updates[key] = eventTimestamps[key].length;
        }
        set((state) => ({ eventRates: { ...state.eventRates, ...updates } }));
      }, PRUNE_INTERVAL_MS);

      return {
        eventLog: [],
        eventRates: {},
        socketId: null,
        reconnectAttempts: 0,
        lastHeartbeatAt: null,
        latencyMs: null,
        pendingFire: false,
        lastFireAt: null,
        lastOutcome: null,

        recordEvent: (event, payload) => {
          const now = Date.now();
          if (!eventTimestamps[event]) eventTimestamps[event] = [];
          eventTimestamps[event].push(now);
          eventTimestamps[event] = eventTimestamps[event].filter((t) => t > now - RATE_WINDOW_MS);

          const entry: DebugLogEntry = {
            id: `evt-${now}-${Math.random().toString(36).slice(2, 9)}`,
            timestamp: new Date().toISOString(),
            event,
            payload: truncatePayload(payload),
            severity: getSeverity(event),
          };

          set((state) => ({
            eventRates: { ...state.eventRates, [event]: eventTimestamps[event].length },
            eventLog: [entry, ...state.eventLog].slice(0, MAX_LOG_ENTRIES),
          }));
        },

        clearLog: () => set({ eventLog: [] }),

        setSocketMeta: (id, attempts) =>
          set({ socketId: id, reconnectAttempts: attempts }),

        recordHeartbeat: (latencyMs) =>
          set({
            lastHeartbeatAt: new Date().toISOString(),
            latencyMs,
          }),

        setPendingFire: (pending) => set({ pendingFire: pending }),

        setLastOutcome: (outcome) =>
          set({
            lastOutcome: outcome,
            lastFireAt: new Date().toISOString(),
          }),
      };
    },
    { name: 'Debug Store' }
  )
);
