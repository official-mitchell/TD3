import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Platform, Position, KillLogEntry } from '../types';

// Type Definitions
interface PlatformState {
  platform: Platform;
  turretStatus: 'IDLE' | 'TARGETING' | 'FIRING';
  currentTarget: string | null;
  isEngaging: boolean;
  killLog: KillLogEntry[];

  // Actions - functions that modify our state
  actions: {
    updatePlatform: (platform: Platform) => void;
    setTurretStatus: (status: PlatformState['turretStatus']) => void;
    setCurrentTarget: (droneId: string | null) => void;
    setEngaging: (isEngaging: boolean) => void;
    addKill: (kill: KillLogEntry) => void;
    updateHeading: (heading: number) => void;
  };
}

// Default Values
const DEFAULT_POSITION: Position = {
  lat: 37.7749,
  lng: -122.4194,
  altitude: 0,
};

const initialPlatform: Platform = {
  position: DEFAULT_POSITION,
  heading: 0,
  isActive: true,
};

// Create Zustand Store — the store is a function that returns a set of state and actions
export const usePlatformStore = create<PlatformState>()(
  devtools(
    // Enables Redux DevTools integration
    (set) => ({
      // Initial state
      platform: initialPlatform,
      turretStatus: 'IDLE',
      currentTarget: null,
      isEngaging: false,
      killLog: [],

      // Actions that modify state
      actions: {
        // Update the entire platform object
        updatePlatform: (platform) => set({ platform }),

        // Update just the turret status
        setTurretStatus: (status) => set({ turretStatus: status }),

        // Update the current target
        setCurrentTarget: (droneId) => set({ currentTarget: droneId }),

        // Update the engaging status
        setEngaging: (isEngaging) => set({ isEngaging }),

        // Add a kill to the kill log
        addKill: (kill) =>
          set((state) => ({
            killLog: [kill, ...state.killLog],
          })),

        // Update the heading
        updateHeading: (heading) =>
          set((state) => ({
            platform: {
              ...state.platform,
              heading,
            },
          })),
      },
    }),
    { name: 'Platform Store' }
  )
);

// Selector hooks for common state access patterns, convenient ways to access specific parts of state
export const usePlatformPosition = () =>
  usePlatformStore((state) => state.platform.position);

export const useTurretStatus = () =>
  usePlatformStore((state) => state.turretStatus);

export const useKillLog = () => usePlatformStore((state) => state.killLog);

export const usePlatformActions = () =>
  usePlatformStore((state) => state.actions);

// Computed value helpers, derived state based on multiple state values
export const useTurretEngagementStatus = () => {
  const { turretStatus, isEngaging, currentTarget } = usePlatformStore();

  return {
    isReady: turretStatus === 'IDLE' && !isEngaging,
    canFire:
      turretStatus === 'TARGETING' && !isEngaging && currentTarget !== null,
    isFiring: turretStatus === 'FIRING',
    currentTarget,
  };
};

// Middleware for handling async platform updates
export const initializePlatform = async () => {
  const { actions } = usePlatformStore.getState();
  try {
    const response = await fetch('http://localhost:3333/api/platform/test');
    const data = await response.json();
    if (data.platform) {
      actions.updatePlatform(data.platform);
    }
  } catch (error) {
    console.error('Failed to initialize platform:', error);
  }
};
