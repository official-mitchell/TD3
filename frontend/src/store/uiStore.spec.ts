/**
 * UI store tests. Per Implementation Plan Presentation 1.4.
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { useUIStore } from './uiStore';
import { useTargetStore } from './targetStore';

const STORAGE_KEY = 'td3-ui-mode';

describe('uiStore', () => {
  beforeAll(() => {
    if (typeof localStorage === 'undefined') {
      const storage: Record<string, string> = {};
      vi.stubGlobal('localStorage', {
        getItem: (k: string) => storage[k] ?? null,
        setItem: (k: string, v: string) => {
          storage[k] = v;
        },
        removeItem: (k: string) => {
          delete storage[k];
        },
        clear: () => {
          Object.keys(storage).forEach((k) => delete storage[k]);
        },
        get length() {
          return Object.keys(storage).length;
        },
        key: () => null,
      });
    }
  });

  beforeEach(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* localStorage not available */
    }
    useTargetStore.setState({ selectedDroneId: null });
    useUIStore.setState({
      activeMode: 'operator',
      preSystemsState: null,
      highlightTargetId: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1.4.1: setMode("systems-view") with mapViewport populates preSystemsState', () => {
    useTargetStore.setState({ selectedDroneId: 'DRONE-001' });
    const mapViewport = { mapCenter: [25.9, 51.5] as [number, number], zoom: 14 };

    useUIStore.getState().setMode('systems-view', mapViewport);

    const state = useUIStore.getState();
    expect(state.activeMode).toBe('systems-view');
    expect(state.preSystemsState).toEqual({
      selectedDroneId: 'DRONE-001',
      mapCenter: [25.9, 51.5],
      zoom: 14,
    });
  });

  it('1.4.2: setMode("operator") after "systems-view" preserves preSystemsState', () => {
    useTargetStore.setState({ selectedDroneId: 'DRONE-002' });
    const mapViewport = { mapCenter: [25.8, 51.4] as [number, number], zoom: 12 };
    useUIStore.getState().setMode('systems-view', mapViewport);
    const preState = useUIStore.getState().preSystemsState;

    useUIStore.getState().setMode('operator');

    expect(useUIStore.getState().activeMode).toBe('operator');
    expect(useUIStore.getState().preSystemsState).toEqual(preState);
  });

  it('1.4.3: triggerHighlight sets highlightTargetId and clears after 3 seconds', async () => {
    vi.useFakeTimers();

    useUIStore.getState().triggerHighlight('fire-button');
    expect(useUIStore.getState().highlightTargetId).toBe('fire-button');

    vi.advanceTimersByTime(3000);

    expect(useUIStore.getState().highlightTargetId).toBe(null);
  });

  it('1.4.4: localStorage "systems-view" initializes activeMode on module load', async () => {
    localStorage.setItem(STORAGE_KEY, 'systems-view');
    vi.resetModules();

    const { useUIStore: freshStore } = await import('./uiStore');

    expect(freshStore.getState().activeMode).toBe('systems-view');
  });
});
