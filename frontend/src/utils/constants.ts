export const PLATFORM_CONSTANTS = {
  EFFECTIVE_RANGE: 2000, // meters
  UPDATE_INTERVAL: 2000, // ms
  ROTATION_DURATION: 1000, // ms
  DEFAULT_POSITION: {
    lat: 37.7749,
    lng: -122.4194,
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
