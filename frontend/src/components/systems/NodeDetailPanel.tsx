/**
 * Node detail panel for Systems View. Per Implementation Plan Presentation 8.1–8.2.
 * Fixed 340px, slides in/out with transform when selectedNodeId set. WHAT IT DOES, DATA IN/DATA OUT, FAILURE MODE.
 * Content for all 12 nodes. VIEW IN OPERATOR MODE link (Step 9 cross-link) for 5 nodes with cross-links.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import type { SystemNodeId } from '@td3/shared-types';

interface NodeContent {
  whatItDoes: string;
  dataIn: string;
  dataOut: string;
  failureMode: string;
}

const NODE_CONTENT: Record<SystemNodeId, NodeContent> = {
  'telemetry-generator': {
    whatItDoes:
      'Continuously generates position, heading, speed, and threat level updates for every active drone. It is the origin of all live data in the system.',
    dataIn: 'Internal simulation clock tick',
    dataOut: 'Updated drone object → Drone State Machine',
    failureMode:
      'If the generator emits faster than the frontend can process, updates queue up in the WebSocket buffer. The frontend will eventually catch up, but telemetry age will spike during the backlog.',
  },
  'drone-state-machine': {
    whatItDoes:
      'Owns the drone lifecycle. Decides when a drone advances from Detected to Identified to Confirmed to Engagement Ready based on distance to the platform.',
    dataIn: 'Updated drone position + distance to platform',
    dataOut: 'Status transition events → Socket.IO Gateway',
    failureMode:
      'If a status event arrives at the frontend out of order — for example, a Destroyed event arriving before a Hit event — the frontend guards against this by checking current stored status before applying the update.',
  },
  'engagement-engine': {
    whatItDoes:
      'Calculates the probability of a hit when the operator fires, then resolves the outcome as a hit or miss. Probability degrades with range and target speed.',
    dataIn: 'engagement:fire event with droneId',
    dataOut: 'drone:hit or drone:missed event → all clients; write to persistence',
    failureMode:
      'If the target drone moves out of Engagement Ready status between the operator pressing FIRE and the server receiving the event, the server rejects the engagement silently. The operator sees no result event — PENDING FIRE in the debug panel will stay YES until timeout.',
  },
  'express-api': {
    whatItDoes:
      'Serves the REST endpoints for initial data load and engagement history. Used on page load and when viewing the history route.',
    dataIn: 'HTTP GET requests',
    dataOut: 'JSON drone list, platform status, engagement history records',
    failureMode:
      'If MongoDB is unreachable, the API returns a 500 with a structured error body. The frontend shows last-known state from Zustand rather than crashing.',
  },
  'socketio-gateway': {
    whatItDoes:
      'The real-time event bus. All live drone updates, status changes, and engagement results travel through this single connection between server and client.',
    dataIn: 'Telemetry updates from simulation; engagement events from client',
    dataOut: 'All Socket.IO events to connected clients',
    failureMode:
      'On disconnect, the client begins exponential backoff reconnection — wait 1s, 2s, 4s, up to 30s maximum. The reconnect attempt count is visible in the debug panel. On reconnect, the event stream resumes without a full page reload.',
  },
  'normalization-service': {
    whatItDoes:
      'Ensures that every outgoing drone update has a consistent shape — same fields, same types, a fresh lastUpdated timestamp — before it reaches the client.',
    dataIn: 'Raw simulation output',
    dataOut: 'Normalized IDrone object',
    failureMode:
      'If updates arrive faster than normalization can process (burst scenario), they queue up here. The visual representation is pulses bunching at this node. The frontend does not crash — it simply processes the queue in order when capacity catches up.',
  },
  'zustand-store': {
    whatItDoes:
      'The single source of truth for all frontend state. Drone positions, platform status, selected target, connection health, and engagement log all live here. React components subscribe to the specific slices they need.',
    dataIn: 'Normalized events from WebSocket hook',
    dataOut: 'Reactive state slices to subscribed components',
    failureMode:
      'If a drone:destroyed event is missed (e.g. during a disconnect), a destroyed drone stays in the map indefinitely. The stale target count in the status bar surfaces this. On reconnect, the next telemetry cycle will either update the entry or a manual refresh will clear it.',
  },
  'websocket-hook': {
    whatItDoes:
      'The bridge between the Socket.IO client and the Zustand store. Registers all event handlers, dispatches store updates, manages the heartbeat ping, and tracks reconnection state.',
    dataIn: 'Socket.IO events from the server',
    dataOut: 'Store update calls; heartbeat pong timing',
    failureMode:
      'On reconnect, the hook re-registers all event handlers automatically. However, any selection state that existed before the disconnect is preserved in Zustand — the operator does not lose their target lock during a reconnect cycle.',
  },
  'map-ui-panels': {
    whatItDoes:
      'The operator-facing surface. Renders live drone positions on the map, telemetry gauges, the target list, FIRE controls, and the engagement log. All data flows in from Zustand — nothing is fetched directly by UI components.',
    dataIn: 'Zustand store subscriptions',
    dataOut: 'User interaction events (target select, fire emit)',
    failureMode:
      'Each major UI zone (map, target panel, bottom bar) is wrapped in an error boundary. If a D3 rendering error or a Leaflet exception occurs, only that zone shows an error fallback — the rest of the interface remains operational.',
  },
  'mongodb-atlas': {
    whatItDoes:
      'Stores every engagement outcome permanently. Hit, miss, and destroyed records with drone ID, timestamp, position, and distance are written here after each engagement resolution.',
    dataIn: 'TelemetryLog write calls from the backend after engagement resolution',
    dataOut: 'Engagement history records via REST API',
    failureMode:
      'If the write fails (connection timeout, Atlas unavailable), the engagement still resolves correctly for the operator — the live event flow is not blocked by the database write. The failure is logged server-side. The engagement history view may be incomplete if writes fail.',
  },
  'telemetry-log-model': {
    whatItDoes:
      'The Mongoose schema that defines the shape of every record written to MongoDB — drone ID, position, status at time of engagement, outcome, and timestamp.',
    dataIn: 'Engagement resolution data from backend',
    dataOut: 'Persisted documents in Atlas',
    failureMode:
      'If the schema validation fails (e.g. a missing required field), Mongoose throws before the write, and the error is caught and logged. No partial records are written.',
  },
  'engagement-history': {
    whatItDoes:
      'The historical record of all engagements, readable via the REST API and displayed in the /history route. Each record answers: which drone, when, what outcome, at what distance.',
    dataIn: 'GET /api/drones/:droneId/history HTTP request',
    dataOut: 'Array of ITelemetryLog records, last 50 per drone, sorted newest first',
    failureMode:
      'If the query returns no results (no engagements yet), the history view renders an empty state. The API always returns 200 with an empty array rather than 404.',
  },
};

const CROSS_LINK_NODES: Partial<Record<SystemNodeId, import('@td3/shared-types').CrossLinkTargetId>> = {
  'zustand-store': 'target-panel',
  'socketio-gateway': 'connection-indicator',
  'engagement-engine': 'fire-button',
  'telemetry-generator': 'drone-icons',
  'mongodb-atlas': 'engagement-log',
};

const SLIDE_DURATION_MS = 300;

export const NodeDetailPanel: React.FC = () => {
  const selectedNodeId = useUIStore((s) => s.selectedNodeId);
  const setMode = useUIStore((s) => s.setMode);
  const triggerHighlight = useUIStore((s) => s.triggerHighlight);

  const [displayedNodeId, setDisplayedNodeId] = useState<SystemNodeId | null>(null);
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selectedNodeId) {
      if (exitTimeoutRef.current) {
        clearTimeout(exitTimeoutRef.current);
        exitTimeoutRef.current = null;
      }
      setDisplayedNodeId(selectedNodeId);
    } else if (displayedNodeId) {
      exitTimeoutRef.current = setTimeout(() => {
        exitTimeoutRef.current = null;
        setDisplayedNodeId(null);
      }, SLIDE_DURATION_MS);
    }
    return () => {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    };
  }, [selectedNodeId, displayedNodeId]);

  if (!displayedNodeId) return null;

  const content = NODE_CONTENT[displayedNodeId];
  const crossLinkTarget = CROSS_LINK_NODES[displayedNodeId];
  const isVisible = !!selectedNodeId;

  const handleViewInOperatorMode = () => {
    setMode('operator');
    if (crossLinkTarget) {
      triggerHighlight(crossLinkTarget);
    }
  };

  return (
    <aside
      className="absolute right-0 top-0 bottom-0 overflow-y-auto transition-transform ease-out"
      style={{
        width: 340,
        transform: isVisible ? 'translateX(0)' : 'translateX(340px)',
        transitionDuration: `${SLIDE_DURATION_MS}ms`,
        background: '#0d1117',
        borderLeft: '1px solid rgba(255,255,255,0.1)',
        padding: 24,
      }}
      data-testid="node-detail-panel"
    >
      <div className="flex flex-col gap-6">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7B9BB5] mb-2">
            WHAT IT DOES
          </h3>
          <p className="text-sm text-[#E8F4FD] leading-relaxed">{content.whatItDoes}</p>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7B9BB5] mb-2">
            DATA IN / DATA OUT
          </h3>
          <div className="text-sm text-[#E8F4FD] space-y-2">
            <p>
              <span className="text-[#7B9BB5]">IN:</span> {content.dataIn}
            </p>
            <p>
              <span className="text-[#7B9BB5]">OUT:</span> {content.dataOut}
            </p>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7B9BB5] mb-2">
            FAILURE MODE
          </h3>
          <p className="text-sm text-[#E8F4FD] leading-relaxed">{content.failureMode}</p>
        </section>

        {crossLinkTarget && (
          <button
            type="button"
            onClick={handleViewInOperatorMode}
            className="mt-auto text-sm text-[#FFA726] hover:text-[#FFB74D] transition-colors"
          >
            VIEW IN OPERATOR MODE →
          </button>
        )}
      </div>
    </aside>
  );
};
