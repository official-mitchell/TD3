/**
 * TD3 Shared Types Library
 * Canonical type definitions for frontend and backend. All types defined once here.
 * Import via @td3/shared-types. Per Implementation Plan Step 1 / Section 0.1.
 * Per Implementation Plan Presentation 0.1: UIMode, SelectionMode, SystemsOverlay, DebugSeverity,
 * DebugLogEntry, EventRateMap, SystemNodeId, CrossLinkTargetId.
 */

// --- Core type unions ---
export type DroneType = 'Quadcopter' | 'FixedWing' | 'VTOL' | 'Unknown';
export type DroneStatus =
  | 'Detected'
  | 'Identified'
  | 'Confirmed'
  | 'Engagement Ready'
  | 'Hit'
  | 'Destroyed';
export type ConnectionStatus = 'Connected' | 'Degraded' | 'Offline';
export type EngagementOutcome = 'Hit' | 'Missed' | 'Destroyed' | null;

// --- Position and entity interfaces ---
export interface IPosition {
  lat: number;
  lng: number;
  altitude: number;
}

export interface IDrone {
  droneId: string;
  droneType: DroneType;
  status: DroneStatus;
  position: IPosition;
  speed: number;
  heading: number;
  threatLevel: number;
  lastUpdated: string;
  /** Hit points (1–10). Drone destroyed when HP reaches 0. */
  hitPoints?: number;
}

export interface IWeaponPlatform {
  position: { lat: number; lng: number };
  heading: number;
  isActive: boolean;
  ammoCount: number;
  killCount: number;
}

export interface ITelemetryLog {
  timestamp: string;
  droneId: string;
  position: IPosition;
  status: DroneStatus;
  engagementOutcome: EngagementOutcome;
}

export interface IEngagementRecord {
  droneId: string;
  droneType: DroneType;
  timestamp: string;
  outcome: 'Hit' | 'Missed' | 'Destroyed';
  distanceAtEngagement: number;
  /** Remaining HP after this hit (hits only) */
  hitPointsRemaining?: number;
}

// --- Socket.IO payload interfaces ---
export interface DroneUpdatePayload extends IDrone {}

export interface DroneStatusPayload {
  droneId: string;
  status: DroneStatus;
}

export interface DroneDestroyedPayload {
  droneId: string;
  /** Position at destruction (for map skull animation when drone not in store) */
  position?: IPosition;
  droneType?: DroneType;
  timestamp?: string;
}

export interface TargetSelectPayload {
  droneId: string;
}

export interface EngagementFirePayload {
  droneId: string;
  timestamp: string;
}

export interface EngagementResultPayload {
  droneId: string;
  outcome: 'Hit' | 'Missed';
  timestamp: string;
}

// --- Presentation layer types (Implementation Plan Presentation 0.1) ---
export type UIMode = 'operator' | 'systems-view' | 'debug';
export type SelectionMode = 'auto' | 'manual';
export type SystemsOverlay = 'normal' | 'degraded';
export type DebugSeverity = 'info' | 'warn' | 'alert';

export interface DebugLogEntry {
  id: string;
  timestamp: string; // ISO 8601
  event: string; // Socket.IO event name
  payload: string; // JSON.stringify of payload, truncated to 120 chars
  severity: DebugSeverity;
}

export type EventRateMap = Record<string, number>; // event name → count in rolling 10s window

export type SystemNodeId =
  | 'telemetry-generator'
  | 'drone-state-machine'
  | 'engagement-engine'
  | 'express-api'
  | 'socketio-gateway'
  | 'normalization-service'
  | 'zustand-store'
  | 'websocket-hook'
  | 'map-ui-panels'
  | 'mongodb-atlas'
  | 'telemetry-log-model'
  | 'engagement-history';

export type CrossLinkTargetId =
  | 'target-panel'
  | 'connection-indicator'
  | 'fire-button'
  | 'drone-icons'
  | 'engagement-log';
