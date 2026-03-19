/**
 * TD3 Shared Types Library
 * Canonical type definitions for frontend and backend. All types defined once here.
 * Import via @td3/shared-types. Per Implementation Plan Step 1 / Section 0.1.
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
}

// --- Socket.IO payload interfaces ---
export interface DroneUpdatePayload extends IDrone {}

export interface DroneStatusPayload {
  droneId: string;
  status: DroneStatus;
}

export interface DroneDestroyedPayload {
  droneId: string;
  timestamp: string;
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
