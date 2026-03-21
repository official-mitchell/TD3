/**
 * Architecture diagram for Systems View. Per Implementation Plan Presentation 7.1–7.6, 10.2.
 * Four zones, node chips, paths, pulse animations. 10.2: degraded overlay — Zone 1→2 3× slower,
 * stationary amber dots at Normalization Service, amber path stroke, node fill.
 */
import React, { useState, useMemo } from 'react';
import { useConnectionStore } from '../../store/connectionStore';
import { useDebugStore } from '../../store/debugStore';
import { useUIStore } from '../../store/uiStore';
import type { SystemNodeId } from '@td3/shared-types';

const VIEWBOX = { w: 960, h: 400 };

const ZONES = [
  { id: 1, label: 'SIMULATION ENGINE', x: 40, width: 180 },
  { id: 2, label: 'BACKEND CORE', x: 280, width: 180 },
  { id: 3, label: 'FRONTEND LAYER', x: 520, width: 180 },
  { id: 4, label: 'PERSISTENCE', x: 760, width: 180 },
] as const;

const NODES: { id: SystemNodeId; zoneId: number; y: number; label: string }[] = [
  { id: 'telemetry-generator', zoneId: 1, y: 100, label: 'Telemetry Generator' },
  { id: 'drone-state-machine', zoneId: 1, y: 180, label: 'Drone State Machine' },
  { id: 'engagement-engine', zoneId: 1, y: 260, label: 'Engagement Engine' },
  { id: 'normalization-service', zoneId: 2, y: 100, label: 'Normalization Service' },
  { id: 'socketio-gateway', zoneId: 2, y: 180, label: 'Socket.IO Gateway' },
  { id: 'express-api', zoneId: 2, y: 260, label: 'Express API' },
  { id: 'websocket-hook', zoneId: 3, y: 100, label: 'WebSocket Hook' },
  { id: 'zustand-store', zoneId: 3, y: 180, label: 'Zustand Store' },
  { id: 'map-ui-panels', zoneId: 3, y: 260, label: 'Map + UI Panels' },
  { id: 'mongodb-atlas', zoneId: 4, y: 100, label: 'MongoDB Atlas' },
  { id: 'telemetry-log-model', zoneId: 4, y: 180, label: 'Telemetry Log Model' },
  { id: 'engagement-history', zoneId: 4, y: 260, label: 'Engagement History' },
];

function getNodePos(id: SystemNodeId): { x: number; y: number } {
  const node = NODES.find((n) => n.id === id);
  if (!node) return { x: 0, y: 0 };
  const zone = ZONES.find((z) => z.id === node.zoneId)!;
  return { x: zone.x + zone.width / 2, y: node.y };
}

const PATHS: { id: string; from: SystemNodeId; to: SystemNodeId; events: string[]; color: string }[] = [
  { id: 'p1', from: 'telemetry-generator', to: 'normalization-service', events: ['drone:update', 'drone:status'], color: '#ffffff' },
  { id: 'p2', from: 'engagement-engine', to: 'socketio-gateway', events: ['drone:hit', 'drone:missed', 'drone:destroyed'], color: '#4CAF50' },
  { id: 'p3', from: 'socketio-gateway', to: 'websocket-hook', events: ['drone:update', 'drone:status', 'drone:hit', 'drone:missed', 'drone:destroyed'], color: '#ffffff' },
  { id: 'p4', from: 'express-api', to: 'map-ui-panels', events: [], color: '#ffffff' },
  { id: 'p5', from: 'websocket-hook', to: 'telemetry-log-model', events: ['drone:hit', 'drone:destroyed'], color: '#4CAF50' },
  { id: 'p6', from: 'normalization-service', to: 'mongodb-atlas', events: ['drone:hit', 'drone:missed'], color: '#FF9800' },
];

