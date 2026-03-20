/**
 * XM914E1 minigun real-life specs. Per Implementation Plan Frontend Fix 705.
 * PLATFORM_CONSTANTS.UPDATE_INTERVAL: 16ms for 60fps simulation tick rate.
 */
export const MINIGUN_STATS = {
  RATE_OF_FIRE_SHOTS_PER_MIN: 200,
  MUZZLE_VELOCITY_M_S: 805,
  EFFECTIVE_RANGE_M: 300,
  MAX_RANGE_M: 4000,
} as const;

/** 360° turret rotation. Slower for smoother feel; range cone swivels in sync. */
export const TURRET_SWIVEL_MS_PER_360 = 12000;

export const PLATFORM_CONSTANTS = {
  EFFECTIVE_RANGE: 2000, // meters
  MAX_ENGAGEMENT_ALTITUDE_M: 500, // meters — altitude above this blocks engagement
  UPDATE_INTERVAL: 16, // ms — 60 fps simulation tick rate
  ROTATION_DURATION: 1000, // ms
  /** Ras Laffan Industrial City, Qatar */
  DEFAULT_POSITION: {
    lat: 25.905310475056915,
    lng: 51.543824178558054,
    altitude: 0,
  },
} as const;

export const SOCKET_CONFIG = {
  URL: 'http://localhost:3333',
  RECONNECT_DELAY: 1000,
  MAX_RECONNECT_ATTEMPTS: 5,
} as const;

export const API_ENDPOINTS = {
  PLATFORM_STATUS: '/api/platform/test',
  DRONE_HIT: (id: string) => `/api/drones/${id}/hit`,
  DRONE_STATUS: '/api/drones/status',
} as const;

export const UI_CONSTANTS = {
  THREAT_COLORS: [
    '#28a745', // Low
    '#ffc107', // Medium-Low
    '#fd7e14', // Medium
    '#dc3545', // Medium-High
    '#721c24', // High
  ],
  STATUS_COLORS: {
    IDLE: '#28a745',
    TARGETING: '#ffc107',
    FIRING: '#dc3545',
  },
} as const;
