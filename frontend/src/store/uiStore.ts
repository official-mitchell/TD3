/**
 * UI preferences store. Marker sizes, sound volume.
 * Persists to localStorage. Defaults: vehicle +30%, drones +15%, sound 60%.
 * showDyingDrones: false = hide skull overlay for destroyed drones (default).
 * Per Implementation Plan Presentation 1.1–1.3: activeMode, debugDrawerOpen, systemsOverlay,
 * selectedNodeId, highlightTargetId, preSystemsState; setMode, setDebugDrawer, setSystemsOverlay,
 * setSelectedNode, triggerHighlight, clearHighlight; td3-ui-mode localStorage persistence.
 */
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import type { UIMode, SystemsOverlay, SystemNodeId, CrossLinkTargetId } from '@td3/shared-types';
import { useTargetStore } from './targetStore';

const VALID_UI_MODES: UIMode[] = ['operator', 'systems-view', 'debug'];

export interface PreSystemsState {
  selectedDroneId: string | null;
  mapCenter: [number, number];
  zoom: number;
}

export interface MapViewportArg {
  mapCenter: [number, number];
  zoom: number;
}

interface UIState {
  weaponSize: number;
  droneSize: number;
  soundVolume: number;
  showDyingDrones: boolean;
  activeMode: UIMode;
  debugDrawerOpen: boolean;
  systemsOverlay: SystemsOverlay;
  selectedNodeId: SystemNodeId | null;
  highlightTargetId: CrossLinkTargetId | null;
  preSystemsState: PreSystemsState | null;
  setWeaponSize: (v: number) => void;
  setDroneSize: (v: number) => void;
  setSoundVolume: (v: number) => void;
  setShowDyingDrones: (v: boolean) => void;
  setMode: (mode: UIMode, mapViewport?: MapViewportArg) => void;
  setDebugDrawer: (open: boolean) => void;
  setSystemsOverlay: (overlay: SystemsOverlay) => void;
  setSelectedNode: (id: SystemNodeId | null) => void;
  triggerHighlight: (targetId: CrossLinkTargetId) => void;
  clearHighlight: () => void;
}

const DEFAULT_WEAPON_SIZE = 1.3;
const DEFAULT_DRONE_SIZE = 1.15;
const DEFAULT_SOUND_VOLUME = 0.6;
const HIGHLIGHT_DURATION_MS = 3000;

let highlightTimeoutId: ReturnType<typeof setTimeout> | null = null;

export const useUIStore = create<UIState>()(
  devtools(
    subscribeWithSelector(
    persist(
      (set, get) => ({
        weaponSize: DEFAULT_WEAPON_SIZE,
        droneSize: DEFAULT_DRONE_SIZE,
        soundVolume: DEFAULT_SOUND_VOLUME,
        showDyingDrones: true,
        activeMode: 'operator',
        debugDrawerOpen: false,
        systemsOverlay: 'normal',
        selectedNodeId: null,
        highlightTargetId: null,
        preSystemsState: null,
        setWeaponSize: (v) => set({ weaponSize: Math.max(0.5, Math.min(2, v)) }),
        setDroneSize: (v) => set({ droneSize: Math.max(0.5, Math.min(2, v)) }),
        setSoundVolume: (v) => set({ soundVolume: Math.max(0, Math.min(1, v)) }),
        setShowDyingDrones: (v) => set({ showDyingDrones: v }),
        setMode: (mode, mapViewport) => {
          if (mode === 'systems-view' && mapViewport) {
            const selectedDroneId = useTargetStore.getState().selectedDroneId;
            set({
              activeMode: mode,
              preSystemsState: {
                selectedDroneId,
                mapCenter: mapViewport.mapCenter,
                zoom: mapViewport.zoom,
              },
            });
          } else {
            set({ activeMode: mode });
          }
        },
        setDebugDrawer: (open) => set({ debugDrawerOpen: open }),
        setSystemsOverlay: (overlay) => set({ systemsOverlay: overlay }),
        setSelectedNode: (id) => set({ selectedNodeId: id }),
        triggerHighlight: (targetId) => {
          if (highlightTimeoutId) {
            clearTimeout(highlightTimeoutId);
            highlightTimeoutId = null;
          }
          set({ highlightTargetId: targetId });
          highlightTimeoutId = setTimeout(() => {
            highlightTimeoutId = null;
            get().clearHighlight();
          }, HIGHLIGHT_DURATION_MS);
        },
        clearHighlight: () => set({ highlightTargetId: null }),
      }),
      {
        name: 'td3-ui-settings',
        partialize: (s) => ({
          weaponSize: s.weaponSize,
          droneSize: s.droneSize,
          soundVolume: s.soundVolume,
          showDyingDrones: s.showDyingDrones,
        }),
      }
    )
    ),
    { name: 'UI Store' }
  )
);

// 1.3.1: Restore activeMode from td3-ui-mode on load
const storedMode = typeof window !== 'undefined' ? localStorage.getItem('td3-ui-mode') : null;
if (storedMode && VALID_UI_MODES.includes(storedMode as UIMode)) {
  useUIStore.getState().setMode(storedMode as UIMode);
}

// 1.3.2: Persist activeMode to td3-ui-mode when it changes
useUIStore.subscribe(
  (state) => state.activeMode,
  (activeMode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('td3-ui-mode', activeMode);
    }
  }
);