function makePathD(from: SystemNodeId, to: SystemNodeId): string {
  const a = getNodePos(from);
  const b = getNodePos(to);
  const midX = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} C ${midX} ${a.y} ${midX} ${b.y} ${b.x} ${b.y}`;
}

const NODE_WIDTH = 120;
const NODE_HEIGHT = 36;

export const ArchitectureDiagram: React.FC = () => {
  const connectionStatus = useConnectionStore((s) => s.status);
  const systemsOverlay = useUIStore((s) => s.systemsOverlay);
  const selectedNodeId = useUIStore((s) => s.selectedNodeId);
  const setSelectedNode = useUIStore((s) => s.setSelectedNode);
  const eventRates = useDebugStore((s) => s.eventRates);

  const [hoveredNode, setHoveredNode] = useState<SystemNodeId | null>(null);
  const isDegraded = connectionStatus !== 'Connected';
  const isOffline = connectionStatus === 'Offline';

  const pathDefs = useMemo(() => PATHS.map((p) => ({ ...p, d: makePathD(p.from, p.to) })), []);

  const getPathRate = (path: (typeof PATHS)[0]): number => {
    if (path.id === 'p5') {
      return eventRates['drone:hit']! + (eventRates['drone:destroyed'] ?? 0);
    }
    if (path.events.length === 0) return 1;
    return path.events.reduce((sum, e) => sum + (eventRates[e] ?? 0), 0);
  };

  const getPulseDuration = (path: (typeof pathDefs)[0], rate: number): number => {
    if (rate <= 0) return 999;
    const base = 10 / Math.max(0.5, rate);
    const isZone1To2 = path.id === 'p1' || path.id === 'p2';
    if (systemsOverlay === 'degraded' && isZone1To2) {
      return base * 3;
    }
    return base;
  };

  const handleNodeClick = (id: SystemNodeId) => {
    setSelectedNode(selectedNodeId === id ? null : id);
  };

  const isZone1To2Path = (pathId: string) => pathId === 'p1' || pathId === 'p2';
  const normServicePos = getNodePos('normalization-service');

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
      className="block"
      data-testid="architecture-diagram"
    >
      <defs>
        {pathDefs.map((p) => (
          <path key={p.id} id={`path-${p.id}`} d={p.d} fill="none" />
        ))}
      </defs>

      {/* 7.2 Zones */}
      {ZONES.map((zone) => (
        <g key={zone.id}>
          <rect
            x={zone.x}
            y={50}
            width={zone.width}
            height={300}
            rx={8}
            fill="rgba(255,255,255,0.03)"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={1}
          />
          <text
            x={zone.x + zone.width / 2}
            y={35}
            textAnchor="middle"
            fill="rgba(255,255,255,0.4)"
            fontSize={10}
            letterSpacing="0.15em"
            style={{ textTransform: 'uppercase' }}
          >
            {zone.label}
          </text>
        </g>
      ))}

      {/* 7.3 Connection paths — 10.2.3: overlay degraded Zone 1→2 amber; connection Offline amber dashed (independent) */}
      {pathDefs.map((p) => {
        const overlayDegradedZone12 = systemsOverlay === 'degraded' && isZone1To2Path(p.id);
        const connectionOffline = isOffline;
        const useAmberStroke = overlayDegradedZone12 || connectionOffline;
        return (
          <path
            key={p.id}
            d={p.d}
            fill="none"
            stroke={useAmberStroke ? '#FF9800' : 'rgba(255,255,255,0.15)'}
            strokeWidth={1.5}
            strokeDasharray={connectionOffline ? '6 4' : undefined}
            opacity={connectionOffline ? 0.6 : 1}
          />
        );
      })}

      {/* 10.2.1: Stationary amber dots at Normalization Service when overlay degraded */}
      {systemsOverlay === 'degraded' &&
        [0, 1, 2, 3].map((i) => (
          <circle
            key={`stack-dot-${i}`}
            cx={normServicePos.x + (i - 1.5) * 8}
            cy={normServicePos.y}
            r={4}
            fill="#FF9800"
            opacity={0.8}
          />
        ))}

      {/* 7.4 Pulse animations */}
      {!isOffline &&
        pathDefs.map((p) => {
          const rate = getPathRate(p);
          const dur = getPulseDuration(p, rate);
          if (rate <= 0 && p.id !== 'p4') return null;
          const effectiveDur = p.id === 'p4' ? 3 : dur;
          return (
            <circle key={`pulse-${p.id}`} r={5} fill={p.color}>
              <animateMotion
                dur={`${effectiveDur}s`}
                repeatCount="indefinite"
                path={p.d}
              />
            </circle>
          );
        })}

      {/* 7.2.4 Node chips */}
      {NODES.map((node) => {
        const zone = ZONES.find((z) => z.id === node.zoneId)!;
        const x = zone.x + zone.width / 2 - NODE_WIDTH / 2;
        const y = node.y - NODE_HEIGHT / 2;
        const isSelected = selectedNodeId === node.id;
        const isHovered = hoveredNode === node.id;
        const isNormalizationService = node.id === 'normalization-service';
        const degradedFill = systemsOverlay === 'degraded' && isNormalizationService ? 'rgba(255,167,38,0.15)' : undefined;
        const degradedStroke = systemsOverlay === 'degraded' && isNormalizationService ? '#FF9800' : undefined;

        return (
          <g
            key={node.id}
            onClick={() => handleNodeClick(node.id)}
            onMouseEnter={() => setHoveredNode(node.id)}
            onMouseLeave={() => setHoveredNode(null)}
            style={{ cursor: 'pointer' }}
            data-testid={`node-${node.id}`}
          >
            <rect
              x={x}
              y={y}
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
              rx={6}
              fill={isSelected ? 'rgba(255,167,38,0.1)' : degradedFill ?? 'rgba(255,255,255,0.07)'}
              stroke={isSelected ? '#FFA726' : degradedStroke ?? (isHovered ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)')}
              strokeWidth={1.5}
            />
            <text
              x={zone.x + zone.width / 2}
              y={node.y + 5}
              textAnchor="middle"
              fill="rgba(255,255,255,0.9)"
              fontSize={10}
            >
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
