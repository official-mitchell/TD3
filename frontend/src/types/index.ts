export type DroneType = 'Quadcopter' | 'FixedWing' | 'VTOL' | 'Unknown';
export type DroneStatus =
  | 'Detected'
  | 'Identified'
  | 'Confirmed'
  | 'Engagement Ready'
  | 'Hit'
  | 'Destroyed';

export interface Position {
  lat: number;
  lng: number;
  altitude: number;
}

export interface Drone {
  droneId: string;
  droneType: DroneType;
  status: DroneStatus;
  position: Position;
  speed: number;
  heading: number;
  threatLevel: number;
  lastUpdated: Date;
  isEngaged: boolean;
}

export interface Platform {
  position: Position;
  heading: number;
  isActive: boolean;
}

export interface KillLogEntry {
  droneId: string;
  timestamp: Date;
  droneType: DroneType;
  threatLevel: number;
  finalDistance: number;
  finalBearing: number;
  position: Position;
}
